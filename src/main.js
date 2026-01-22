import "../styles/app.css"
import { route } from "./router.js"
import { renderApp, renderHome, renderIdeas, renderLogin, renderProjects } from "./ui.js"
import { signIn, signOut, signUp } from "./auth.js"
import {
  listProjects,
  createProject,
  renameProject,
  deleteProject,
  ensureProjectExists,
  listChapters,
  createChapter,
  updateChapter,
  fetchChapter,
  listVersions,
  createVersion
} from "./api.js"
import {
  getLocalProjects,
  getLocalChapters,
  getLocalChapter,
  deleteLocalProject,
  deleteLocalProjectChapters,
  deleteLocalProjectInspiration,
  deleteLocalChapter,
  saveLocalChapterDraft,
  getLastOpenedProjectId,
  getLastOpenedChapterId,
  setLastOpenedProjectId,
  setLastOpenedChapterId,
  getLastCloudSaveAt,
  setLastCloudSaveAt,
  upsertProjectsLocal,
  upsertChaptersLocal,
  updateLocalProject,
  createLocalChapter,
  getLocalCharacters,
  createLocalCharacter,
  updateLocalCharacter,
  deleteLocalCharacter,
  listInspirationItems,
  createInspirationItem,
  updateInspirationItem,
  deleteInspirationItem,
  listIdeas,
  createIdea,
  updateIdea,
  deleteIdea,
  listMindmap,
  createMindmapNode,
  updateMindmapNode,
  deleteMindmapNode,
  createMindmapEdge,
  deleteMindmapEdge,
  deleteLocalProjectMindmap
} from "./localStore.js"
import { enqueueChapterUpsert, startSyncLoop, syncOnce } from "./sync.js"
import { idbDel, idbGetAll, idbPut } from "./idb.js"
import { mountWritingView, unmountWritingView } from "./writingView.js"
import { loadFromCloud, saveToCloud } from "./cloud.js"

const app = document.querySelector("#app")
const DEBUG_RENAME = import.meta.env.DEV
const DEBUG_CHAPTER = import.meta.env.DEV


const state = {
  projects: [],
  projectsStats: {},
  projectsMenuOpenId: null,
  selectedProjectId: null,
  chapters: [],
  selectedChapterId: null,
  chapterDetail: null,
  versions: [],
  statusText: "",
  homeMessage: "",
  editingProjectId: null,
  lastChapterTitle: null,
  lastCloudSaveAt: null,
  cloudStatus: "",
  cloudBusy: false,
  backupStatus: "",
  homeStats: null,
  editorTab: "session",
  ideas: [],
  ideasQuery: "",
  ideasTagFilter: "",
  ideasStatusFilter: "all",
  ideasSort: "desc",
  ideasFiltersOpen: false,
  ideasProjectId: null,
  ideasNoteExpanded: false,
  selectedIdeaId: null,
  writingNav: "chapter",
  characters: [],
  selectedCharacterId: null,
  characterFilter: "",
  inspirationItems: [],
  inspirationSearch: "",
  inspirationTag: "",
  inspirationModal: {
    open: false,
    step: "type",
    type: null,
    draft: null
  },
  inspirationDetailId: null,
  mindmapNodes: [],
  mindmapEdges: [],
  mindmapSelectedNodeId: null,
  mindmapMode: "select",
  mindmapLinkSourceId: null,
  mindmapSearch: "",
  mindmapCreateType: "note",
  mindmapLinkTypeMenu: null,
  mindmapFlashNodeId: null,
  mindmapView: {
    offsetX: 0,
    offsetY: 0,
    scale: 1
  },
  characterSections: {
    civil: true,
    physique: false,
    caractere: false,
    profil: false,
    storyRole: false,
    evolution: false,
    inventaire: false,
    possession: false,
    autres: false
  },
  accountMenuOpen: false,
  backupMenuOpen: false
}

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000
const CLOUD_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000

let autosaveTimer = null
let cloudAutosaveTimer = null
let syncStarted = false
let currentUserEmail = ""
let cloudBootstrapDone = false
let cloudLoadedFromStorage = false
let dragChapterId = null
let dragOverChapterId = null
const characterSaveTimers = new Map()
const ideaSaveTimers = new Map()
const ideaPendingPatches = new Map()
const projectRenamePending = new Set()
const MINDMAP_NODE_WIDTH = 180
const MINDMAP_NODE_HEIGHT = 64
let mindmapDrag = null
let mindmapPan = null
let mindmapFlashTimer = null

function clearAutosaveTimer() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
    autosaveTimer = null
  }
}

function setCloudAutosaveActive(active) {
  if (cloudAutosaveTimer) {
    clearInterval(cloudAutosaveTimer)
    cloudAutosaveTimer = null
  }

  if (!active) {
    return
  }

  cloudAutosaveTimer = window.setInterval(async () => {
    if (state.cloudBusy || !currentUserEmail) {
      return
    }

    const result = await saveToCloud()
    if (result.ok) {
      const now = Date.now()
      setLastCloudSaveAt(now)
      state.lastCloudSaveAt = now
    } else {
      console.error("cloud autosave error", result.errorMessage)
    }
  }, CLOUD_AUTOSAVE_INTERVAL_MS)
}

async function ensureCloudBootstrap() {
  if (cloudBootstrapDone || !currentUserEmail) {
    return
  }

  cloudBootstrapDone = true
  const hostname = window.location.hostname
  const forceCloudLoad =
    hostname && hostname !== "localhost" && hostname !== "127.0.0.1"
  if (forceCloudLoad) {
    state.cloudStatus = "Chargement cloud..."
  }
  const result = await loadFromCloud({ applyIfNewer: !forceCloudLoad })
  if (!result.ok) {
    state.cloudStatus = `Erreur cloud: ${result.errorMessage}`
    console.error("cloud bootstrap error", result.errorMessage)
    return
  }

  if (!result.skipped) {
    cloudLoadedFromStorage = true
  }

  if (result.savedAt && Number.isFinite(result.savedAt)) {
    state.lastCloudSaveAt = result.savedAt
  }

  if (forceCloudLoad) {
    state.cloudStatus = result.skipped ? "Cloud deja a jour." : "Cloud charge."
  }
}

function setMessage(text) {
  const message = document.querySelector("#message")
  if (message) {
    message.textContent = text
  }
}

function setStatus(text) {
  state.statusText = text
  const status = document.querySelector("#status-text")
  if (status) {
    status.textContent = text
  }
}

function setHomeMessage(text) {
  state.homeMessage = text
  const message = document.querySelector("#home-message")
  if (message) {
    message.textContent = text
  }
}

function renderAppUI() {
  unmountWritingView()
  const allowedWritingNav = new Set(["chapter", "characters", "ideas", "inspiration", "mindmap"])
  if (!allowedWritingNav.has(state.writingNav)) {
    state.writingNav = "chapter"
  }
  if (state.writingNav !== "inspiration") {
    state.inspirationDetailId = null
    state.inspirationModal = {
      open: false,
      step: "type",
      type: null,
      mode: "create",
      draft: null
    }
  }
  if (state.writingNav !== "mindmap") {
    state.mindmapMode = "select"
    state.mindmapLinkSourceId = null
    state.mindmapLinkTypeMenu = null
  }
  if (
    state.writingNav === "characters" &&
    !state.selectedCharacterId &&
    state.characters.length
  ) {
    state.selectedCharacterId = state.characters[0].id
  }
  app.innerHTML = renderApp({
    userEmail: currentUserEmail,
    projects: state.projects,
    selectedProjectId: state.selectedProjectId,
    editingProjectId: state.editingProjectId,
    chapters: state.chapters,
    selectedChapterId: state.selectedChapterId,
    chapterDetail: state.chapterDetail,
    versions: state.versions,
    statusText: state.statusText,
    editorTab: state.editorTab,
    writingNav: state.writingNav,
    characters: state.characters,
    selectedCharacterId: state.selectedCharacterId,
    characterFilter: state.characterFilter,
    inspirationItems: state.inspirationItems,
    inspirationSearch: state.inspirationSearch,
    inspirationTag: state.inspirationTag,
    inspirationModal: state.inspirationModal,
    inspirationDetailId: state.inspirationDetailId,
    ideas: getFilteredIdeas(),
    selectedIdeaId: state.selectedIdeaId,
    ideasQuery: state.ideasQuery,
    ideasTagFilter: state.ideasTagFilter,
    ideasStatusFilter: state.ideasStatusFilter,
    ideasSort: state.ideasSort,
    ideasFiltersOpen: state.ideasFiltersOpen,
    ideasNoteExpanded: state.ideasNoteExpanded,
    mindmapNodes: state.mindmapNodes,
    mindmapEdges: state.mindmapEdges,
    mindmapSelectedNodeId: state.mindmapSelectedNodeId,
    mindmapMode: state.mindmapMode,
    mindmapLinkSourceId: state.mindmapLinkSourceId,
    mindmapSearch: state.mindmapSearch,
    mindmapCreateType: state.mindmapCreateType,
    mindmapLinkTypeMenu: state.mindmapLinkTypeMenu,
    mindmapFlashNodeId: state.mindmapFlashNodeId,
    mindmapView: state.mindmapView,
    characterSections: state.characterSections,
    lastCloudSaveAt: state.lastCloudSaveAt,
    cloudStatus: state.cloudStatus,
    cloudBusy: state.cloudBusy,
    accountMenuOpen: state.accountMenuOpen,
    backupStatus: state.backupStatus,
    backupMenuOpen: state.backupMenuOpen
  })
  renderProjectSelectionState()

  if (state.chapterDetail) {
    mountWritingView({
      content: state.chapterDetail.content_md ?? "",
      onUpdate: handleChapterContentUpdate
    })
  }
}

function renderHomeUI() {
  app.innerHTML = renderHome({
    userEmail: currentUserEmail,
    projects: state.projects,
    lastProjectId: getLastOpenedProjectId(),
    lastChapterTitle: state.lastChapterTitle,
    lastCloudSaveAt: state.lastCloudSaveAt,
    cloudStatus: state.cloudStatus,
    cloudBusy: state.cloudBusy,
    backupStatus: state.backupStatus,
    homeStats: state.homeStats,
    homeMessage: state.homeMessage,
    accountMenuOpen: state.accountMenuOpen,
    backupStatus: state.backupStatus,
    backupMenuOpen: state.backupMenuOpen
  })

}


function renderProjectsUI() {
  app.innerHTML = renderProjects({
    userEmail: currentUserEmail,
    projects: state.projects,
    projectStats: state.projectsStats,
    projectsMenuOpenId: state.projectsMenuOpenId,
    editingProjectId: state.editingProjectId,
    lastProjectId: getLastOpenedProjectId(),
    lastCloudSaveAt: state.lastCloudSaveAt,
    cloudStatus: state.cloudStatus,
    cloudBusy: state.cloudBusy,
    accountMenuOpen: state.accountMenuOpen,
    backupStatus: state.backupStatus,
    backupMenuOpen: state.backupMenuOpen
  })
}

function renderIdeasUI() {
  const ideas = getFilteredIdeas()
  if (state.selectedIdeaId && !ideas.some((idea) => idea.id === state.selectedIdeaId)) {
    state.selectedIdeaId = ideas[0]?.id ?? null
  }
  app.innerHTML = renderIdeas({
    userEmail: currentUserEmail,
    ideas,
    selectedIdeaId: state.selectedIdeaId,
    ideasQuery: state.ideasQuery,
    ideasTagFilter: state.ideasTagFilter,
    ideasStatusFilter: state.ideasStatusFilter,
    ideasSort: state.ideasSort,
    ideasFiltersOpen: state.ideasFiltersOpen,
    ideasNoteExpanded: state.ideasNoteExpanded,
    lastProjectId: getLastOpenedProjectId(),
    lastCloudSaveAt: state.lastCloudSaveAt,
    cloudStatus: state.cloudStatus,
    cloudBusy: state.cloudBusy,
    accountMenuOpen: state.accountMenuOpen,
    backupStatus: state.backupStatus,
    backupMenuOpen: state.backupMenuOpen
  })
}


function renderCurrentUI() {
  if (window.location.hash.startsWith("#/project/") || window.location.hash.startsWith("#/editor")) {
    renderAppUI()
    return
  }
  if (window.location.hash.startsWith("#/home")) {
    renderHomeUI()
    return
  }
  if (window.location.hash.startsWith("#/projects")) {
    renderProjectsUI()
    return
  }
}


function renderProjectSelectionState() {
  const exportButton = document.querySelector("#project-export")
  if (!exportButton) {
    return
  }

  const project = state.projects.find(
    (item) => item.id === state.selectedProjectId
  )
  const hasProject = Boolean(project)

  exportButton.disabled = !hasProject
  exportButton.setAttribute("aria-disabled", hasProject ? "false" : "true")
}

function getCredentials() {
  const email = document.querySelector("#email")
  const password = document.querySelector("#password")
  return {
    email: email ? email.value.trim() : "",
    password: password ? password.value : ""
  }
}

async function loadLocalProjects({ allowFallback = true } = {}) {
  const local = await getLocalProjects()
  state.projects = local

  if (state.projects.length === 0) {
    state.selectedProjectId = null
    return
  }

  const hasSelected = state.projects.some(
    (project) => project.id === state.selectedProjectId
  )

  if (!hasSelected && allowFallback) {
    state.selectedProjectId = state.projects[0].id
  }
}

async function loadProjectsStats() {
  const stats = {}
  for (const project of state.projects) {
    const chapters = await getLocalChapters(project.id)
    let wordCount = 0
    const baseStamp = project.created_at ? new Date(project.created_at).getTime() : null
    let updatedAt = Number.isNaN(baseStamp) ? null : baseStamp
    for (const chapter of chapters) {
      const plain = toPlainText(chapter.content_md ?? "")
      wordCount += countWords(plain)
      const candidate =
        chapter.updated_local_at ??
        chapter.updated_at ??
        chapter.created_at ??
        null
      if (candidate) {
        const candidateStamp = new Date(candidate).getTime()
        if (!Number.isNaN(candidateStamp)) {
          updatedAt = updatedAt ? Math.max(updatedAt, candidateStamp) : candidateStamp
        }
      }
    }
    stats[project.id] = {
      chapterCount: chapters.length,
      wordCount,
      updatedAt
    }
  }
  state.projectsStats = stats
}

async function loadLocalChapters() {
  if (!state.selectedProjectId) {
    state.chapters = []
    state.selectedChapterId = null
    state.chapterDetail = null
    state.versions = []
    return
  }

  const local = await getLocalChapters(state.selectedProjectId)
  state.chapters = local

  if (state.chapters.length === 0) {
    state.selectedChapterId = null
    state.chapterDetail = null
    state.versions = []
    return
  }

  const hasSelected = state.chapters.some(
    (chapter) => chapter.id === state.selectedChapterId
  )

  if (!hasSelected) {
    state.selectedChapterId = state.chapters[0].id
  }
}

async function loadLocalCharacters() {
  if (!state.selectedProjectId) {
    state.characters = []
    state.selectedCharacterId = null
    return
  }

  state.characters = await getLocalCharacters(state.selectedProjectId)
  const hasSelected = state.characters.some(
    (character) => character.id === state.selectedCharacterId
  )

  if (!hasSelected) {
    state.selectedCharacterId = state.characters[0]?.id ?? null
  }
}

async function loadLocalInspiration() {
  if (!state.selectedProjectId) {
    state.inspirationItems = []
    return
  }
  state.inspirationItems = await listInspirationItems(state.selectedProjectId)
}

async function loadLocalMindmap() {
  if (!state.selectedProjectId) {
    state.mindmapNodes = []
    state.mindmapEdges = []
    state.mindmapSelectedNodeId = null
    return
  }
  const result = await listMindmap(state.selectedProjectId)
  state.mindmapNodes = result.nodes
  state.mindmapEdges = result.edges
  const hasSelected = state.mindmapNodes.some(
    (node) => node.id === state.mindmapSelectedNodeId
  )
  if (!hasSelected) {
    state.mindmapSelectedNodeId = null
  }
}

async function loadLocalChapterDetail() {
  if (!state.selectedChapterId) {
    state.chapterDetail = null
    return
  }

  state.chapterDetail = await getLocalChapter(state.selectedChapterId)
}

async function loadVersionsForChapter(chapterId) {
  if (!chapterId) {
    state.versions = []
    return
  }

  const result = await listVersions(chapterId)
  if (!result.ok) {
    state.versions = []
    return
  }

  state.versions = result.data
}

async function pullProjectsFromCloud() {
  const result = await listProjects()
  if (!result.ok) {
    setStatus(`Erreur: ${result.errorMessage}`)
    return
  }

  await upsertProjectsLocal(result.data)
  await loadLocalProjects()
}

async function pullChaptersFromCloud(projectId) {
  const result = await listChapters(projectId)
  if (!result.ok) {
    setStatus(`Erreur: ${result.errorMessage}`)
    return
  }

  await upsertChaptersLocal(result.data)
  await loadLocalChapters()
}

async function loadInboxItems() {
}

async function loadHomeView() {
  state.editingProjectId = null
  state.lastCloudSaveAt = getLastCloudSaveAt()
  await loadLocalProjects()
  await loadInboxItems()
  await computeHomeStats()
  await updateLastChapterTitle()
  renderCurrentUI()

  if (!cloudLoadedFromStorage) {
    await pullProjectsFromCloud()
    await loadLocalProjects()
    await loadInboxItems()
    await computeHomeStats()
    await updateLastChapterTitle()
    renderCurrentUI()
  }
}

async function loadProjectsView() {
  state.lastCloudSaveAt = getLastCloudSaveAt()
  await loadLocalProjects({ allowFallback: false })
  await loadProjectsStats()
  renderCurrentUI()

  if (!cloudLoadedFromStorage) {
    await pullProjectsFromCloud()
    await loadLocalProjects({ allowFallback: false })
    await loadProjectsStats()
    renderCurrentUI()
  }
}

async function loadIdeasView({ projectId = null, render = true } = {}) {
  state.lastCloudSaveAt = getLastCloudSaveAt()
  state.ideasProjectId = projectId
  state.ideas = await listIdeas({ projectId })
  if (state.selectedIdeaId) {
    const exists = state.ideas.some((idea) => idea.id === state.selectedIdeaId)
    if (!exists) {
      state.selectedIdeaId = null
    }
  }
  if (render) {
    renderCurrentUI()
  }
}

function countWords(text) {
  const trimmed = text.trim()
  if (!trimmed) {
    return 0
  }
  const matches = trimmed.match(/\S+/g)
  return matches ? matches.length : 0
}

function toPlainText(value) {
  if (!value) {
    return ""
  }
  if (!/<[a-z][\s\S]*>/i.test(value)) {
    return value
  }
  const container = document.createElement("div")
  container.innerHTML = value
  return container.textContent ?? ""
}

async function computeHomeStats() {
  const chapters = await idbGetAll("chapters")
  const now = Date.now()
  let totalWords = 0
  let earliest = null
  let hasAnyChapter = chapters.length > 0

  for (const chapter of chapters) {
    const plain = toPlainText(chapter.content_md ?? "")
    totalWords += countWords(plain)
    const candidate =
      chapter.created_at ??
      chapter.updated_at ??
      chapter.updated_local_at ??
      null
    if (candidate) {
      const stamp = new Date(candidate).getTime()
      if (!Number.isNaN(stamp)) {
        earliest = earliest === null ? stamp : Math.min(earliest, stamp)
      }
    }
  }

  if (!hasAnyChapter) {
    state.homeStats = {
      totalWords: null,
      wordsPerDay: null,
      pagesTotal: null,
      pagesPerDay: null,
      timeSpent: null,
      timePerDay: null,
      favoriteTime: null
    }
    return
  }

  const days =
    earliest === null ? 1 : Math.max(1, Math.ceil((now - earliest) / 86400000))
  const wordsPerDay = totalWords ? Math.round(totalWords / days) : 0
  const pagesTotal = totalWords ? Math.ceil(totalWords / 250) : 0
  const pagesPerDay = pagesTotal ? pagesTotal / days : 0

  state.homeStats = {
    totalWords,
    wordsPerDay,
    pagesTotal,
    pagesPerDay,
    // TODO: Track writing sessions to compute time spent and favorite time.
    timeSpent: null,
    timePerDay: null,
    favoriteTime: null
  }
}

function getOrderedChapters() {
  const indexed = state.chapters.map((chapter, index) => ({
    chapter,
    index
  }))
  return indexed
    .sort((a, b) => {
      const orderDiff = (a.chapter.order_index ?? 0) - (b.chapter.order_index ?? 0)
      if (orderDiff !== 0) {
        return orderDiff
      }
      return a.index - b.index
    })
    .map((item) => item.chapter)
}

async function persistChapterOrder(orderedChapters) {
  // Use spaced integers (10, 20, 30...) to keep ordering stable and easy to reassign.
  const changes = []
  orderedChapters.forEach((chapter, index) => {
    const nextOrder = (index + 1) * 10
    if ((chapter.order_index ?? 0) !== nextOrder) {
      changes.push({ chapter, order_index: nextOrder })
    }
  })

  if (!changes.length) {
    return
  }

  for (const change of changes) {
    const updated = {
      ...change.chapter,
      order_index: change.order_index
    }
    await idbPut("chapters", updated)
  }

  state.chapters = orderedChapters.map((chapter) => {
    const change = changes.find((item) => item.chapter.id === chapter.id)
    if (!change) {
      return chapter
    }
    return {
      ...chapter,
      order_index: change.order_index
    }
  })

  if (navigator.onLine) {
    await Promise.all(
      changes.map((change) =>
        updateChapter(change.chapter.id, { order_index: change.order_index })
      )
    )
  }
}

async function handleChapterReorder(dragId, targetId) {
  if (!dragId || !targetId || dragId === targetId) {
    return
  }

  const ordered = getOrderedChapters()
  const fromIndex = ordered.findIndex((chapter) => chapter.id === dragId)
  const toIndex = ordered.findIndex((chapter) => chapter.id === targetId)
  if (fromIndex === -1 || toIndex === -1) {
    return
  }

  const next = [...ordered]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)

  await persistChapterOrder(next)
  renderAppUI()
}

async function refreshInbox() {
  await loadInboxItems()
  renderCurrentUI()
}





function getSelectedCharacter() {
  return state.characters.find(
    (character) => character.id === state.selectedCharacterId
  )
}

async function handleCharacterCreate() {
  if (!state.selectedProjectId) {
    setStatus("Cree un projet avant d'ajouter un personnage.")
    return
  }

  const created = await createLocalCharacter(state.selectedProjectId)
  await loadLocalCharacters()
  state.selectedCharacterId = created?.id ?? state.selectedCharacterId
  renderAppUI()
}

async function handleCharacterSelect(id) {
  if (!id || id === state.selectedCharacterId) {
    return
  }
  state.selectedCharacterId = id
  renderAppUI()
}

async function handleCharacterDelete(id) {
  if (!id) {
    return
  }
  const character = state.characters.find((item) => item.id === id)
  const name = character?.first_name || character?.last_name
    ? `${character?.first_name ?? ""} ${character?.last_name ?? ""}`.trim()
    : "ce personnage"
  const confirmed = window.confirm(`Supprimer ${name} ?`)
  if (!confirmed) {
    return
  }
  await deleteLocalCharacter(id)
  await loadLocalCharacters()
  renderAppUI()
}

function handleCharacterFilter(value) {
  state.characterFilter = value
  renderAppUI()
}

function handleCharacterSectionToggle(section) {
  if (!section || !(section in state.characterSections)) {
    return
  }
  state.characterSections = {
    ...state.characterSections,
    [section]: !state.characterSections[section]
  }
  renderAppUI()
}

async function handleCharacterRating(rating) {
  const character = getSelectedCharacter()
  if (!character) {
    return
  }
  const nextRating = Math.max(0, Math.min(5, rating))
  await updateLocalCharacter(character.id, { role_rating: nextRating })
  await loadLocalCharacters()
  renderAppUI()
}

function scheduleCharacterSave(id, patch) {
  const key = id
  if (characterSaveTimers.has(key)) {
    clearTimeout(characterSaveTimers.get(key))
  }
  const timer = window.setTimeout(async () => {
    await updateLocalCharacter(id, patch)
    await loadLocalCharacters()
    renderAppUI()
  }, 400)
  characterSaveTimers.set(key, timer)
}

function handleCharacterFieldUpdate(field, value, metaKey = null) {
  const character = getSelectedCharacter()
  if (!character) {
    return
  }
  const patch = metaKey
    ? { meta: { [metaKey]: { ...(character.meta?.[metaKey] ?? {}), [field]: value } } }
    : { [field]: value }

  scheduleCharacterSave(character.id, patch)
}

function handleCharacterWriteSideBySide() {
  setStatus("Bientot disponible.")
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function parseTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function getFilteredIdeas() {
  let items = [...state.ideas]
  const query = state.ideasQuery.trim()
  if (query) {
    const normalized = normalizeText(query)
    items = items.filter((idea) => {
      const haystack = [
        idea.content,
        idea.note,
        ...(idea.tags ?? [])
      ]
        .filter(Boolean)
        .join(" ")
      return normalizeText(haystack).includes(normalized)
    })
  }

  if (state.ideasTagFilter.trim()) {
    const tagNeedle = normalizeText(state.ideasTagFilter.trim())
    items = items.filter((idea) =>
      (idea.tags ?? []).some((tag) => normalizeText(tag).includes(tagNeedle))
    )
  }

  if (state.ideasStatusFilter !== "all") {
    items = items.filter((idea) => idea.status === state.ideasStatusFilter)
  }

  const direction = state.ideasSort === "asc" ? 1 : -1
  items.sort((a, b) => {
    const aTime = a.created_at ?? 0
    const bTime = b.created_at ?? 0
    return direction * (aTime - bTime)
  })

  return items
}

function queueIdeaPatch(id, patch, delay = 700) {
  if (!id) {
    return
  }
  const existing = ideaPendingPatches.get(id) ?? {}
  ideaPendingPatches.set(id, { ...existing, ...patch })
  if (ideaSaveTimers.has(id)) {
    clearTimeout(ideaSaveTimers.get(id))
  }
  const timer = window.setTimeout(() => {
    flushIdeaPatch(id)
  }, delay)
  ideaSaveTimers.set(id, timer)
}

async function applyIdeaPatch(id, patch, { render = false } = {}) {
  if (!id) {
    return
  }
  const updated = await updateIdea(id, patch)
  if (updated) {
    state.ideas = state.ideas.map((idea) => (idea.id === id ? updated : idea))
  } else {
    state.ideas = await listIdeas({ projectId: state.ideasProjectId })
  }
  if (render) {
    renderCurrentUI()
  }
}

async function flushIdeaPatch(id, { render = false } = {}) {
  const patch = ideaPendingPatches.get(id)
  if (!patch) {
    return
  }
  ideaPendingPatches.delete(id)
  if (ideaSaveTimers.has(id)) {
    clearTimeout(ideaSaveTimers.get(id))
    ideaSaveTimers.delete(id)
  }
  await applyIdeaPatch(id, patch, { render })
}

async function handleIdeasCreateFromInput(content, { select = false } = {}) {
  const trimmed = content.trim()
  if (!trimmed) {
    return
  }
  const created = await createIdea({
    content: trimmed,
    status: "raw",
    tags: [],
    note: "",
    project_id: state.ideasProjectId
  })
  state.ideas = await listIdeas({ projectId: state.ideasProjectId })
  if (select && created?.id) {
    state.selectedIdeaId = created.id
    state.ideasNoteExpanded = false
  }
  renderCurrentUI()
}

async function handleIdeasUpdate(id, patch) {
  let nextPatch = patch
  if (state.ideasProjectId && !Object.prototype.hasOwnProperty.call(patch, "project_id")) {
    const idea = state.ideas.find((item) => item.id === id)
    if (idea && !idea.project_id) {
      nextPatch = { ...patch, project_id: state.ideasProjectId }
    }
  }
  await applyIdeaPatch(id, nextPatch, { render: true })
}

async function handleIdeasDelete(id) {
  if (!id) {
    return
  }
  const confirmed = window.confirm("Supprimer cette idee ?")
  if (!confirmed) {
    return
  }
  await deleteIdea(id)
  state.ideas = await listIdeas({ projectId: state.ideasProjectId })
  if (state.selectedIdeaId === id) {
    state.selectedIdeaId = state.ideas[0]?.id ?? null
    state.ideasNoteExpanded = false
  }
  renderCurrentUI()
}

function openInspirationModal(step = "type", type = null, draft = null, mode = "create") {
  state.inspirationModal = {
    open: true,
    step,
    type,
    mode,
    draft
  }
  renderAppUI()
}

function closeInspirationModal() {
  state.inspirationModal = {
    open: false,
    step: "type",
    type: null,
    mode: "create",
    draft: null
  }
  renderAppUI()
}

function openInspirationDetail(id) {
  state.inspirationDetailId = id
  renderAppUI()
}

function closeInspirationDetail() {
  state.inspirationDetailId = null
  renderAppUI()
}

async function handleInspirationCreate() {
  if (!state.selectedProjectId) {
    setStatus("Cree un projet avant d'ajouter une inspiration.")
    return
  }
  state.inspirationDetailId = null
  openInspirationModal("type", null, { tags: [] }, "create")
}

function handleInspirationChooseType(type) {
  if (!type) {
    return
  }
  const draft = state.inspirationModal?.draft ?? { tags: [] }
  openInspirationModal("form", type, { ...draft, type }, state.inspirationModal?.mode ?? "create")
}

async function handleInspirationSave() {
  const modal = state.inspirationModal
  if (!modal?.open || modal.step !== "form") {
    return
  }

  const type = modal.type
  const title = document.querySelector("#inspiration-title")?.value ?? ""
  const note = document.querySelector("#inspiration-note")?.value ?? ""
  const tagsValue = document.querySelector("#inspiration-tags")?.value ?? ""
  const url = document.querySelector("#inspiration-url")?.value ?? ""
  const linkedChapterId =
    document.querySelector("#inspiration-link-chapter")?.value ?? ""
  const linkedCharacterId =
    document.querySelector("#inspiration-link-character")?.value ?? ""
  const tags = parseTags(tagsValue)
  const imageData = modal.draft?.image_data ?? ""

  if (type === "image" && !imageData) {
    window.alert("Ajoute une image avant d'enregistrer.")
    return
  }
  if ((type === "link" || type === "video") && !url.trim()) {
    window.alert("Ajoute une URL avant d'enregistrer.")
    return
  }

  if (modal.mode === "edit" && modal.draft?.id) {
    await updateInspirationItem(modal.draft.id, {
      title,
      note,
      tags,
      url,
      image_data: imageData,
      linkedChapterId,
      linkedCharacterId
    })
  } else {
    await createInspirationItem(state.selectedProjectId, {
      type,
      title,
      note,
      tags,
      url,
      image_data: imageData,
      linkedChapterId,
      linkedCharacterId
    })
  }

  await loadLocalInspiration()
  closeInspirationModal()
}

function handleInspirationSearch(value) {
  state.inspirationSearch = value
  renderAppUI()
}

function handleInspirationTagFilter(value) {
  state.inspirationTag = value
  renderAppUI()
}

async function handleInspirationDelete(id) {
  const item = state.inspirationItems.find((entry) => entry.id === id)
  if (!item) {
    return
  }
  const label = item.title || item.url || "cet element"
  const confirmed = window.confirm(`Supprimer ${label} ?`)
  if (!confirmed) {
    return
  }
  await deleteInspirationItem(id)
  await loadLocalInspiration()
  state.inspirationDetailId = null
  renderAppUI()
}

function handleInspirationEdit(id) {
  const item = state.inspirationItems.find((entry) => entry.id === id)
  if (!item) {
    return
  }
  state.inspirationDetailId = null
  const draft = {
    ...item,
    tags: item.tags ?? []
  }
  openInspirationModal("form", item.type, draft, "edit")
}

function getMindmapNode(id) {
  return state.mindmapNodes.find((node) => node.id === id)
}

async function handleMindmapCreateNode(position = null) {
  if (!state.selectedProjectId) {
    setStatus("Cree un projet avant d'ajouter une carte mentale.")
    return
  }
  const canvas = document.querySelector(".mindmap-canvas")
  const rect = canvas?.getBoundingClientRect()
  const width = rect?.width ?? 800
  const height = rect?.height ?? 500
  const x =
    position?.x ??
    (width / 2 - state.mindmapView.offsetX) / state.mindmapView.scale -
      MINDMAP_NODE_WIDTH / 2
  const y =
    position?.y ??
    (height / 2 - state.mindmapView.offsetY) / state.mindmapView.scale -
      MINDMAP_NODE_HEIGHT / 2
  const node = await createMindmapNode(state.selectedProjectId, {
    x,
    y,
    type: state.mindmapCreateType
  })
  state.mindmapNodes = [...state.mindmapNodes, node]
  state.mindmapSelectedNodeId = node.id
  renderAppUI()
}

async function handleMindmapDeleteNode(id) {
  if (!id) {
    return
  }
  await deleteMindmapNode(id)
  state.mindmapNodes = state.mindmapNodes.filter((node) => node.id !== id)
  state.mindmapEdges = state.mindmapEdges.filter(
    (edge) => edge.fromNodeId !== id && edge.toNodeId !== id
  )
  if (state.mindmapSelectedNodeId === id) {
    state.mindmapSelectedNodeId = null
  }
  renderAppUI()
}

async function handleMindmapUpdateNode(id, patch) {
  const updated = await updateMindmapNode(id, patch)
  if (!updated) {
    return
  }
  state.mindmapNodes = state.mindmapNodes.map((node) =>
    node.id === id ? updated : node
  )
  renderAppUI()
}

async function handleMindmapCreateEdge(fromId, toId, type = "linked") {
  if (!fromId || !toId || fromId === toId) {
    return
  }
  const edge = await createMindmapEdge(state.selectedProjectId, {
    fromNodeId: fromId,
    toNodeId: toId,
    type
  })
  state.mindmapEdges = [...state.mindmapEdges, edge]
}

function handleMindmapSelectNode(id) {
  state.mindmapSelectedNodeId = id
  renderAppUI()
}

function handleMindmapResetView() {
  state.mindmapView = { offsetX: 0, offsetY: 0, scale: 1 }
  renderAppUI()
}

function panToMindmapNode(node) {
  const canvas = document.querySelector(".mindmap-canvas")
  if (!canvas) {
    return
  }
  const rect = canvas.getBoundingClientRect()
  const scale = state.mindmapView.scale
  const targetX = rect.width / 2 - (node.x + MINDMAP_NODE_WIDTH / 2) * scale
  const targetY = rect.height / 2 - (node.y + MINDMAP_NODE_HEIGHT / 2) * scale
  state.mindmapView = {
    ...state.mindmapView,
    offsetX: targetX,
    offsetY: targetY
  }
}

function flashMindmapNode(id) {
  if (mindmapFlashTimer) {
    clearTimeout(mindmapFlashTimer)
  }
  state.mindmapFlashNodeId = id
  renderAppUI()
  mindmapFlashTimer = window.setTimeout(() => {
    state.mindmapFlashNodeId = null
    renderAppUI()
  }, 600)
}

async function handleMindmapOpenSource(id) {
  const node = getMindmapNode(id)
  if (!node) {
    return
  }
  if (node.linkedChapterId) {
    state.writingNav = "chapter"
    await handleChapterSelect(node.linkedChapterId)
    return
  }
  if (node.linkedCharacterId) {
    state.writingNav = "characters"
    state.selectedCharacterId = node.linkedCharacterId
    renderAppUI()
  }
}

async function handleCloudSave() {
  if (state.cloudBusy) {
    return
  }
  state.cloudBusy = true
  state.cloudStatus = "Sauvegarde..."
  renderCurrentUI()

  const result = await saveToCloud()
  if (result.ok) {
    const now = Date.now()
    setLastCloudSaveAt(now)
    state.lastCloudSaveAt = now
    state.cloudStatus = "Sauvegarde terminee."
  } else {
    state.cloudStatus = `Erreur: ${result.errorMessage}`
  }

  state.cloudBusy = false
  renderCurrentUI()
}

async function handleCloudLoad() {
  if (state.cloudBusy) {
    return
  }
  state.cloudBusy = true
  state.cloudStatus = "Chargement..."
  renderCurrentUI()

  const result = await loadFromCloud()
  if (result.ok) {
    if (!result.skipped) {
      cloudLoadedFromStorage = true
    }
    await loadLocalProjects({ allowFallback: false })
    await computeHomeStats()
    await updateLastChapterTitle()
    state.cloudStatus = "Chargement termine."
  } else {
    state.cloudStatus = `Erreur: ${result.errorMessage}`
  }

  state.cloudBusy = false
  renderCurrentUI()
}

async function handleBackupExport() {
  const projects = await idbGetAll("projects")
  const chapters = await idbGetAll("chapters")
  const outbox = await idbGetAll("outbox")
  const characters = await idbGetAll("characters")
  const inspiration = await idbGetAll("inspiration")
  const ideas = await idbGetAll("ideas")
  const mindmapNodes = await idbGetAll("mindmap_nodes")
  const mindmapEdges = await idbGetAll("mindmap_edges")
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      projects,
      chapters,
      outbox,
      characters,
      inspiration,
      ideas,
      mindmapNodes,
      mindmapEdges
    }
  }

  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `plumeo-backup-${stamp}.json`

  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  state.backupStatus = "Export termine."
  renderCurrentUI()
}

async function clearStore(store, keyField) {
  const items = await idbGetAll(store)
  for (const item of items) {
    if (item && item[keyField] != null) {
      await idbDel(store, item[keyField])
    }
  }
}

async function handleBackupImport(file) {
  if (!file) {
    return
  }

  let parsed
  try {
    const text = await file.text()
    parsed = JSON.parse(text)
  } catch (error) {
    state.backupStatus = "Import echoue."
    renderCurrentUI()
    return
  }

  if (!parsed || parsed.version !== 1 || !parsed.data) {
    state.backupStatus = "Import refuse (format)."
    renderCurrentUI()
    return
  }

  const data = parsed.data
  const projects = Array.isArray(data.projects) ? data.projects : null
  const chapters = Array.isArray(data.chapters) ? data.chapters : null
  const outbox = Array.isArray(data.outbox) ? data.outbox : []
  const characters = Array.isArray(data.characters) ? data.characters : []
  const inspiration = Array.isArray(data.inspiration) ? data.inspiration : []
  const ideas = Array.isArray(data.ideas) ? data.ideas : []
  const mindmapNodes = Array.isArray(data.mindmapNodes) ? data.mindmapNodes : []
  const mindmapEdges = Array.isArray(data.mindmapEdges) ? data.mindmapEdges : []

  if (!projects || !chapters) {
    state.backupStatus = "Import refuse (donnees)."
    renderCurrentUI()
    return
  }

  const existingProjects = await idbGetAll("projects")
  const existingChapters = await idbGetAll("chapters")
  const hasExisting = existingProjects.length > 0 || existingChapters.length > 0
  if (hasExisting) {
    const confirmed = window.confirm(
      "Importer ce backup va remplacer les donnees locales. Continuer ?"
    )
    if (!confirmed) {
      return
    }
  }

  await clearStore("projects", "id")
  await clearStore("chapters", "id")
  await clearStore("outbox", "opId")
  await clearStore("ideas", "id")
  await clearStore("inspiration", "id")
  await clearStore("mindmap_nodes", "id")
  await clearStore("mindmap_edges", "id")
  for (const item of characters) {
    await idbPut("characters", item)
  }
  for (const item of inspiration) {
    await idbPut("inspiration", item)
  }
  for (const item of ideas) {
    await idbPut("ideas", item)
  }
  for (const node of mindmapNodes) {
    await idbPut("mindmap_nodes", node)
  }
  for (const edge of mindmapEdges) {
    await idbPut("mindmap_edges", edge)
  }

  state.backupStatus = "Import termine."
  await loadLocalProjects({ allowFallback: false })
  await computeHomeStats()
  await updateLastChapterTitle()
  renderCurrentUI()
}

async function updateLastChapterTitle() {
  const lastProjectId = getLastOpenedProjectId()
  const lastChapterId = getLastOpenedChapterId()
  if (!lastProjectId || !lastChapterId) {
    state.lastChapterTitle = null
    return
  }

  const chapter = await getLocalChapter(lastChapterId)
  if (!chapter || chapter.project_id !== lastProjectId) {
    state.lastChapterTitle = null
    return
  }

  state.lastChapterTitle = chapter.title || "Sans titre"
}

async function ensureProjectAvailable(projectId) {
  if (!projectId) {
    return false
  }

  state.selectedProjectId = projectId
  await loadLocalProjects({ allowFallback: false })

  const hasProject = state.projects.some((project) => project.id === projectId)
  if (hasProject) {
    return true
  }

  await pullProjectsFromCloud()
  await loadLocalProjects({ allowFallback: false })

  return state.projects.some((project) => project.id === projectId)
}

async function loadEditorView(projectId) {
  const hasProject = await ensureProjectAvailable(projectId)
  if (!hasProject) {
    window.location.hash = "#/projects"
    return
  }

  setLastOpenedProjectId(projectId)
  state.statusText = ""
  state.editingProjectId = state.editingProjectId === projectId ? projectId : null
  await loadLocalChapters()
  await loadLocalCharacters()
  await loadLocalInspiration()
  await loadLocalMindmap()
  state.ideasProjectId = state.writingNav === "ideas" ? projectId : null
  if (state.writingNav === "ideas") {
    await loadIdeasView({ projectId, render: false })
  }
  await loadLocalChapterDetail()
  if (state.selectedChapterId) {
    setLastOpenedChapterId(state.selectedChapterId)
  }
  await loadVersionsForChapter(state.selectedChapterId)
  renderAppUI()

  if (!cloudLoadedFromStorage) {
    await pullChaptersFromCloud(projectId)
    await loadLocalChapterDetail()
    await loadLocalCharacters()
    await loadLocalInspiration()
    await loadLocalMindmap()
    if (state.selectedChapterId) {
      setLastOpenedChapterId(state.selectedChapterId)
    }
    await loadVersionsForChapter(state.selectedChapterId)
    renderAppUI()
  }
}

async function handleProjectCreate() {
  const result = await createProject("Sans titre")
  if (!result.ok) {
    setStatus(`Erreur: ${result.errorMessage}`)
    return
  }

  await upsertProjectsLocal([result.data])
  setLastOpenedProjectId(result.data.id)
  state.editingProjectId = result.data.id
  window.location.hash = `#/project/${result.data.id}/write`
}

async function handleProjectsCreate() {
  const result = await createProject("Sans titre")
  if (!result.ok) {
    setStatus(`Erreur: ${result.errorMessage}`)
    return
  }

  await upsertProjectsLocal([result.data])
  setLastOpenedProjectId(result.data.id)
  state.editingProjectId = result.data.id
  window.location.hash = `#/project/${result.data.id}/write`
}

function focusProjectRenameInput(projectId) {
  if (!projectId) {
    return
  }
  window.requestAnimationFrame(() => {
    const input = document.querySelector(`.project-edit-input[data-id="${projectId}"]`)
    if (input) {
      input.focus()
      input.select()
    }
  })
}

function markProjectRenameInvalid(projectId, message) {
  if (!projectId) {
    return
  }
  const input = document.querySelector(`.project-edit-input[data-id="${projectId}"]`)
  if (input) {
    input.setAttribute("aria-invalid", "true")
    if (message) {
      input.setAttribute("title", message)
    }
    input.focus()
    input.select()
  }
  if (message) {
    setStatus(message)
  }
}

async function handleProjectsRename(id) {
  if (!id) {
    return
  }
  const project = state.projects.find((item) => item.id === id)
  if (!project) {
    console.warn("project rename: project not found", id)
    return
  }
  state.editingProjectId = id
  state.projectsMenuOpenId = null
  renderCurrentUI()
  focusProjectRenameInput(id)
}

async function handleProjectsRenameConfirm(id) {
  if (!id) {
    return
  }
  const input = document.querySelector(`.project-edit-input[data-id="${id}"]`)
  const nextTitle = input ? input.value : ""
  await commitProjectRename(id, nextTitle)
}

async function handleProjectsStatus(id, status) {
  if (!id || !status) {
    return
  }
  await updateLocalProject(id, { status })
  await loadLocalProjects({ allowFallback: false })
  await loadProjectsStats()
  await computeHomeStats()
  if (status === "archived" && getLastOpenedProjectId() === id) {
    setLastOpenedProjectId(null)
  }
  state.projectsMenuOpenId = null
  renderCurrentUI()
}

async function handleProjectsDelete(id) {
  if (!id) {
    return
  }
  const project = state.projects.find((item) => item.id === id)
  const title = project?.title ? `"${project.title}"` : "ce projet"
  const confirmed = window.confirm(`Supprimer ${title} ? Cette action est definitive.`)
  if (!confirmed) {
    return
  }
  const result = await deleteProject(id)
  if (!result.ok) {
    setStatus(`Erreur: ${result.errorMessage}`)
    return
  }

  await deleteLocalProject(id)
  await deleteLocalProjectChapters(id)
  await deleteLocalProjectInspiration(id)
  await deleteLocalProjectMindmap(id)
  await loadLocalProjects({ allowFallback: false })
  await loadProjectsStats()
  await computeHomeStats()

  if (state.selectedProjectId === id) {
    state.selectedProjectId = null
    state.selectedChapterId = null
    state.chapterDetail = null
    state.chapters = []
    state.versions = []
  }

  if (state.editingProjectId === id) {
    state.editingProjectId = null
  }

  if (getLastOpenedProjectId() === id) {
    setLastOpenedProjectId(null)
  }

  state.projectsMenuOpenId = null
  renderCurrentUI()
}

async function handleProjectSelect(id) {
  if (id === state.selectedProjectId) {
    return
  }

  setLastOpenedProjectId(id)
  state.editingProjectId = null
  window.location.hash = `#/project/${id}/write`
}

async function handleHomeProjectOpen(id) {
  if (!id) {
    return
  }

  setLastOpenedProjectId(id)
  window.location.hash = `#/project/${id}/write`
}

async function handleHomeProjectContinue() {
  const lastProjectId = getLastOpenedProjectId()
  if (!lastProjectId) {
    return
  }

  window.location.hash = `#/project/${lastProjectId}/write`
}

async function handleHomeProjectCreate() {
  const result = await createProject("Sans titre")
  if (!result.ok) {
    setHomeMessage(`Erreur: ${result.errorMessage}`)
    return
  }

  setHomeMessage("")
  await upsertProjectsLocal([result.data])
  setLastOpenedProjectId(result.data.id)
  state.editingProjectId = result.data.id
  window.location.hash = `#/project/${result.data.id}/write`
}

async function handleHomeProjectDelete(id) {
  if (!id) {
    return
  }

  const project = state.projects.find((item) => item.id === id)
  const title = project?.title ? `"${project.title}"` : "ce projet"
  const confirmed = window.confirm(`Supprimer ${title} ? Cette action est definitive.`)
  if (!confirmed) {
    return
  }

  const result = await deleteProject(id)
  if (!result.ok) {
    setHomeMessage(`Erreur: ${result.errorMessage}`)
    return
  }

  await deleteLocalProject(id)
  await deleteLocalProjectChapters(id)
  await deleteLocalProjectInspiration(id)
  await deleteLocalProjectMindmap(id)
  await loadLocalProjects({ allowFallback: false })

  if (state.selectedProjectId === id) {
    state.selectedProjectId = null
    state.selectedChapterId = null
    state.chapterDetail = null
    state.chapters = []
    state.versions = []
  }

  if (state.editingProjectId === id) {
    state.editingProjectId = null
  }

  if (getLastOpenedProjectId() === id) {
    setLastOpenedProjectId(null)
  }

  setHomeMessage("Projet supprime.")
  renderCurrentUI()
}

async function commitProjectRename(projectId, nextTitle) {
  if (!projectId) {
    return
  }
  if (projectRenamePending.has(projectId)) {
    return
  }
  const project = state.projects.find((item) => item.id === projectId)
  if (!project) {
    console.warn("project rename: project not found", projectId)
    state.editingProjectId = null
    renderCurrentUI()
    return
  }
  const rawTitle = typeof nextTitle === "string" ? nextTitle : ""
  const title = rawTitle.trim()
  if (!title) {
    markProjectRenameInvalid(projectId, "Le titre ne peut pas etre vide.")
    return
  }
  const oldTitle = project.title ?? "Sans titre"
  if (title === oldTitle) {
    state.editingProjectId = null
    renderCurrentUI()
    return
  }

  projectRenamePending.add(projectId)
  let localUpdated = null
  let remoteResult = null
  try {
    const nowIso = new Date().toISOString()
    localUpdated = await updateLocalProject(projectId, { title, updated_at: nowIso })
    if (localUpdated) {
      state.projects = state.projects.map((item) =>
        item.id === projectId ? localUpdated : item
      )
    }
    state.editingProjectId = null
    renderCurrentUI()

    if (navigator.onLine) {
      remoteResult = await renameProject(projectId, title)
      if (!remoteResult.ok) {
        setStatus(`Erreur: ${remoteResult.errorMessage}`)
      } else {
        await upsertProjectsLocal([remoteResult.data])
        await loadLocalProjects({ allowFallback: false })
      }
    }
  } finally {
    if (DEBUG_RENAME) {
      console.debug("project rename", {
        projectId,
        oldTitle,
        newTitle: title,
        idbUpdate: localUpdated,
        remoteOk: remoteResult?.ok ?? null
      })
    }
    projectRenamePending.delete(projectId)
    renderCurrentUI()
  }
}

async function handleChapterContentUpdate(content) {
  if (!state.selectedChapterId) {
    return
  }

  const updated = await saveLocalChapterDraft(state.selectedChapterId, {
    content_md: content
  })

  state.chapterDetail = updated

  const statusText = navigator.onLine ? "Synchronisation..." : "En attente (offline)"
  setStatus(statusText)

  clearAutosaveTimer()
  const chapterId = state.selectedChapterId

  autosaveTimer = window.setTimeout(async () => {
    await computeHomeStats()
    await enqueueChapterUpsert(chapterId)

    if (navigator.onLine) {
      const results = await syncOnce()
      await handleSyncResults(results)
    }
  }, 1200)
}

async function handleChapterCreate() {
  if (!state.selectedProjectId) {
    setStatus("Cree un projet avant d'ajouter un chapitre.")
    return
  }
  const project = state.projects.find((item) => item.id === state.selectedProjectId)
  if (!project) {
    setStatus("Projet introuvable. Recharge la liste des projets.")
    return
  }

  const title = window.prompt("Titre du chapitre")
  if (!title) {
    return
  }
  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    setStatus("Le titre du chapitre ne peut pas etre vide.")
    return
  }

  const orderIndex = state.chapters.length

  const createLocally = async (reasonLabel) => {
    const localChapter = await createLocalChapter(
      state.selectedProjectId,
      trimmedTitle,
      orderIndex
    )
    if (!localChapter) {
      setStatus("Erreur: creation locale du chapitre impossible.")
      return
    }
    await enqueueChapterUpsert(localChapter.id)
    state.selectedChapterId = localChapter.id
    setLastOpenedChapterId(localChapter.id)
    await loadLocalChapters()
    await loadLocalChapterDetail()
    await loadVersionsForChapter(state.selectedChapterId)
    setStatus(reasonLabel)
    renderAppUI()
  }

  if (!navigator.onLine) {
    await createLocally("Chapitre enregistre localement. Synchronisation en attente.")
    return
  }

  const existsResult = await ensureProjectExists(state.selectedProjectId)
  if (!existsResult.ok || !existsResult.exists) {
    if (DEBUG_CHAPTER) {
      console.debug("chapter create blocked: project missing", {
        localProjectId: state.selectedProjectId,
        cloudProjectId: state.selectedProjectId,
        error: existsResult.errorMessage ?? null
      })
    }
    await createLocally("Projet pas encore synchronise. Chapitre enregistre localement.")
    return
  }

  const result = await createChapter(
    state.selectedProjectId,
    trimmedTitle,
    orderIndex
  )

  if (!result.ok) {
    const isFkError =
      result.errorMessage?.includes("chapters_project_id_fkey") ||
      result.errorMessage?.toLowerCase().includes("foreign key constraint")
    if (DEBUG_CHAPTER) {
      console.debug("chapter create failed", {
        localProjectId: state.selectedProjectId,
        cloudProjectId: state.selectedProjectId,
        payload: {
          project_id: state.selectedProjectId,
          title: trimmedTitle,
          order_index: orderIndex
        },
        error: result.errorMessage ?? null
      })
    }
    if (isFkError) {
      await createLocally("Projet non synchronise. Chapitre enregistre localement.")
      return
    }
    setStatus(`Erreur: ${result.errorMessage}`)
    return
  }

  await upsertChaptersLocal([result.data])
  state.selectedChapterId = result.data.id
  setLastOpenedChapterId(result.data.id)

  await loadLocalChapters()
  await loadLocalChapterDetail()
  await loadVersionsForChapter(state.selectedChapterId)
  renderAppUI()
}

async function handleChapterSelect(id) {
  if (id === state.selectedChapterId) {
    return
  }

  clearAutosaveTimer()
  state.selectedChapterId = id
  setLastOpenedChapterId(id)
  state.statusText = ""

  await loadLocalChapterDetail()

  if (!state.chapterDetail) {
    const server = await fetchChapter(id)
    if (server.ok) {
      await upsertChaptersLocal([server.data])
      await loadLocalChapterDetail()
    }
  }

  await loadVersionsForChapter(id)
  renderAppUI()
}

async function handleChapterDelete(id) {
  if (!id || !state.selectedProjectId) {
    return
  }

  if (state.cloudBusy) {
    setStatus("Synchronisation en cours...")
    return
  }

  const chapter = state.chapters.find((item) => item.id === id)
  const title = chapter?.title?.trim() || "Sans titre"
  const confirmed = window.confirm(
    `Supprimer le chapitre "${title}" ? Cette action est irreversible.`
  )
  if (!confirmed) {
    return
  }

  await deleteLocalChapter(id)

  if (state.selectedChapterId === id) {
    state.selectedChapterId = null
    state.chapterDetail = null
    state.versions = []
  }

  await loadLocalChapters()

  if (state.selectedChapterId) {
    setLastOpenedChapterId(state.selectedChapterId)
    await loadLocalChapterDetail()
    await loadVersionsForChapter(state.selectedChapterId)
  } else {
    setLastOpenedChapterId(null)
  }

  renderAppUI()
}

async function handleConflictReload() {
  if (!state.chapterDetail?.server_copy) {
    return
  }

  const server = state.chapterDetail.server_copy
  const updated = {
    ...state.chapterDetail,
    title: server.title ?? state.chapterDetail.title,
    content_md: server.content_md ?? "",
    remote_revision: server.revision ?? state.chapterDetail.remote_revision ?? 0,
    conflict: false,
    dirty: false,
    server_copy: null
  }

  await idbPut("chapters", updated)
  state.chapterDetail = updated
  setStatus("Charge depuis serveur")
  renderAppUI()
}

async function handleConflictDuplicate() {
  if (!state.selectedProjectId || !state.chapterDetail) {
    return
  }

  const baseTitle = state.chapterDetail.title || "Chapitre"
  const title = `${baseTitle} (copie)`
  const orderIndex = state.chapters.length

  const result = await createChapter(state.selectedProjectId, title, orderIndex)
  if (!result.ok) {
    setStatus(`Erreur: ${result.errorMessage}`)
    return
  }

  await upsertChaptersLocal([result.data])
  const updated = await saveLocalChapterDraft(result.data.id, {
    content_md: state.chapterDetail.content_md ?? ""
  })

  state.selectedChapterId = result.data.id
  state.chapterDetail = updated

  const statusText = navigator.onLine ? "Synchronisation..." : "En attente (offline)"
  setStatus(statusText)

  await enqueueChapterUpsert(result.data.id)
  if (navigator.onLine) {
    const results = await syncOnce()
    await handleSyncResults(results)
  }

  await loadLocalChapters()
  await loadVersionsForChapter(state.selectedChapterId)
  renderAppUI()
}

async function handleVersionCreate() {
  if (!state.selectedChapterId || !state.chapterDetail) {
    return
  }

  const label = window.prompt("Label du snapshot (optionnel)")
  const result = await createVersion(
    state.selectedChapterId,
    state.chapterDetail.content_md ?? "",
    label || null
  )

  if (!result.ok) {
    setStatus(`Erreur: ${result.errorMessage}`)
    return
  }

  await loadVersionsForChapter(state.selectedChapterId)
  renderAppUI()
}

async function handleVersionRestore(versionId) {
  if (!state.selectedChapterId) {
    return
  }

  const version = state.versions.find((item) => item.id === versionId)
  if (!version) {
    return
  }

  const updated = await saveLocalChapterDraft(state.selectedChapterId, {
    content_md: version.content_md ?? ""
  })

  state.chapterDetail = updated

  const statusText = navigator.onLine ? "Synchronisation..." : "En attente (offline)"
  setStatus(statusText)

  await enqueueChapterUpsert(state.selectedChapterId)
  if (navigator.onLine) {
    const results = await syncOnce()
    await handleSyncResults(results)
  }

  renderAppUI()
}

async function handleProjectExport() {
  if (!state.selectedProjectId) {
    return
  }

  const chapters = await getLocalChapters(state.selectedProjectId)
  const project = state.projects.find(
    (item) => item.id === state.selectedProjectId
  )

  const projectTitle = project?.title ?? "Projet"
  const lines = [`# ${projectTitle}`, ""]

  const toPlainText = (value) => {
    if (!value) {
      return ""
    }
    if (!/<[a-z][\s\S]*>/i.test(value)) {
      return value
    }
    const container = document.createElement("div")
    container.innerHTML = value
    return container.textContent ?? ""
  }

  for (const chapter of chapters) {
    lines.push(`## ${chapter.title ?? "Sans titre"}`)
    lines.push(toPlainText(chapter.content_md ?? ""))
    lines.push("")
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)
  const filename = `${projectTitle}`
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim() || "projet"

  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.md`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function handleAutoSnapshot(chapterId) {
  const chapter = await getLocalChapter(chapterId)
  if (!chapter) {
    return
  }

  const lastSnapshotAt = chapter.last_snapshot_at ?? 0
  if (Date.now() - lastSnapshotAt < SNAPSHOT_INTERVAL_MS) {
    return
  }

  const result = await createVersion(
    chapterId,
    chapter.content_md ?? "",
    "Auto"
  )

  if (!result.ok) {
    return
  }

  const updated = {
    ...chapter,
    last_snapshot_at: Date.now()
  }

  await idbPut("chapters", updated)

  if (chapterId === state.selectedChapterId) {
    await loadVersionsForChapter(chapterId)
  }
}

const isWritingEditorFocused = () => {
  if (!state.selectedChapterId || state.writingNav !== "chapter") {
    return false
  }
  const active = document.activeElement
  if (!active) {
    return false
  }
  return Boolean(active.closest && active.closest(".ProseMirror"))
}

async function handleSyncResults(results) {
  if (!results || results.length === 0) {
    return
  }

  for (const entry of results) {
    if (entry.status === "synced") {
      await handleAutoSnapshot(entry.chapterId)
    }
  }

  const current = results.find(
    (entry) => entry.chapterId === state.selectedChapterId
  )

  if (!current) {
    return
  }

  if (current.status === "synced") {
    if (isWritingEditorFocused()) {
      setStatus("Enregistre")
      return
    }
    await loadLocalChapterDetail()
    setStatus("Enregistre")
    renderAppUI()
    return
  }

  if (current.status === "conflict") {
    await loadLocalChapterDetail()
    setStatus("Conflit detecte")
    renderAppUI()
  }
}

app.addEventListener("click", async (event) => {
  const actionTarget = event.target.closest("[data-action]")
  if (!actionTarget) {
    return
  }

  const action = actionTarget.dataset.action

  if (action === "sign-out") {
    const result = await signOut()
    if (result.ok) {
      window.location.hash = "#login"
    }
    return
  }

  if (action === "backup-toggle") {
    state.backupMenuOpen = !state.backupMenuOpen
    state.accountMenuOpen = false
    renderCurrentUI()
    return
  }

  if (action === "account-toggle") {
    state.accountMenuOpen = !state.accountMenuOpen
    state.backupMenuOpen = false
    renderCurrentUI()
    return
  }

  if (action === "nav-home") {
    state.accountMenuOpen = false
    state.backupMenuOpen = false
    window.location.hash = "#/home"
    return
  }

  if (action === "nav-ideas") {
    state.accountMenuOpen = false
    state.backupMenuOpen = false
    const lastProjectId = getLastOpenedProjectId()
    window.location.hash = lastProjectId
      ? `#/project/${lastProjectId}/ideas`
      : "#/projects"
    return
  }

  if (action === "nav-projects") {
    state.accountMenuOpen = false
    state.backupMenuOpen = false
    window.location.hash = "#/projects"
    return
  }

  if (action === "projects-open") {
    const id = actionTarget.dataset.id
    if (!id) {
      return
    }
    if (state.editingProjectId === id) {
      return
    }
    state.editingProjectId = null
    setLastOpenedProjectId(id)
    state.projectsMenuOpenId = null
    window.location.hash = `#/project/${id}/write`
    return
  }

  if (action === "projects-create") {
    await handleProjectsCreate()
    return
  }

  if (action === "projects-menu-toggle") {
    const id = actionTarget.dataset.id
    state.projectsMenuOpenId = state.projectsMenuOpenId === id ? null : id
    renderCurrentUI()
    return
  }

  if (action === "projects-rename") {
    await handleProjectsRename(actionTarget.dataset.id)
    return
  }

  if (action === "projects-rename-confirm") {
    await handleProjectsRenameConfirm(actionTarget.dataset.id)
    return
  }

  if (action === "projects-rename-cancel") {
    state.editingProjectId = null
    renderCurrentUI()
    return
  }

  if (action === "projects-rename-input") {
    return
  }

  if (action === "projects-status") {
    await handleProjectsStatus(actionTarget.dataset.id, actionTarget.dataset.status)
    return
  }

  if (action === "projects-delete") {
    await handleProjectsDelete(actionTarget.dataset.id)
    return
  }

  if (action === "ideas-select") {
    const id = actionTarget.dataset.id
    if (id) {
      if (id === state.selectedIdeaId) {
        state.selectedIdeaId = null
        state.ideasNoteExpanded = false
        renderCurrentUI()
        return
      }
      state.selectedIdeaId = id
      state.ideasNoteExpanded = false
      renderCurrentUI()
    }
    return
  }

  if (action === "ideas-delete") {
    await handleIdeasDelete(actionTarget.dataset.id)
    return
  }

  if (action === "ideas-note-toggle") {
    state.ideasNoteExpanded = !state.ideasNoteExpanded
    renderCurrentUI()
    return
  }

  if (action === "ideas-filters-toggle") {
    state.ideasFiltersOpen = !state.ideasFiltersOpen
    renderCurrentUI()
    return
  }

  if (action === "project-create") {
    await handleProjectCreate()
    return
  }

  if (action === "home-project-create") {
    await handleHomeProjectCreate()
    return
  }

  if (action === "home-project-open") {
    await handleHomeProjectOpen(actionTarget.dataset.id)
    return
  }

  if (action === "home-backup-export") {
    state.backupMenuOpen = false
    await handleBackupExport()
    return
  }

  if (action === "home-backup-import") {
    state.backupMenuOpen = false
    const input = document.querySelector("#home-backup-file")
    if (input) {
      input.value = ""
      input.click()
    }
    return
  }

  if (action === "home-cloud-save") {
    state.accountMenuOpen = false
    await handleCloudSave()
    return
  }

  if (action === "home-cloud-load") {
    state.accountMenuOpen = false
    await handleCloudLoad()
    return
  }

  if (action === "home-sign-out") {
    state.accountMenuOpen = false
    const result = await signOut()
    if (!result.ok) {
      console.error(result.errorMessage)
      setHomeMessage(`Erreur: ${result.errorMessage}`)
      return
    }
    currentUserEmail = ""
    setHomeMessage("")
    renderCurrentUI()
    return
  }

  if (action === "home-project-delete") {
    await handleHomeProjectDelete(actionTarget.dataset.id)
    return
  }

  if (action === "home-project-continue") {
    await handleHomeProjectContinue()
    return
  }

  if (action === "home-scroll-next") {
    const target = document.querySelector("#home-next")
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    return
  }





  if (action === "project-select") {
    await handleProjectSelect(actionTarget.dataset.id)
    return
  }

  if (action === "project-export-md") {
    await handleProjectExport()
    return
  }

  if (action === "chapter-create") {
    await handleChapterCreate()
    return
  }

  if (action === "chapter-select") {
    await handleChapterSelect(actionTarget.dataset.id)
    return
  }

  if (action === "chapter-delete") {
    await handleChapterDelete(actionTarget.dataset.id)
    return
  }

  if (action === "conflict-reload-server") {
    await handleConflictReload()
    return
  }

  if (action === "conflict-duplicate-local") {
    await handleConflictDuplicate()
    return
  }

  if (action === "version-create") {
    await handleVersionCreate()
    return
  }

  if (action === "version-restore") {
    await handleVersionRestore(actionTarget.dataset.id)
  }

  if (action === "editor-tab") {
    const nextTab = actionTarget.dataset.tab
    if (nextTab && nextTab !== state.editorTab) {
      state.editorTab = nextTab
      renderAppUI()
    }
    return
  }

  if (action === "writing-nav") {
    const nextNav = actionTarget.dataset.nav
    if (nextNav && nextNav !== state.writingNav) {
      const projectId = state.selectedProjectId
      if (!projectId) {
        return
      }
      const routeMap = {
        chapter: "write",
        characters: "characters",
        inspiration: "inspiration",
        ideas: "ideas",
        mindmap: "mindmap"
      }
      window.location.hash = `#/project/${projectId}/${routeMap[nextNav] ?? "write"}`
    }
    return
  }

  if (action === "inspiration-add") {
    await handleInspirationCreate()
    return
  }

  if (action === "inspiration-choose-type") {
    handleInspirationChooseType(actionTarget.dataset.type)
    return
  }

  if (action === "inspiration-save") {
    await handleInspirationSave()
    return
  }

  if (action === "inspiration-cancel") {
    closeInspirationModal()
    return
  }

  if (action === "inspiration-open") {
    openInspirationDetail(actionTarget.dataset.id)
    return
  }

  if (action === "inspiration-close") {
    closeInspirationDetail()
    return
  }

  if (action === "inspiration-edit") {
    handleInspirationEdit(actionTarget.dataset.id)
    return
  }

  if (action === "inspiration-delete") {
    await handleInspirationDelete(actionTarget.dataset.id)
    return
  }

  if (action === "mindmap-add-node") {
    await handleMindmapCreateNode()
    return
  }

  if (action === "mindmap-link-mode") {
    state.mindmapMode = state.mindmapMode === "link" ? "select" : "link"
    state.mindmapLinkSourceId = null
    renderAppUI()
    return
  }

  if (action === "mindmap-reset") {
    handleMindmapResetView()
    return
  }

  if (action === "mindmap-node") {
    const nodeId = actionTarget.dataset.id
    if (!nodeId) {
      return
    }
    if (state.mindmapMode === "link") {
      if (!state.mindmapLinkSourceId) {
        state.mindmapLinkSourceId = nodeId
        renderAppUI()
        return
      }
      const fromNode = getMindmapNode(state.mindmapLinkSourceId)
      const toNode = getMindmapNode(nodeId)
      if (!fromNode || !toNode) {
        state.mindmapMode = "select"
        state.mindmapLinkSourceId = null
        renderAppUI()
        return
      }
      const menuX = (fromNode.x + toNode.x) / 2 + MINDMAP_NODE_WIDTH / 2 - 80
      const menuY = (fromNode.y + toNode.y) / 2 + MINDMAP_NODE_HEIGHT / 2 - 20
      state.mindmapLinkTypeMenu = {
        open: true,
        fromId: fromNode.id,
        toId: toNode.id,
        x: menuX,
        y: menuY
      }
      renderAppUI()
      return
    }
    handleMindmapSelectNode(nodeId)
    return
  }

  if (action === "mindmap-canvas") {
    if (state.mindmapLinkTypeMenu?.open) {
      const menu = state.mindmapLinkTypeMenu
      if (menu?.fromId && menu?.toId) {
        await handleMindmapCreateEdge(menu.fromId, menu.toId, "linked")
      }
      state.mindmapLinkTypeMenu = null
      state.mindmapMode = "select"
      state.mindmapLinkSourceId = null
      renderAppUI()
      return
    }
    state.mindmapSelectedNodeId = null
    if (state.mindmapMode === "link") {
      state.mindmapLinkSourceId = null
    }
    renderAppUI()
    return
  }

  if (action === "mindmap-delete-node") {
    await handleMindmapDeleteNode(actionTarget.dataset.id)
    return
  }

  if (action === "mindmap-open-source") {
    await handleMindmapOpenSource(actionTarget.dataset.id)
    return
  }

  if (action === "mindmap-link-type") {
    const type = actionTarget.dataset.type || "linked"
    const menu = state.mindmapLinkTypeMenu
    if (menu?.fromId && menu?.toId) {
      await handleMindmapCreateEdge(menu.fromId, menu.toId, type)
    }
    state.mindmapLinkTypeMenu = null
    state.mindmapMode = "select"
    state.mindmapLinkSourceId = null
    renderAppUI()
    return
  }

  if (action === "mindmap-link-cancel") {
    const menu = state.mindmapLinkTypeMenu
    if (menu?.fromId && menu?.toId) {
      await handleMindmapCreateEdge(menu.fromId, menu.toId, "linked")
    }
    state.mindmapLinkTypeMenu = null
    state.mindmapMode = "select"
    state.mindmapLinkSourceId = null
    renderAppUI()
    return
  }

  if (action === "character-create") {
    await handleCharacterCreate()
    return
  }

  if (action === "character-select") {
    await handleCharacterSelect(actionTarget.dataset.id)
    return
  }

  if (action === "character-delete") {
    await handleCharacterDelete(actionTarget.dataset.id)
    return
  }

  if (action === "character-toggle") {
    handleCharacterSectionToggle(actionTarget.dataset.section)
    return
  }

  if (action === "character-rate") {
    const rating = Number(actionTarget.dataset.rating)
    if (Number.isFinite(rating)) {
      await handleCharacterRating(rating)
    }
    return
  }

  if (action === "character-write") {
    handleCharacterWriteSideBySide()
    return
  }

  if (action === "character-avatar") {
    const input = document.querySelector("#character-avatar-input")
    if (input instanceof HTMLInputElement) {
      input.value = ""
      input.click()
    }
    return
  }

  if (action === "character-physique") {
    const input = document.querySelector("#character-physique-input")
    if (input instanceof HTMLInputElement) {
      input.value = ""
      input.click()
    }
    return
  }
})

function clearChapterDragState() {
  document
    .querySelectorAll(".chapter-item.is-dragging, .chapter-item.is-drop-target")
    .forEach((node) => node.classList.remove("is-dragging", "is-drop-target"))
}

app.addEventListener("dragstart", (event) => {
  const target = event.target.closest(".chapter-item")
  if (!target || !(event.dataTransfer instanceof DataTransfer)) {
    return
  }

  dragChapterId = target.dataset.id || null
  if (!dragChapterId) {
    return
  }

  target.classList.add("is-dragging")
  event.dataTransfer.effectAllowed = "move"
  event.dataTransfer.setData("text/plain", dragChapterId)
})

app.addEventListener("dragover", (event) => {
  const target = event.target.closest(".chapter-item")
  if (!target || !dragChapterId) {
    return
  }

  const targetId = target.dataset.id
  if (!targetId || targetId === dragChapterId) {
    return
  }

  event.preventDefault()
  if (dragOverChapterId && dragOverChapterId !== targetId) {
    const prev = document.querySelector(
      `.chapter-item[data-id="${dragOverChapterId}"]`
    )
    if (prev) {
      prev.classList.remove("is-drop-target")
    }
  }
  dragOverChapterId = targetId
  target.classList.add("is-drop-target")
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move"
  }
})

app.addEventListener("drop", async (event) => {
  const target = event.target.closest(".chapter-item")
  if (!target || !dragChapterId) {
    clearChapterDragState()
    dragChapterId = null
    dragOverChapterId = null
    return
  }

  event.preventDefault()
  const targetId = target.dataset.id
  clearChapterDragState()
  const currentDragId = dragChapterId
  dragChapterId = null
  dragOverChapterId = null

  if (targetId) {
    await handleChapterReorder(currentDragId, targetId)
  }
})

app.addEventListener("dragend", () => {
  clearChapterDragState()
  dragChapterId = null
  dragOverChapterId = null
})

app.addEventListener("mousedown", (event) => {
  if (state.writingNav !== "mindmap") {
    return
  }
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }
  const nodeEl = target.closest(".mindmap-node")
  const canvasEl = target.closest(".mindmap-canvas")
  if (!canvasEl) {
    return
  }

  if (nodeEl) {
    const nodeId = nodeEl.dataset.id
    const node = getMindmapNode(nodeId)
    if (!node) {
      return
    }
    mindmapDrag = {
      id: node.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y
    }
    event.preventDefault()
    return
  }

  mindmapPan = {
    startX: event.clientX,
    startY: event.clientY,
    originX: state.mindmapView.offsetX,
    originY: state.mindmapView.offsetY
  }
  event.preventDefault()
})

app.addEventListener("dblclick", async (event) => {
  if (state.writingNav !== "mindmap") {
    return
  }
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }
  const canvasEl = target.closest(".mindmap-canvas")
  if (!canvasEl) {
    return
  }
  const rect = canvasEl.getBoundingClientRect()
  const x = (event.clientX - rect.left - state.mindmapView.offsetX) / state.mindmapView.scale - MINDMAP_NODE_WIDTH / 2
  const y = (event.clientY - rect.top - state.mindmapView.offsetY) / state.mindmapView.scale - MINDMAP_NODE_HEIGHT / 2
  await handleMindmapCreateNode({ x, y })
})

app.addEventListener("mousemove", (event) => {
  if (state.writingNav !== "mindmap") {
    return
  }

  if (mindmapDrag) {
    const dx = (event.clientX - mindmapDrag.startX) / state.mindmapView.scale
    const dy = (event.clientY - mindmapDrag.startY) / state.mindmapView.scale
    const nextX = mindmapDrag.originX + dx
    const nextY = mindmapDrag.originY + dy
    state.mindmapNodes = state.mindmapNodes.map((node) =>
      node.id === mindmapDrag.id ? { ...node, x: nextX, y: nextY } : node
    )
    renderAppUI()
    return
  }

  if (mindmapPan) {
    const dx = event.clientX - mindmapPan.startX
    const dy = event.clientY - mindmapPan.startY
    state.mindmapView = {
      ...state.mindmapView,
      offsetX: mindmapPan.originX + dx,
      offsetY: mindmapPan.originY + dy
    }
    renderAppUI()
  }
})

app.addEventListener("mouseup", async () => {
  if (state.writingNav !== "mindmap") {
    mindmapDrag = null
    mindmapPan = null
    return
  }
  if (mindmapDrag) {
    const node = getMindmapNode(mindmapDrag.id)
    if (node) {
      await updateMindmapNode(node.id, { x: node.x, y: node.y })
    }
  }
  mindmapDrag = null
  mindmapPan = null
})

app.addEventListener(
  "wheel",
  (event) => {
    if (state.writingNav !== "mindmap") {
      return
    }
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }
    const canvasEl = target.closest(".mindmap-canvas")
    if (!canvasEl) {
      return
    }
    event.preventDefault()
    const rect = canvasEl.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    const prevScale = state.mindmapView.scale
    const nextScale = Math.min(2, Math.max(0.4, prevScale + (event.deltaY > 0 ? -0.08 : 0.08)))
    const scaleRatio = nextScale / prevScale
    const nextOffsetX = mouseX - (mouseX - state.mindmapView.offsetX) * scaleRatio
    const nextOffsetY = mouseY - (mouseY - state.mindmapView.offsetY) * scaleRatio
    state.mindmapView = {
      offsetX: nextOffsetX,
      offsetY: nextOffsetY,
      scale: nextScale
    }
    renderAppUI()
  },
  { passive: false }
)

app.addEventListener("input", async (event) => {
  const target = event.target
  if (!target) {
    return
  }

  if (target instanceof HTMLInputElement && target.classList.contains("project-edit-input")) {
    if (target.getAttribute("aria-invalid") === "true") {
      target.removeAttribute("aria-invalid")
      target.removeAttribute("title")
    }
    return
  }

  if (target.id === "character-filter") {
    handleCharacterFilter(target.value)
    return
  }

  if (target.id === "ideas-search") {
    state.ideasQuery = target.value
    renderCurrentUI()
    return
  }

  if (target.id === "ideas-tag-filter") {
    state.ideasTagFilter = target.value
    renderCurrentUI()
    return
  }

  if (target.id === "inspiration-search") {
    handleInspirationSearch(target.value)
    return
  }

  if (target.id === "mindmap-search") {
    state.mindmapSearch = target.value
    const query = target.value.trim()
    if (query) {
      const normalized = normalizeText(query)
      const match = state.mindmapNodes.find((node) => {
        const haystack = [
          node.title,
          node.summary,
          ...(node.tags ?? [])
        ]
          .filter(Boolean)
          .join(" ")
        return normalizeText(haystack).includes(normalized)
      })
      if (match) {
        state.mindmapSelectedNodeId = match.id
        panToMindmapNode(match)
        flashMindmapNode(match.id)
      }
    }
    renderAppUI()
    return
  }

  if (target.dataset.mindmapField) {
    const field = target.dataset.mindmapField
    const id = target.dataset.id
    if (id) {
      const value = target.value
      if (field === "tags") {
        const tags = parseTags(value)
        handleMindmapUpdateNode(id, { tags })
        return
      }
      handleMindmapUpdateNode(id, { [field]: value })
      return
    }
  }

  if (target.dataset.ideaField) {
    const field = target.dataset.ideaField
    const id = target.dataset.id
    if (id) {
      if (field === "tags") {
        const tags = parseTags(target.value)
        queueIdeaPatch(id, { tags })
        return
      }
      queueIdeaPatch(id, { [field]: target.value })
      return
    }
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const field = target.dataset.characterField
    const metaKey = target.dataset.characterMeta || null
    if (field) {
      handleCharacterFieldUpdate(field, target.value, metaKey)
      return
    }
  }

  if (target.id === "chapter-content") {
    await handleChapterContentUpdate(target.value)
  }
})

app.addEventListener("focusout", async (event) => {
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }

  if (target.dataset.ideaField) {
    const id = target.dataset.id
    if (id) {
      await flushIdeaPatch(id, { render: false })
    }
  }
})

app.addEventListener("change", async (event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return
  }

  if (target.dataset.characterField) {
    const field = target.dataset.characterField
    const metaKey = target.dataset.characterMeta || null
    handleCharacterFieldUpdate(field, target.value, metaKey)
    return
  }

  if (target.dataset.mindmapField) {
    const field = target.dataset.mindmapField
    const id = target.dataset.id
    if (id) {
      handleMindmapUpdateNode(id, { [field]: target.value })
    }
    return
  }

  if (target.dataset.ideaField) {
    const field = target.dataset.ideaField
    const id = target.dataset.id
    if (id) {
      if (field === "tags") {
        const tags = parseTags(target.value)
        await applyIdeaPatch(id, { tags }, { render: true })
        return
      }
      await applyIdeaPatch(id, { [field]: target.value }, { render: true })
    }
    return
  }

  if (target.id === "inspiration-tag-filter") {
    handleInspirationTagFilter(target.value)
    return
  }

  if (target.id === "ideas-status-filter") {
    state.ideasStatusFilter = target.value
    renderCurrentUI()
    return
  }

  if (target.id === "ideas-sort") {
    state.ideasSort = target.value
    renderCurrentUI()
    return
  }

  if (target.id === "mindmap-create-type") {
    state.mindmapCreateType = target.value
    return
  }

  if (target.id === "inspiration-image-input") {
    const file = target.files?.[0] ?? null
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      if (!result) {
        return
      }
      const draft = state.inspirationModal?.draft ?? {}
      state.inspirationModal = {
        ...(state.inspirationModal ?? {}),
        open: true,
        step: "form",
        type: "image",
        draft: {
          ...draft,
          image_data: result
        }
      }
      renderAppUI()
    }
    reader.readAsDataURL(file)
    return
  }

  if (target.id === "character-avatar-input") {
    const file = target.files?.[0] ?? null
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      const character = getSelectedCharacter()
      if (character && result) {
        await updateLocalCharacter(character.id, { avatar_url: result })
        await loadLocalCharacters()
        renderAppUI()
      }
    }
    reader.readAsDataURL(file)
    return
  }

  if (target.id === "character-physique-input") {
    const file = target.files?.[0] ?? null
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      const character = getSelectedCharacter()
      if (character && result) {
        const nextMeta = {
          ...(character.meta ?? {}),
          physique: {
            ...(character.meta?.physique ?? {}),
            image_url: result
          }
        }
        await updateLocalCharacter(character.id, { meta: nextMeta })
        await loadLocalCharacters()
        renderAppUI()
      }
    }
    reader.readAsDataURL(file)
    return
  }

  if (target.id !== "home-backup-file") {
    return
  }

  const file = target.files?.[0] ?? null
  await handleBackupImport(file)
  target.value = ""
})



document.addEventListener("click", (event) => {
  if (!state.accountMenuOpen) {
    return
  }
  const target = event.target
  if (target instanceof Element && (target.closest(".topbar-account") || target.closest(".topbar-backup"))) {
    return
  }
  state.accountMenuOpen = false
  state.backupMenuOpen = false
  renderCurrentUI()
})

document.addEventListener("click", (event) => {
  if (!state.projectsMenuOpenId) {
    return
  }
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }
  if (target.closest(".project-menu") || target.closest(".project-menu-toggle")) {
    return
  }
  state.projectsMenuOpenId = null
  renderCurrentUI()
})

document.addEventListener("keydown", (event) => {
  const target = event.target
  const isEditable =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)

  if (event.key === "Escape") {
    if (!state.accountMenuOpen && !state.backupMenuOpen) {
      return
    }
    state.accountMenuOpen = false
    state.backupMenuOpen = false
    renderCurrentUI()
    return
  }

  if (isEditable) {
    return
  }

  const key = event.key.toLowerCase()
  const primary = (event.ctrlKey || event.metaKey) && event.shiftKey && key === "i"
  const fallback = event.ctrlKey && event.altKey && key === "i"
  if (primary || fallback) {
    event.preventDefault()
    state.accountMenuOpen = false
    state.backupMenuOpen = false
    const lastProjectId = getLastOpenedProjectId()
    window.location.hash = lastProjectId
      ? `#/project/${lastProjectId}/ideas`
      : "#/projects"
  }
})

app.addEventListener("keydown", async (event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }


  if (!target.classList.contains("project-edit-input")) {
    return
  }

  if (event.key === "Enter") {
    event.preventDefault()
    const projectId = target.dataset.id
    if (projectId) {
      await commitProjectRename(projectId, target.value)
    }
    return
  }

  if (event.key === "Escape") {
    event.preventDefault()
    state.editingProjectId = null
    renderCurrentUI()
  }
})

app.addEventListener("keydown", async (event) => {
  const target = event.target
  if (!(target instanceof HTMLTextAreaElement)) {
    return
  }
  if (target.id !== "ideas-create-input") {
    return
  }
  if (event.key !== "Enter" || event.shiftKey) {
    return
  }
  event.preventDefault()
  const value = target.value
  await handleIdeasCreateFromInput(value)
  target.value = ""
})

app.addEventListener("keydown", (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) {
    return
  }
  if (target.dataset.action !== "projects-open" || target.tagName === "BUTTON") {
    return
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault()
    const id = target.dataset.id
    if (!id) {
      return
    }
    if (state.editingProjectId === id) {
      return
    }
    setLastOpenedProjectId(id)
    state.projectsMenuOpenId = null
    window.location.hash = `#/project/${id}/write`
  }
})

async function render() {
  const { page, props } = await route()
  clearAutosaveTimer()

  if (page === "editor") {
    state.accountMenuOpen = false
    state.backupMenuOpen = false
    currentUserEmail = props.userEmail
    setCloudAutosaveActive(Boolean(currentUserEmail))
    await ensureCloudBootstrap()
    if (!syncStarted) {
      startSyncLoop(handleSyncResults)
      syncStarted = true
    }

    if (props.writingNav) {
      state.writingNav = props.writingNav
    }
    await loadEditorView(props.projectId)
    return
  }

  unmountWritingView()

  if (page === "home") {
    state.accountMenuOpen = false
    state.backupMenuOpen = false
    currentUserEmail = props.userEmail
    setCloudAutosaveActive(Boolean(currentUserEmail))
    await ensureCloudBootstrap()
    await loadHomeView()
    return
  }

  if (page === "projects") {
    state.accountMenuOpen = false
    state.backupMenuOpen = false
    currentUserEmail = props.userEmail
    setCloudAutosaveActive(Boolean(currentUserEmail))
    await ensureCloudBootstrap()
    await loadProjectsView()
    return
  }

  app.innerHTML = renderLogin({ message: props.message })
  setCloudAutosaveActive(false)
  cloudBootstrapDone = false
  cloudLoadedFromStorage = false

  const signInButton = document.querySelector("#sign-in")
  const signUpButton = document.querySelector("#sign-up")

  if (signInButton) {
    signInButton.addEventListener("click", async () => {
      const { email, password } = getCredentials()
      const result = await signIn(email, password)
      if (!result.ok) {
        setMessage(result.errorMessage)
        return
      }
      window.location.hash = "#/home"
    })
  }

  if (signUpButton) {
    signUpButton.addEventListener("click", async () => {
      const { email, password } = getCredentials()
      const result = await signUp(email, password)
      if (!result.ok) {
        setMessage(result.errorMessage)
        return
      }
      setMessage("Compte cree. Verifie tes emails si besoin.")
    })
  }
}

window.addEventListener("hashchange", render)
render()
