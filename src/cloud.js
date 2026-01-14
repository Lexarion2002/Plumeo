import { supabase } from "./supabaseClient.js"
import { getUserId } from "./api.js"
import { idbGetAll } from "./idb.js"
import { upsertChaptersLocal, upsertProjectsLocal } from "./localStore.js"

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
    const payload = {
      schema: 1,
      saved_at: new Date().toISOString(),
      projects,
      chapters
    }
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
    const path = buildCloudPath(userResult.userId)

    const { error } = await supabase.storage
      .from(CLOUD_BUCKET)
      .upload(path, blob, { upsert: true, contentType: "application/json" })

    if (error) {
      return { ok: false, errorMessage: error.message }
    }

    return { ok: true }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}

export async function loadFromCloud() {
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
    const projects = Array.isArray(parsed?.projects) ? parsed.projects : []
    const chapters = Array.isArray(parsed?.chapters) ? parsed.chapters : []

    await upsertProjectsLocal(projects)
    await upsertChaptersLocal(chapters)

    return { ok: true }
  } catch (error) {
    return { ok: false, errorMessage: error.message }
  }
}
