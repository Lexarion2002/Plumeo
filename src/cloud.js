import { supabase } from "./supabaseClient.js"
import { getUserId } from "./api.js"
import { idbGetAll, idbPut } from "./idb.js"
import {
  getLastCloudSaveAt,
  setLastCloudSaveAt,
  upsertChaptersLocal,
  upsertProjectsLocal
} from "./localStore.js"

const CLOUD_BUCKET = "Bucketplumeo"
const CLOUD_FILENAME = "latest.json"

function buildCloudPath(userId) {
  return `${userId}/${CLOUD_FILENAME}`
}

export async function saveToCloud() {
  const userResult = await getUserId()
  if (!userResult.ok) {
    return userResult
  }

  try {
    const projects = await idbGetAll("projects")
    const chapters = await idbGetAll("chapters")
    const characters = await idbGetAll("characters")
    const inspiration = await idbGetAll("inspiration")
    const ideas = await idbGetAll("ideas")
    const mindmapNodes = await idbGetAll("mindmap_nodes")
    const mindmapEdges = await idbGetAll("mindmap_edges")
    const writingSessions = await idbGetAll("writing_sessions")
    const payload = {
      schema: 1,
      saved_at: new Date().toISOString(),
      projects,
      chapters,
      characters,
      inspiration,
      ideas,
      mindmapNodes,
      mindmapEdges,
      writingSessions
    }
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
    const path = buildCloudPath(userResult.userId)

    const { error } = await supabase.storage
      .from(CLOUD_BUCKET)
      .upload(path, blob, { upsert: true, contentType: "application/json" })

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true, savedAt: payload.saved_at }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function loadFromCloud({ applyIfNewer = false } = {}) {
  const userResult = await getUserId()
  if (!userResult.ok) {
    return userResult
  }

  try {
    const path = buildCloudPath(userResult.userId)
    const { data, error } = await supabase.storage
      .from(CLOUD_BUCKET)
      .download(path)

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    const text = await data.text()
    const parsed = JSON.parse(text)
    const savedAtRaw = parsed?.saved_at
    const savedAt = savedAtRaw ? Date.parse(savedAtRaw) : null
    const localSavedAt = getLastCloudSaveAt()
    if (
      applyIfNewer &&
      savedAt &&
      Number.isFinite(savedAt) &&
      localSavedAt &&
      Number.isFinite(localSavedAt) &&
      savedAt <= localSavedAt
    ) {
      return { ok: true, savedAt, skipped: true }
    }
    const projects = Array.isArray(parsed?.projects) ? parsed.projects : []
    const chapters = Array.isArray(parsed?.chapters) ? parsed.chapters : []
    const characters = Array.isArray(parsed?.characters) ? parsed.characters : []
    const inspiration = Array.isArray(parsed?.inspiration) ? parsed.inspiration : []
    const ideas = Array.isArray(parsed?.ideas) ? parsed.ideas : []
    const mindmapNodes = Array.isArray(parsed?.mindmapNodes) ? parsed.mindmapNodes : []
    const mindmapEdges = Array.isArray(parsed?.mindmapEdges) ? parsed.mindmapEdges : []
    const writingSessions = Array.isArray(parsed?.writingSessions)
      ? parsed.writingSessions
      : Array.isArray(parsed?.writing_sessions)
        ? parsed.writing_sessions
        : []

    await upsertProjectsLocal(projects)
    await upsertChaptersLocal(chapters, { force: true })
    await Promise.all([
      ...characters.map((item) => idbPut("characters", item)),
      ...inspiration.map((item) => idbPut("inspiration", item)),
      ...ideas.map((item) => idbPut("ideas", item)),
      ...mindmapNodes.map((item) => idbPut("mindmap_nodes", item)),
      ...mindmapEdges.map((item) => idbPut("mindmap_edges", item)),
      ...writingSessions.map((item) => idbPut("writing_sessions", item))
    ])

    if (savedAt && Number.isFinite(savedAt)) {
      setLastCloudSaveAt(savedAt)
    }

    return { ok: true, savedAt }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}
