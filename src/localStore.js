import { idbDel, idbGet, idbGetAll, idbPut } from "./idb.js"

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

export async function deleteLocalProject(projectId) {
  if (!projectId) {
    return
  }
  await idbDel("projects", projectId)
}

export async function deleteLocalProjectChapters(projectId) {
  if (!projectId) {
    return
  }
  const chapters = await idbGetAll("chapters")
  const targets = chapters.filter((chapter) => chapter.project_id === projectId)
  for (const chapter of targets) {
    await idbDel("chapters", chapter.id)
  }
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


export async function getLocalCharacters(projectId) {
  const all = await idbGetAll("characters")
  return all
    .filter((character) => character.project_id === projectId)
    .sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0))
}

export async function createLocalCharacter(projectId) {
  const now = Date.now()
  const character = {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    project_id: projectId,
    first_name: "",
    last_name: "",
    nickname: "",
    pronouns: "",
    sex: "",
    race: "",
    age: "",
    birth_date: "",
    birth_place: "",
    residence: "",
    occupation: "",
    role_rating: 0,
    avatar_url: "",
    meta: {
      physique: {
        taille: "",
        corpulence: "",
        signes: "",
        style: "",
        image_url: ""
      },
      caractere: {
        traits: "",
        qualites: "",
        defauts: "",
        peurs: ""
      },
      profil: {
        histoire: "",
        objectifs: "",
        relations: ""
      },
      evolution: {
        arc: "",
        changements: "",
        etapes: ""
      },
      inventaire: {
        items: ""
      },
      possession: {
        biens: ""
      },
      autres: {
        notes: ""
      }
    },
    created_at: now,
    updated_at: now
  }

  await idbPut("characters", character)
  return character
}

export async function updateLocalCharacter(id, patch) {
  const current = await idbGet("characters", id)
  if (!current) {
    return null
  }

  const next = {
    ...current,
    ...patch,
    meta: {
      ...(current.meta ?? {}),
      ...(patch.meta ?? {})
    },
    updated_at: Date.now()
  }

  await idbPut("characters", next)
  return next
}

export async function deleteLocalCharacter(id) {
  if (!id) {
    return
  }
  await idbDel("characters", id)
}

const LAST_PROJECT_KEY = "writer:lastProjectId"
const LAST_CHAPTER_KEY = "writer:lastChapterId"
const LAST_CLOUD_SAVE_KEY = "plumeo:lastCloudSaveAt"

export function getLastOpenedProjectId() {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY)
  } catch (error) {
    return null
  }
}

export function setLastOpenedProjectId(projectId) {
  try {
    if (!projectId) {
      localStorage.removeItem(LAST_PROJECT_KEY)
      return
    }
    localStorage.setItem(LAST_PROJECT_KEY, projectId)
  } catch (error) {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

export function getLastOpenedChapterId() {
  try {
    return localStorage.getItem(LAST_CHAPTER_KEY)
  } catch (error) {
    return null
  }
}

export function setLastOpenedChapterId(chapterId) {
  try {
    if (!chapterId) {
      localStorage.removeItem(LAST_CHAPTER_KEY)
      return
    }
    localStorage.setItem(LAST_CHAPTER_KEY, chapterId)
  } catch (error) {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

export function getLastCloudSaveAt() {
  try {
    const raw = localStorage.getItem(LAST_CLOUD_SAVE_KEY)
    if (!raw) {
      return null
    }
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  } catch (error) {
    return null
  }
}

export function setLastCloudSaveAt(timestamp) {
  try {
    if (!timestamp) {
      localStorage.removeItem(LAST_CLOUD_SAVE_KEY)
      return
    }
    localStorage.setItem(LAST_CLOUD_SAVE_KEY, String(timestamp))
  } catch (error) {
    // Ignore storage errors (private mode, quota, etc.)
  }
}
