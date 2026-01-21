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

function buildProjectLocal(remote, existing) {
  const base = existing ?? {}
  return {
    ...base,
    ...remote,
    status: remote.status ?? base.status ?? "active"
  }
}

export async function upsertProjectsLocal(projects) {
  for (const project of projects) {
    const existing = await idbGet("projects", project.id)
    const next = buildProjectLocal(project, existing)
    await idbPut("projects", next)
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

export async function deleteLocalChapter(id) {
  if (!id) {
    return
  }
  await idbDel("chapters", id)
}

export async function deleteLocalProject(projectId) {
  if (!projectId) {
    return
  }
  await idbDel("projects", projectId)
}

export async function updateLocalProject(projectId, patch) {
  if (!projectId) {
    return null
  }
  const current = await idbGet("projects", projectId)
  if (!current) {
    return null
  }
  const next = {
    ...current,
    ...patch
  }
  await idbPut("projects", next)
  return next
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

export async function deleteLocalProjectInspiration(projectId) {
  if (!projectId) {
    return
  }
  const items = await idbGetAll("inspiration")
  const targets = items.filter((item) => item.project_id === projectId)
  for (const item of targets) {
    await idbDel("inspiration", item.id)
  }
}

export async function deleteLocalProjectMindmap(projectId) {
  if (!projectId) {
    return
  }
  const nodes = await idbGetAll("mindmap_nodes")
  const edges = await idbGetAll("mindmap_edges")
  const targetNodes = nodes.filter((node) => node.project_id === projectId)
  const targetEdges = edges.filter((edge) => edge.project_id === projectId)
  for (const node of targetNodes) {
    await idbDel("mindmap_nodes", node.id)
  }
  for (const edge of targetEdges) {
    await idbDel("mindmap_edges", edge.id)
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
    storyRole: "",
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

export async function listInspirationItems(projectId) {
  const all = await idbGetAll("inspiration")
  return all
    .filter((item) => item.project_id === projectId)
    .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
}

export async function createInspirationItem(projectId, payload) {
  const now = Date.now()
  const item = {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    project_id: projectId,
    type: payload.type,
    title: payload.title ?? "",
    note: payload.note ?? "",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    url: payload.url ?? "",
    image_data: payload.image_data ?? "",
    linkedChapterId: payload.linkedChapterId ?? "",
    linkedCharacterId: payload.linkedCharacterId ?? "",
    created_at: now,
    updated_at: now
  }
  await idbPut("inspiration", item)
  return item
}

export async function updateInspirationItem(id, patch) {
  const current = await idbGet("inspiration", id)
  if (!current) {
    return null
  }
  const next = {
    ...current,
    ...patch,
    tags: Array.isArray(patch.tags) ? patch.tags : current.tags ?? [],
    updated_at: Date.now()
  }
  await idbPut("inspiration", next)
  return next
}

export async function deleteInspirationItem(id) {
  if (!id) {
    return
  }
  await idbDel("inspiration", id)
}

export async function listMindmap(projectId) {
  const [nodes, edges] = await Promise.all([
    idbGetAll("mindmap_nodes"),
    idbGetAll("mindmap_edges")
  ])
  return {
    nodes: nodes.filter((node) => node.project_id === projectId),
    edges: edges.filter((edge) => edge.project_id === projectId)
  }
}

export async function createMindmapNode(projectId, payload) {
  const now = Date.now()
  const node = {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    project_id: projectId,
    title: payload.title ?? "Nouveau noeud",
    type: payload.type ?? "note",
    summary: payload.summary ?? "",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    x: Number.isFinite(payload.x) ? payload.x : 120,
    y: Number.isFinite(payload.y) ? payload.y : 120,
    linkedChapterId: payload.linkedChapterId ?? "",
    linkedCharacterId: payload.linkedCharacterId ?? "",
    created_at: now,
    updated_at: now
  }
  await idbPut("mindmap_nodes", node)
  return node
}

export async function updateMindmapNode(id, patch) {
  const current = await idbGet("mindmap_nodes", id)
  if (!current) {
    return null
  }
  const next = {
    ...current,
    ...patch,
    tags: Array.isArray(patch.tags) ? patch.tags : current.tags ?? [],
    x: Number.isFinite(patch.x) ? patch.x : current.x ?? 0,
    y: Number.isFinite(patch.y) ? patch.y : current.y ?? 0,
    updated_at: Date.now()
  }
  await idbPut("mindmap_nodes", next)
  return next
}

export async function deleteMindmapNode(id) {
  if (!id) {
    return
  }
  await idbDel("mindmap_nodes", id)
  const edges = await idbGetAll("mindmap_edges")
  const linked = edges.filter((edge) => edge.fromNodeId === id || edge.toNodeId === id)
  for (const edge of linked) {
    await idbDel("mindmap_edges", edge.id)
  }
}

export async function createMindmapEdge(projectId, payload) {
  const now = Date.now()
  const edge = {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    project_id: projectId,
    fromNodeId: payload.fromNodeId,
    toNodeId: payload.toNodeId,
    type: payload.type ?? "link",
    created_at: now,
    updated_at: now
  }
  await idbPut("mindmap_edges", edge)
  return edge
}

export async function listIdeas({ projectId = null } = {}) {
  const all = await idbGetAll("ideas")
  const filtered = projectId
    ? all.filter((idea) => idea.project_id === projectId)
    : all
  return filtered.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
}

export async function createIdea(payload) {
  const now = Date.now()
  const idea = {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    project_id: payload.project_id ?? null,
    content: payload.content ?? "",
    note: payload.note ?? "",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    status: payload.status ?? "raw",
    created_at: now,
    updated_at: now
  }
  await idbPut("ideas", idea)
  return idea
}

export async function updateIdea(id, patch) {
  const current = await idbGet("ideas", id)
  if (!current) {
    return null
  }
  const next = {
    ...current,
    ...patch,
    tags: Array.isArray(patch.tags) ? patch.tags : current.tags ?? [],
    updated_at: Date.now()
  }
  await idbPut("ideas", next)
  return next
}

export async function deleteIdea(id) {
  if (!id) {
    return
  }
  await idbDel("ideas", id)
}

export async function deleteMindmapEdge(id) {
  if (!id) {
    return
  }
  await idbDel("mindmap_edges", id)
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
