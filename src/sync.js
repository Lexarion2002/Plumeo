import { idbDel, idbGetAll, idbPut } from "./idb.js"
import { getLocalChapter } from "./localStore.js"
import { fetchChapter, rpcUpdateChapterIfRevision } from "./api.js"

export async function enqueueChapterUpsert(chapterId) {
  const op = {
    opId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "UPSERT_CHAPTER",
    chapterId,
    createdAt: Date.now()
  }

  await idbPut("outbox", op)
  return op
}

export async function syncOnce() {
  if (!navigator.onLine) {
    return []
  }

  const ops = await idbGetAll("outbox")
  const results = []

  for (const op of ops) {
    if (op.type !== "UPSERT_CHAPTER") {
      continue
    }

    const local = await getLocalChapter(op.chapterId)
    if (!local) {
      await idbDel("outbox", op.opId)
      continue
    }

    const rpcResult = await rpcUpdateChapterIfRevision({
      id: local.id,
      title: local.title ?? "",
      content_md: local.content_md ?? "",
      baseRevision: local.remote_revision ?? 0
    })

    if (!rpcResult.ok) {
      console.error("syncOnce rpc error", rpcResult.errorMessage)
      continue
    }

    if (rpcResult.newRevision === -1) {
      const server = await fetchChapter(local.id)
      if (server.ok) {
        const conflictLocal = {
          ...local,
          conflict: true,
          server_copy: server.data,
          dirty: true
        }
        await idbPut("chapters", conflictLocal)
      }

      await idbDel("outbox", op.opId)
      results.push({ chapterId: local.id, status: "conflict" })
      continue
    }

    const updated = {
      ...local,
      remote_revision: rpcResult.newRevision,
      dirty: false,
      conflict: false,
      server_copy: null
    }

    await idbPut("chapters", updated)
    await idbDel("outbox", op.opId)
    results.push({ chapterId: local.id, status: "synced" })
  }

  return results
}

export function startSyncLoop(onResults) {
  const run = async () => {
    try {
      const results = await syncOnce()
      if (onResults) {
        await onResults(results)
      }
    } catch (error) {
      console.error("syncLoop error", error)
    }
  }

  const intervalId = window.setInterval(run, 5000)
  window.addEventListener("online", run)

  return intervalId
}
