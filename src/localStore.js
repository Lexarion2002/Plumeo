import { idbGet, idbGetAll, idbPut } from "./idb.js"

function buildChapterLocal(remote, existing) {
  const base = existing ?? {}
  const remoteRevision =
    remote.revision ?? remote.remote_revision ?? base.remote_revision ?? 0
  const keepLocal = base.dirty === true || base.conflict === true

  const content = keepLocal
    ? base.content_md ?? remote.content_md ?? ""
    : remote.content_md ?? base.content_md ?? ""

  const title = keepLocal
    ? base.title ?? remote.title ?? ""
    : remote.title ?? base.title ?? ""

  return {
    id: remote.id ?? base.id,
    project_id: remote.project_id ?? base.project_id,
    title,
    content_md: content,
    order_index: remote.order_index ?? base.order_index ?? 0,
    remote_revision: keepLocal ? base.remote_revision ?? remoteRevision : remoteRevision,
    dirty: base.dirty ?? false,
    conflict: base.conflict ?? false,
    server_copy: base.server_copy ?? null,
    updated_local_at: base.updated_local_at ?? null,
    last_snapshot_at: base.last_snapshot_at ?? null
  }
}

export async function upsertProjectsLocal(projects) {
  for (const project of projects) {
    await idbPut("projects", project)
  }
}

export async function upsertChaptersLocal(chapters) {
  for (const chapter of chapters) {
    const existing = await idbGet("chapters", chapter.id)
    const next = buildChapterLocal(chapter, existing)
    await idbPut("chapters", next)
  }
}

export async function getLocalProjects() {
  return idbGetAll("projects")
}

export async function getLocalChapters(projectId) {
  const all = await idbGetAll("chapters")
  return all
    .filter((chapter) => chapter.project_id === projectId)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
}

export async function getLocalChapter(id) {
  return idbGet("chapters", id)
}

export async function saveLocalChapterDraft(id, patch) {
  const current = await idbGet("chapters", id)
  const next = {
    ...(current ?? { id }),
    ...patch,
    remote_revision: patch.remote_revision ?? current?.remote_revision ?? 0,
    dirty: true,
    conflict: current?.conflict ?? false,
    server_copy: current?.server_copy ?? null,
    updated_local_at: Date.now(),
    last_snapshot_at: patch.last_snapshot_at ?? current?.last_snapshot_at ?? null
  }

  await idbPut("chapters", next)
  return next
}
