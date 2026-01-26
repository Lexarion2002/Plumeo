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
  createWritingSession,
  listWritingSessions,
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
  deleteLocalProjectMindmap,
  deleteLocalProjectKnowledge,
  deleteLocalProjectFocus,
  listKnowledgeNotes,
  createKnowledgeNote,
  updateKnowledgeNote,
  deleteKnowledgeNote,
  listKnowledgeLinks,
  replaceKnowledgeLinksForNote,
  listFocusSessions,
  createFocusSession,
  updateFocusSession
} from "./localStore.js"
import { enqueueChapterUpsert, startSyncLoop, syncOnce } from "./sync.js"
import { idbDel, idbGetAll, idbPut } from "./idb.js"
import { mountWritingView, unmountWritingView, getEditorWordCount } from "./writingView.js"
import { loadFromCloud, saveToCloud } from "./cloud.js"

const app = document.querySelector("#app")
const DEBUG_RENAME = import.meta.env.DEV
const DEBUG_CHAPTER = import.meta.env.DEV
const WIKI_GRAPH_DEFAULT_SCALE = 0.8


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
  knowledgeNotes: [],
  knowledgeLinks: [],
  knowledgeSearch: "",
  knowledgeSort: "recent",
  knowledgeActiveId: null,
  knowledgeProjectId: null,
  knowledgeTab: "notes",
  knowledgePreviewOpen: false,
  knowledgeRenameBusy: false,
  knowledgeTitleDrafts: {},
  knowledgeTitleOriginals: {},
  knowledgeTitleError: "",
  knowledgeDuplicates: [],
  wikiGraphNodes: [],
  wikiGraphEdges: [],
  wikiGraphSelectedNodeId: null,
  wikiGraphSearch: "",
  wikiGraphMinDegree: 0,
  wikiGraphShowOrphans: false,
  wikiGraphPanelCollapsed: false,
  wikiGraphSettingsOpen: false,
  wikiGraphNeedsBuild: true,
  wikiGraphLayoutReady: false,
  wikiGraphGuardMessage: "",
  wikiGraphView: {
    offsetX: 0,
    offsetY: 0,
    scale: WIKI_GRAPH_DEFAULT_SCALE
  },
  focusSession: null,
  focusElapsedMs: 0,
  knowledgeAutocomplete: {
    open: false,
    query: "",
    matches: [],
    range: null,
    createTitle: ""
  },
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
  mindmapDeleteConfirmId: null,
  mindmapContextMenu: null,
  mindmapNeedsCenter: true,
  projectStatsCache: {},
  projectStatsView: null,
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
const WRITING_SESSION_IDLE_MS = 2 * 60 * 1000
const MINDMAP_UPDATE_DEBOUNCE_MS = 400
const AUTO_UPDATE_WIKI_LINKS_ON_RENAME = true

let autosaveTimer = null
let cloudAutosaveTimer = null
let writingSessionIdleTimer = null
let activeWritingSession = null
let syncStarted = false
let currentUserEmail = ""
let cloudBootstrapDone = false
let cloudLoadedFromStorage = false
let dragChapterId = null
let dragOverChapterId = null
const characterSaveTimers = new Map()
const ideaSaveTimers = new Map()
const ideaPendingPatches = new Map()
const knowledgeSaveTimers = new Map()
const knowledgePendingPatches = new Map()
const wikiLinkOpenRequests = new Map()
const projectRenamePending = new Set()
const MINDMAP_NODE_WIDTH = 180
const MINDMAP_NODE_HEIGHT = 64
const WIKI_GRAPH_MAX_RENDER_NODES = 600
const WIKI_GRAPH_LAYOUT_LIMIT = 400
let mindmapDrag = null
let mindmapPan = null
let mindmapFlashTimer = null
let mindmapUpdateTimer = null
let wikiGraphDragFrame = null
let wikiGraphViewFrame = null
let graphTooltipNode = null
let focusTimer = null
let focusCleanupDone = false
const mindmapUpdateQueue = new Map()

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
  const allowedWritingNav = new Set([
    "chapter",
    "characters",
    "ideas",
    "inspiration",
    "mindmap",
    "stats",
    "knowledge"
  ])
  if (!allowedWritingNav.has(state.writingNav)) {
    state.writingNav = "chapter"
  }
  if (!["notes", "graph"].includes(state.knowledgeTab)) {
    state.knowledgeTab = "notes"
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
    state.mindmapDeleteConfirmId = null
    state.mindmapContextMenu = null
  }
  if (state.writingNav !== "knowledge") {
    state.knowledgePreviewOpen = false
    state.knowledgeAutocomplete = {
      open: false,
      query: "",
      matches: [],
      range: null,
      createTitle: ""
    }
  }
  if (
    state.writingNav === "characters" &&
    !state.selectedCharacterId &&
    state.characters.length
  ) {
    state.selectedCharacterId = state.characters[0].id
  }
  if (isWikiGraphView()) {
    ensureWikiGraphData()
  }
  const wikiGraphData = isWikiGraphView()
    ? getWikiGraphRenderData()
    : {
        nodes: [],
        edges: [],
        blockedMessage: "",
        selectedNodeId: null,
        view: state.wikiGraphView,
        search: state.wikiGraphSearch,
        minDegree: state.wikiGraphMinDegree,
        showOrphans: state.wikiGraphShowOrphans
      }
  const wikiGraphDetails = isWikiGraphView()
    ? getWikiGraphDetails()
    : { note: null, outgoing: [], backlinks: [] }
  const focusActive = Boolean(state.focusSession)
  const focusButtonLabel = focusActive ? "⏺ Quitter le focus" : "▶ Démarrer le focus"
  const focusIndicatorLabel = focusActive
    ? `⏺ Focus en cours · ${formatFocusDuration(
        Date.now() - state.focusSession.start_at
      )}`
    : ""
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
    knowledgeNotes: getFilteredKnowledgeNotes(),
    knowledgeActiveNote: getActiveKnowledgeNote(),
    knowledgeBacklinks: getKnowledgeBacklinks(),
    knowledgeHasNotes: state.knowledgeNotes.length > 0,
    knowledgeSearch: state.knowledgeSearch,
    knowledgeSort: state.knowledgeSort,
    knowledgeTab: state.knowledgeTab,
    knowledgePreviewOpen: state.knowledgePreviewOpen,
    knowledgeAutocomplete: state.knowledgeAutocomplete,
    knowledgeTitleDrafts: state.knowledgeTitleDrafts,
    knowledgeTitleError: state.knowledgeTitleError,
    knowledgeDuplicates: state.knowledgeDuplicates,
    knowledgeRenameBusy: state.knowledgeRenameBusy,
    wikiGraph: wikiGraphData,
    wikiGraphDetails,
    mindmapNodes: state.mindmapNodes,
    mindmapEdges: state.mindmapEdges,
    mindmapSelectedNodeId: state.mindmapSelectedNodeId,
    mindmapMode: state.mindmapMode,
    mindmapLinkSourceId: state.mindmapLinkSourceId,
    mindmapSearch: state.mindmapSearch,
    mindmapCreateType: state.mindmapCreateType,
    mindmapLinkTypeMenu: state.mindmapLinkTypeMenu,
    mindmapFlashNodeId: state.mindmapFlashNodeId,
    mindmapDeleteConfirmId: state.mindmapDeleteConfirmId,
    mindmapContextMenu: state.mindmapContextMenu,
    mindmapView: state.mindmapView,
    projectStatsView: state.projectStatsView,
    characterSections: state.characterSections,
    lastCloudSaveAt: state.lastCloudSaveAt,
    cloudStatus: state.cloudStatus,
    cloudBusy: state.cloudBusy,
    accountMenuOpen: state.accountMenuOpen,
    backupStatus: state.backupStatus,
    backupMenuOpen: state.backupMenuOpen,
    focusActive,
    focusButtonLabel,
    focusIndicatorLabel
  })
  renderProjectSelectionState()
  if (state.writingNav === "knowledge" && state.knowledgeTab === "notes") {
    renderKnowledgeAutocomplete()
  }

  if (state.writingNav === "mindmap" && state.mindmapNeedsCenter) {
    state.mindmapNeedsCenter = false
    handleMindmapResetView()
    return
  }

  if (state.chapterDetail) {
    mountWritingView({
      content: state.chapterDetail.content_md ?? "",
      onUpdate: handleChapterContentUpdate
    })
    updateFocusToggleLabel()
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
    state.mindmapDeleteConfirmId = null
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

async function loadKnowledgeView({ projectId = null, render = true } = {}) {
  if (!projectId) {
    state.knowledgeNotes = []
    state.knowledgeLinks = []
    state.knowledgeActiveId = null
    state.knowledgePreviewOpen = false
    state.wikiGraphNodes = []
    state.wikiGraphEdges = []
    state.wikiGraphSelectedNodeId = null
    state.wikiGraphNeedsBuild = true
    state.wikiGraphLayoutReady = false
    state.knowledgeAutocomplete = {
      open: false,
      query: "",
      matches: [],
      range: null,
      createTitle: ""
    }
    return
  }
  state.knowledgeProjectId = projectId
  state.knowledgeNotes = await listKnowledgeNotes(projectId)
  state.knowledgeLinks = await listKnowledgeLinks(projectId)
  markWikiGraphDirty()
  refreshKnowledgeDuplicates()
  const hasSelected = state.knowledgeNotes.some(
    (note) => note.id === state.knowledgeActiveId
  )
  if (!hasSelected) {
    state.knowledgeActiveId = state.knowledgeNotes[0]?.id ?? null
  }
  if (render) {
    renderAppUI()
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

async function loadProjectStatsView({ projectId, force = false } = {}) {
  if (!projectId) {
    state.projectStatsView = null
    return
  }
  if (!force && state.projectStatsCache[projectId]) {
    state.projectStatsView = state.projectStatsCache[projectId]
    return
  }
  const chapters = await getLocalChapters(projectId)
  const chapterStats = chapters.map((chapter) => {
    const plain = toPlainText(chapter.content_md ?? "")
    const words = countWords(plain)
    const timestamp = getChapterTimestamp(chapter)
    return {
      id: chapter.id,
      title: chapter.title || "Sans titre",
      order_index: chapter.order_index ?? 0,
      words,
      timestamp
    }
  })

  let totalWords = 0
  const dayKeys = new Set()
  let lastActivity = null
  const wordsByDay = new Map()

  for (const chapter of chapterStats) {
    totalWords += chapter.words
    if (chapter.timestamp) {
      const key = formatDayKey(chapter.timestamp)
      if (key) {
        dayKeys.add(key)
        const current = wordsByDay.get(key) ?? 0
        wordsByDay.set(key, current + chapter.words)
      }
      if (!lastActivity || chapter.timestamp > lastActivity.timestamp) {
        lastActivity = chapter
      }
    }
  }

  const daysActive = dayKeys.size
  const wordsPerDay = daysActive ? Math.round(totalWords / daysActive) : 0
  const orderedSeries = Array.from(wordsByDay.entries())
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .map(([date, words]) => ({ date, words }))

  const orderedChapters = [...chapterStats].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  )

  const focusSessions = await listFocusSessions(projectId)
  const completedSessions = focusSessions.filter(
    (session) => session.end_at && session.duration_ms
  )
  const totalFocusMs = completedSessions.reduce(
    (total, session) => total + (session.duration_ms ?? 0),
    0
  )
  const focusDays = new Set(
    completedSessions
      .map((session) => formatDayKey(session.start_at ?? session.end_at))
      .filter(Boolean)
  )
  const timeSpentMinutes = totalFocusMs
    ? Math.round(totalFocusMs / 60000)
    : null
  const timePerDayMinutes =
    timeSpentMinutes && focusDays.size
      ? Math.round(timeSpentMinutes / focusDays.size)
      : null

  const stats = {
    totalWords,
    totalChapters: chapters.length,
    daysActive,
    wordsPerDay,
    timeSpentMinutes,
    timePerDayMinutes,
    lastActivity,
    series: orderedSeries,
    chapters: orderedChapters
  }

  state.projectStatsCache[projectId] = stats
  state.projectStatsView = stats
}

function countWords(text) {
  const trimmed = text.trim()
  if (!trimmed) {
    return 0
  }
  const matches = trimmed.match(/\S+/g)
  return matches ? matches.length : 0
}

function formatFocusDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function getCurrentEditorWordCount() {
  const fromEditor = getEditorWordCount?.()
  if (Number.isFinite(fromEditor)) {
    return fromEditor
  }
  const fallback = toPlainText(state.chapterDetail?.content_md ?? "")
  return countWords(fallback)
}

function updateFocusToggleLabel() {
  const button = document.querySelector('[data-action="focus-toggle"]')
  const indicator = document.querySelector("#focus-indicator")
  document.body.classList.toggle("focus-mode", Boolean(state.focusSession))
  if (!button) {
    return
  }
  const label = button.querySelector(".focus-toggle-label") ?? button
  if (!state.focusSession) {
    label.textContent = "▶ Démarrer le focus"
    button.classList.remove("is-active")
    button.setAttribute("aria-pressed", "false")
    if (indicator) {
      indicator.textContent = ""
      indicator.classList.remove("is-active")
    }
    return
  }
  const elapsed = Date.now() - state.focusSession.start_at
  label.textContent = "⏺ Quitter le focus"
  button.classList.add("is-active")
  button.setAttribute("aria-pressed", "true")
  if (indicator) {
    indicator.textContent = `⏺ Focus en cours · ${formatFocusDuration(elapsed)}`
    indicator.classList.add("is-active")
  }
}

function startFocusTimer() {
  if (focusTimer) {
    return
  }
  focusTimer = window.setInterval(() => {
    if (!state.focusSession) {
      return
    }
    updateFocusToggleLabel()
  }, 1000)
}

function stopFocusTimer() {
  if (focusTimer) {
    clearInterval(focusTimer)
    focusTimer = null
  }
}

async function startFocusSession() {
  if (state.writingNav !== "chapter") {
    return
  }
  if (!state.selectedProjectId || !state.selectedChapterId) {
    return
  }
  if (state.focusSession) {
    return
  }
  const wordCountStart = getCurrentEditorWordCount()
  const session = await createFocusSession(state.selectedProjectId, state.selectedChapterId, {
    start_at: Date.now(),
    word_count_start: wordCountStart
  })
  if (!session) {
    return
  }
  state.focusSession = session
  state.focusElapsedMs = 0
  startFocusTimer()
  updateFocusToggleLabel()
}

async function stopFocusSession({ reason } = {}) {
  if (!state.focusSession) {
    return
  }
  const endAt = Date.now()
  const wordCountEnd = getCurrentEditorWordCount()
  const durationMs = Math.max(0, endAt - state.focusSession.start_at)
  await updateFocusSession(state.focusSession.id, {
    end_at: endAt,
    duration_ms: durationMs,
    word_count_end: wordCountEnd
  })
  const projectId = state.focusSession.project_id
  state.focusSession = null
  state.focusElapsedMs = 0
  stopFocusTimer()
  updateFocusToggleLabel()
  if (projectId) {
    delete state.projectStatsCache[projectId]
    if (state.writingNav === "stats") {
      await loadProjectStatsView({ projectId, force: true })
    }
  }
}

async function cleanupOpenFocusSessions() {
  const sessions = await listFocusSessions()
  const openSessions = sessions.filter((session) => !session.end_at)
  for (const session of openSessions) {
    await updateFocusSession(session.id, {
      end_at: session.start_at,
      duration_ms: 0,
      word_count_end: session.word_count_start ?? 0
    })
  }
}

function formatDayKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date.toISOString().slice(0, 10)
}

function getChapterTimestamp(chapter) {
  return (
    chapter.updated_local_at ??
    chapter.updated_at ??
    chapter.created_at ??
    null
  )
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

function resolveSessionRange(session) {
  const start = Number.isFinite(session?.started_at) ? session.started_at : null
  if (start === null) {
    return null
  }
  const endedAt = Number.isFinite(session?.ended_at) ? session.ended_at : null
  const durationMs = Number.isFinite(session?.duration_ms)
    ? session.duration_ms
    : null
  const end = Number.isFinite(endedAt)
    ? endedAt
    : Number.isFinite(durationMs)
      ? start + durationMs
      : null
  if (!Number.isFinite(end) || end <= start) {
    return null
  }
  const duration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : end - start
  if (duration <= 0) {
    return null
  }
  return { start, end, duration }
}

function computeTimeStats(sessions, now) {
  if (!Array.isArray(sessions)) {
    return { timeSpent: null, timePerDay: null }
  }

  if (sessions.length === 0) {
    return { timeSpent: 0, timePerDay: 0 }
  }

  let totalMs = 0
  let earliest = null

  for (const session of sessions) {
    const range = resolveSessionRange(session)
    if (!range) {
      continue
    }
    totalMs += range.duration
    earliest = earliest === null ? range.start : Math.min(earliest, range.start)
  }

  if (totalMs <= 0 || earliest === null) {
    return { timeSpent: 0, timePerDay: 0 }
  }

  const totalMinutes = totalMs / 60000
  const days = Math.max(1, Math.ceil((now - earliest) / 86400000))
  return { timeSpent: totalMinutes, timePerDay: totalMinutes / days }
}

const FAVORITE_TIME_BUCKETS = [
  { id: "night", label: "Nuit (0h-6h)", startHour: 0, endHour: 6 },
  { id: "morning", label: "Matin (6h-12h)", startHour: 6, endHour: 12 },
  { id: "afternoon", label: "Apres-midi (12h-18h)", startHour: 12, endHour: 18 },
  { id: "evening", label: "Soir (18h-24h)", startHour: 18, endHour: 24 }
]
const FAVORITE_TIME_MINUTES = 30
const FAVORITE_TIME_TIE_WINDOW_MS = 60000

function getFavoriteBucketByHour(hour) {
  if (hour < 6) {
    return FAVORITE_TIME_BUCKETS[0]
  }
  if (hour < 12) {
    return FAVORITE_TIME_BUCKETS[1]
  }
  if (hour < 18) {
    return FAVORITE_TIME_BUCKETS[2]
  }
  return FAVORITE_TIME_BUCKETS[3]
}

function computeFavoriteWritingMoment(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { status: "unavailable", label: null }
  }

  const totals = FAVORITE_TIME_BUCKETS.reduce((acc, bucket) => {
    acc[bucket.id] = 0
    return acc
  }, {})

  let totalMs = 0

  for (const session of sessions) {
    const range = resolveSessionRange(session)
    if (!range) {
      continue
    }

    let cursor = range.start
    while (cursor < range.end) {
      const sliceDate = new Date(cursor)
      const bucket = getFavoriteBucketByHour(sliceDate.getHours())
      const bucketEnd = new Date(sliceDate)
      bucketEnd.setMinutes(0, 0, 0)
      bucketEnd.setHours(bucket.endHour, 0, 0, 0)
      const sliceEnd = Math.min(range.end, bucketEnd.getTime())
      const duration = sliceEnd - cursor
      if (duration > 0) {
        totals[bucket.id] += duration
        totalMs += duration
      }
      cursor = sliceEnd
    }
  }

  if (totalMs <= 0) {
    return { status: "unavailable", label: null }
  }

  if (totalMs < FAVORITE_TIME_MINUTES * 60000) {
    return { status: "insufficient", label: null }
  }

  const maxValue = Math.max(...FAVORITE_TIME_BUCKETS.map((bucket) => totals[bucket.id]))
  if (maxValue <= 0) {
    return { status: "unavailable", label: null }
  }

  const winners = FAVORITE_TIME_BUCKETS.filter(
    (bucket) => Math.abs(totals[bucket.id] - maxValue) <= FAVORITE_TIME_TIE_WINDOW_MS
  )
  if (winners.length !== 1) {
    return { status: "insufficient", label: null }
  }

  return { status: "ok", label: winners[0].label }
}

async function computeHomeStats() {
  const [chapters, sessions] = await Promise.all([
    idbGetAll("chapters"),
    listWritingSessions().catch(() => null)
  ])
  const now = Date.now()
  let totalWords = 0
  let earliest = null
  let hasAnyChapter = chapters.length > 0
  const timeStats = computeTimeStats(sessions, now)
  const favoriteMoment = computeFavoriteWritingMoment(sessions)

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
      timeSpent: timeStats.timeSpent,
      timePerDay: timeStats.timePerDay,
      favoriteTime: favoriteMoment.label,
      favoriteTimeStatus: favoriteMoment.status
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
    timeSpent: timeStats.timeSpent,
    timePerDay: timeStats.timePerDay,
    favoriteTime: favoriteMoment.label,
    favoriteTimeStatus: favoriteMoment.status
  }
}

function canTrackWritingSession() {
  return Boolean(state.selectedChapterId && state.writingNav === "chapter")
}

function scheduleWritingSessionIdle() {
  if (writingSessionIdleTimer) {
    clearTimeout(writingSessionIdleTimer)
  }
  writingSessionIdleTimer = window.setTimeout(() => {
    void finalizeWritingSession("idle")
  }, WRITING_SESSION_IDLE_MS)
}

function touchWritingSession() {
  if (!canTrackWritingSession()) {
    return
  }

  const now = Date.now()
  if (!activeWritingSession) {
    activeWritingSession = {
      projectId: state.selectedProjectId ?? null,
      chapterId: state.selectedChapterId ?? null,
      startedAt: now,
      lastActivityAt: now
    }
  } else if (activeWritingSession.chapterId !== state.selectedChapterId) {
    void finalizeWritingSession("chapter-switch")
    activeWritingSession = {
      projectId: state.selectedProjectId ?? null,
      chapterId: state.selectedChapterId ?? null,
      startedAt: now,
      lastActivityAt: now
    }
  } else {
    activeWritingSession.lastActivityAt = now
  }

  scheduleWritingSessionIdle()
}

async function finalizeWritingSession(reason) {
  if (!activeWritingSession) {
    return
  }

  const session = activeWritingSession
  activeWritingSession = null

  if (writingSessionIdleTimer) {
    clearTimeout(writingSessionIdleTimer)
    writingSessionIdleTimer = null
  }

  const endedAt = session.lastActivityAt ?? Date.now()
  if (!Number.isFinite(session.startedAt) || endedAt <= session.startedAt) {
    return
  }

  const durationMs = endedAt - session.startedAt
  try {
    await createWritingSession({
      project_id: session.projectId,
      chapter_id: session.chapterId,
      started_at: session.startedAt,
      ended_at: endedAt,
      duration_ms: durationMs
    })
    await computeHomeStats()
  } catch (error) {
    console.error("writing session save error", reason, error)
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

function normalizeKnowledgeTitle(value) {
  return normalizeText(String(value || "").trim()).replace(/\s+/g, " ")
}

function isWikiGraphView() {
  return state.writingNav === "knowledge" && state.knowledgeTab === "graph"
}

function getGraphDataset() {
  if (state.writingNav === "mindmap") {
    return "mindmap"
  }
  if (isWikiGraphView()) {
    return "wikiGraph"
  }
  return null
}

function getGraphNodes(dataset = getGraphDataset()) {
  if (dataset === "mindmap") {
    return state.mindmapNodes
  }
  if (dataset === "wikiGraph") {
    return state.wikiGraphNodes
  }
  return []
}

function setGraphNodes(nodes, dataset = getGraphDataset()) {
  if (dataset === "mindmap") {
    state.mindmapNodes = nodes
    return
  }
  if (dataset === "wikiGraph") {
    state.wikiGraphNodes = nodes
  }
}

function getGraphEdges(dataset = getGraphDataset()) {
  if (dataset === "mindmap") {
    return state.mindmapEdges
  }
  if (dataset === "wikiGraph") {
    return state.wikiGraphEdges
  }
  return []
}

function setGraphEdges(edges, dataset = getGraphDataset()) {
  if (dataset === "mindmap") {
    state.mindmapEdges = edges
    return
  }
  if (dataset === "wikiGraph") {
    state.wikiGraphEdges = edges
  }
}

function getGraphView(dataset = getGraphDataset()) {
  if (dataset === "mindmap") {
    return state.mindmapView
  }
  if (dataset === "wikiGraph") {
    return state.wikiGraphView
  }
  return { offsetX: 0, offsetY: 0, scale: 1 }
}

function setGraphView(nextView, dataset = getGraphDataset()) {
  if (dataset === "mindmap") {
    state.mindmapView = nextView
    return
  }
  if (dataset === "wikiGraph") {
    state.wikiGraphView = nextView
  }
}

function getGraphSelectedNodeId(dataset = getGraphDataset()) {
  if (dataset === "mindmap") {
    return state.mindmapSelectedNodeId
  }
  if (dataset === "wikiGraph") {
    return state.wikiGraphSelectedNodeId
  }
  return null
}

function setGraphSelectedNodeId(id, dataset = getGraphDataset()) {
  if (dataset === "mindmap") {
    state.mindmapSelectedNodeId = id
    return
  }
  if (dataset === "wikiGraph") {
    state.wikiGraphSelectedNodeId = id
  }
}

function setKnowledgeTitleError(message) {
  state.knowledgeTitleError = message || ""
  const errorEl = document.querySelector("#knowledge-title-error")
  if (errorEl) {
    errorEl.textContent = state.knowledgeTitleError
    errorEl.classList.toggle("is-visible", Boolean(state.knowledgeTitleError))
  }
  const input = document.querySelector("#knowledge-title")
  if (input instanceof HTMLInputElement) {
    if (state.knowledgeTitleError) {
      input.setAttribute("aria-invalid", "true")
    } else {
      input.removeAttribute("aria-invalid")
    }
  }
}

function setKnowledgeTitleDraft(id, value) {
  if (!id) {
    return
  }
  state.knowledgeTitleDrafts = {
    ...state.knowledgeTitleDrafts,
    [id]: value
  }
}

function clearKnowledgeTitleDraft(id) {
  if (!id) {
    return
  }
  const { [id]: _draft, ...nextDrafts } = state.knowledgeTitleDrafts
  const { [id]: _original, ...nextOriginals } = state.knowledgeTitleOriginals
  state.knowledgeTitleDrafts = nextDrafts
  state.knowledgeTitleOriginals = nextOriginals
}

function getKnowledgeNoteTitle(id) {
  const note = state.knowledgeNotes.find((item) => item.id === id)
  return note?.title ?? ""
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

function getActiveKnowledgeNote() {
  if (!state.knowledgeActiveId) {
    return null
  }
  return state.knowledgeNotes.find((note) => note.id === state.knowledgeActiveId) ?? null
}

function getFilteredKnowledgeNotes() {
  let items = [...state.knowledgeNotes]
  const query = state.knowledgeSearch.trim()
  if (query) {
    const needle = normalizeText(query)
    items = items.filter((note) =>
      normalizeText(note.title ?? "").includes(needle)
    )
  }
  if (state.knowledgeSort === "alpha") {
    items.sort((a, b) =>
      normalizeText(a.title ?? "").localeCompare(normalizeText(b.title ?? ""))
    )
    return items
  }
  items.sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0))
  return items
}

function getKnowledgeBacklinksForNote(note) {
  if (!note) {
    return []
  }
  const titleKey = normalizeKnowledgeTitle(note.title)
  if (!titleKey) {
    return []
  }
  const sourceIds = new Set(
    state.knowledgeLinks
      .filter((link) => link.to_title === titleKey)
      .map((link) => link.from_note_id)
  )
  const results = []
  for (const item of state.knowledgeNotes) {
    if (!sourceIds.has(item.id)) {
      continue
    }
    if (item.id === note.id) {
      continue
    }
    const contexts = findKnowledgeBacklinkContexts(item.content ?? "", titleKey)
    if (contexts.length) {
      results.push({
        id: item.id,
        title: item.title ?? "",
        updated_at: item.updated_at ?? 0,
        contexts
      })
    }
  }
  return results.sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0))
}

function getKnowledgeBacklinks() {
  return getKnowledgeBacklinksForNote(getActiveKnowledgeNote())
}

function extractKnowledgeLinks(content) {
  const links = new Set()
  if (!content) {
    return []
  }
  const regex = /\[\[([^\]\|]+)(?:\|[^\]]+)?\]\]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const raw = match[1] ?? ""
    const title = raw.trim()
    const normalized = normalizeKnowledgeTitle(title)
    if (normalized) {
      links.add(normalized)
    }
  }
  return Array.from(links)
}

function extractKnowledgeLinkCounts(content) {
  const counts = new Map()
  if (!content) {
    return counts
  }
  const regex = /\[\[([^\]\|]+)(?:\|[^\]]+)?\]\]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const raw = match[1] ?? ""
    const title = raw.trim()
    const normalized = normalizeKnowledgeTitle(title)
    if (!normalized) {
      continue
    }
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }
  return counts
}

function replaceKnowledgeLinks(content, oldTitle, newTitle) {
  if (!content) {
    return content
  }
  const oldKey = normalizeKnowledgeTitle(oldTitle)
  const newLabel = newTitle.trim()
  if (!oldKey || !newLabel) {
    return content
  }
  const regex = /\[\[([^\]\|]+)(\|[^\]]+)?\]\]/g
  return content.replace(regex, (full, title, alias) => {
    const normalized = normalizeKnowledgeTitle(title)
    if (normalized !== oldKey) {
      return full
    }
    const aliasPart = alias ?? ""
    return `[[${newLabel}${aliasPart}]]`
  })
}

function buildKnowledgeContextSnippet(content, start, end, radius = 60) {
  const sliceStart = Math.max(0, start - radius)
  const sliceEnd = Math.min(content.length, end + radius)
  let snippet = content.slice(sliceStart, sliceEnd)
  snippet = snippet.replace(/\s+/g, " ").trim()
  if (sliceStart > 0) {
    snippet = `...${snippet}`
  }
  if (sliceEnd < content.length) {
    snippet = `${snippet}...`
  }
  return snippet
}

function findKnowledgeBacklinkContexts(content, targetKey) {
  if (!content || !targetKey) {
    return []
  }
  const contexts = []
  const regex = /\[\[([^\]\|]+)(?:\|[^\]]+)?\]\]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const title = (match[1] ?? "").trim()
    if (normalizeKnowledgeTitle(title) !== targetKey) {
      continue
    }
    const snippet = buildKnowledgeContextSnippet(
      content,
      match.index,
      match.index + match[0].length
    )
    if (snippet) {
      contexts.push(snippet)
    }
    if (contexts.length >= 2) {
      break
    }
  }
  return contexts
}

function markWikiGraphDirty() {
  state.wikiGraphNeedsBuild = true
  state.wikiGraphLayoutReady = false
}

function buildWikiGraphData() {
  const notes = state.knowledgeNotes
  const noteByTitle = new Map()
  for (const note of notes) {
    const key = normalizeKnowledgeTitle(note.title)
    if (key) {
      noteByTitle.set(key, note)
    }
  }

  const nodes = notes.map((note) => ({
    id: note.id,
    title: note.title || "Sans titre",
    degree: 0,
    x: 0,
    y: 0
  }))
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  const edgeMap = new Map()
  for (const note of notes) {
    const counts = extractKnowledgeLinkCounts(note.content ?? "")
    for (const [targetKey, count] of counts.entries()) {
      const target = noteByTitle.get(targetKey)
      if (!target || target.id === note.id) {
        continue
      }
      const edgeId = `${note.id}::${target.id}`
      const existing = edgeMap.get(edgeId) ?? {
        id: edgeId,
        fromId: note.id,
        toId: target.id,
        count: 0
      }
      existing.count += count
      edgeMap.set(edgeId, existing)
    }
  }

  const edges = Array.from(edgeMap.values())
  for (const edge of edges) {
    const fromNode = nodeById.get(edge.fromId)
    const toNode = nodeById.get(edge.toId)
    if (fromNode) {
      fromNode.degree += 1
    }
    if (toNode) {
      toNode.degree += 1
    }
  }

  state.wikiGraphNodes = nodes
  state.wikiGraphEdges = edges
  state.wikiGraphNeedsBuild = false
  state.wikiGraphGuardMessage = ""
  state.wikiGraphView = { offsetX: 0, offsetY: 0, scale: WIKI_GRAPH_DEFAULT_SCALE }
  layoutWikiGraphNodes(nodes, edges)
  state.wikiGraphLayoutReady = true

  if (state.wikiGraphSelectedNodeId && !nodeById.has(state.wikiGraphSelectedNodeId)) {
    state.wikiGraphSelectedNodeId = null
  }
}

function layoutWikiGraphNodes(nodes, edges) {
  const count = nodes.length
  if (!count) {
    return
  }
  const width = 1400
  const height = 900
  const centerX = width / 2
  const centerY = height / 2

  if (count > WIKI_GRAPH_LAYOUT_LIMIT) {
    const cols = Math.ceil(Math.sqrt(count))
    const spacing = 260
    nodes.forEach((node, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      node.x = col * spacing + 40
      node.y = row * spacing + 40
    })
    return
  }

  const radius = Math.min(width, height) * 0.42
  nodes.forEach((node, index) => {
    const angle = (index / count) * Math.PI * 2
    node.x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 40
    node.y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 40
  })

  const indexById = new Map(nodes.map((node, index) => [node.id, index]))
  const links = edges
    .map((edge) => ({
      from: indexById.get(edge.fromId),
      to: indexById.get(edge.toId)
    }))
    .filter((link) => Number.isFinite(link.from) && Number.isFinite(link.to))

  const iterations = count <= 120 ? 320 : count <= 220 ? 240 : 180
  const repulsion = 12000
  const spring = 0.035
  const damping = 0.85
  const targetLen = 240

  const vx = new Array(count).fill(0)
  const vy = new Array(count).fill(0)

  for (let iter = 0; iter < iterations; iter += 1) {
    const fx = new Array(count).fill(0)
    const fy = new Array(count).fill(0)
    for (let i = 0; i < count; i += 1) {
      for (let j = i + 1; j < count; j += 1) {
        const dx = nodes[j].x - nodes[i].x
        const dy = nodes[j].y - nodes[i].y
        const dist = Math.hypot(dx, dy) || 1
        if (dist > 560) {
          continue
        }
        const force = repulsion / (dist * dist)
        const fxVal = (force * dx) / dist
        const fyVal = (force * dy) / dist
        fx[i] -= fxVal
        fy[i] -= fyVal
        fx[j] += fxVal
        fy[j] += fyVal
      }
    }

    for (const link of links) {
      const i = link.from
      const j = link.to
      const dx = nodes[j].x - nodes[i].x
      const dy = nodes[j].y - nodes[i].y
      const dist = Math.hypot(dx, dy) || 1
      const force = (dist - targetLen) * spring
      const fxVal = (force * dx) / dist
      const fyVal = (force * dy) / dist
      fx[i] += fxVal
      fy[i] += fyVal
      fx[j] -= fxVal
      fy[j] -= fyVal
    }

    let totalMove = 0
    for (let i = 0; i < count; i += 1) {
      vx[i] = (vx[i] + fx[i]) * damping
      vy[i] = (vy[i] + fy[i]) * damping
      nodes[i].x += vx[i]
      nodes[i].y += vy[i]
      totalMove += Math.hypot(vx[i], vy[i])
    }
    if (totalMove / count < 0.2) {
      break
    }
  }
}

function ensureWikiGraphData() {
  if (!state.wikiGraphNeedsBuild && state.wikiGraphLayoutReady) {
    return
  }
  buildWikiGraphData()
}

function getFilteredWikiGraph() {
  const allNodes = state.wikiGraphNodes
  const search = state.wikiGraphSearch.trim()
  const minDegree = Number(state.wikiGraphMinDegree) || 0
  const showOrphans = state.wikiGraphShowOrphans

  let nodes = allNodes
  if (search) {
    const needle = normalizeText(search)
    nodes = nodes.filter((node) => normalizeText(node.title).includes(needle))
  }
  if (!showOrphans) {
    nodes = nodes.filter((node) => node.degree > 0)
  }
  if (minDegree > 0) {
    nodes = nodes.filter((node) => node.degree >= minDegree)
  }
  if (nodes.length > WIKI_GRAPH_MAX_RENDER_NODES) {
    state.wikiGraphSelectedNodeId = null
    return {
      nodes: [],
      edges: [],
      visibleIds: new Set(),
      blockedMessage:
        "Le graphe est volumineux. Ajoute un filtre (recherche ou min connexions) pour l'afficher."
    }
  }

  const visibleIds = new Set(nodes.map((node) => node.id))
  const edges = state.wikiGraphEdges.filter(
    (edge) => visibleIds.has(edge.fromId) && visibleIds.has(edge.toId)
  )

  if (state.wikiGraphSelectedNodeId && !visibleIds.has(state.wikiGraphSelectedNodeId)) {
    state.wikiGraphSelectedNodeId = null
  }

  return {
    nodes,
    edges,
    visibleIds,
    blockedMessage: ""
  }
}

function getWikiGraphDetails() {
  const selectedId = state.wikiGraphSelectedNodeId
  if (!selectedId) {
    return { note: null, outgoing: [], backlinks: [] }
  }
  const note = state.knowledgeNotes.find((item) => item.id === selectedId)
  if (!note) {
    return { note: null, outgoing: [], backlinks: [] }
  }

  const noteByTitle = new Map()
  for (const item of state.knowledgeNotes) {
    const key = normalizeKnowledgeTitle(item.title)
    if (key) {
      noteByTitle.set(key, item)
    }
  }

  const outgoing = []
  const counts = extractKnowledgeLinkCounts(note.content ?? "")
  for (const [targetKey, count] of counts.entries()) {
    const target = noteByTitle.get(targetKey)
    if (!target || target.id === note.id) {
      continue
    }
    outgoing.push({
      id: target.id,
      title: target.title || "Sans titre",
      count
    })
  }
  outgoing.sort((a, b) => (a.title || "").localeCompare(b.title || ""))

  const backlinks = getKnowledgeBacklinksForNote(note)

  return {
    note,
    outgoing,
    backlinks
  }
}

function getWikiGraphRenderData() {
  const { nodes, edges, blockedMessage } = getFilteredWikiGraph()
  return {
    nodes,
    edges,
    blockedMessage,
    selectedNodeId: state.wikiGraphSelectedNodeId,
    view: state.wikiGraphView,
    search: state.wikiGraphSearch,
    minDegree: state.wikiGraphMinDegree,
    showOrphans: state.wikiGraphShowOrphans,
    panelCollapsed: state.wikiGraphPanelCollapsed,
    settingsOpen: state.wikiGraphSettingsOpen
  }
}

function updateKnowledgeNoteState(id, patch) {
  if (!id) {
    return
  }
  state.knowledgeNotes = state.knowledgeNotes.map((note) =>
    note.id === id ? { ...note, ...patch } : note
  )
}

function updateKnowledgeListItemTitle(id, title) {
  const item = document.querySelector(
    `.knowledge-note-item[data-id="${id}"] .knowledge-note-title`
  )
  if (item) {
    item.textContent = title?.trim() || "Sans titre"
  }
}

function refreshKnowledgeDuplicates() {
  const groups = new Map()
  for (const note of state.knowledgeNotes) {
    const key = normalizeKnowledgeTitle(note.title)
    if (!key) {
      continue
    }
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(note)
  }
  const duplicates = []
  for (const [key, notes] of groups.entries()) {
    if (notes.length > 1) {
      duplicates.push({
        key,
        title: notes[0]?.title ?? "",
        notes
      })
    }
  }
  state.knowledgeDuplicates = duplicates
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

function queueKnowledgePatch(id, patch, delay = 600) {
  if (!id) {
    return
  }
  const existing = knowledgePendingPatches.get(id) ?? {}
  knowledgePendingPatches.set(id, { ...existing, ...patch })
  if (knowledgeSaveTimers.has(id)) {
    clearTimeout(knowledgeSaveTimers.get(id))
  }
  const timer = window.setTimeout(() => {
    flushKnowledgePatch(id)
  }, delay)
  knowledgeSaveTimers.set(id, timer)
}

function isKnowledgeTitleDuplicate(id, title) {
  const key = normalizeKnowledgeTitle(title)
  if (!key) {
    return false
  }
  return state.knowledgeNotes.some(
    (note) => note.id !== id && normalizeKnowledgeTitle(note.title) === key
  )
}

async function applyKnowledgePatch(id, patch, { render = false } = {}) {
  if (!id) {
    return
  }
  const nextPatch = { ...patch }
  const updated = await updateKnowledgeNote(id, nextPatch)
  if (updated) {
    state.knowledgeNotes = state.knowledgeNotes.map((note) =>
      note.id === id ? updated : note
    )
    if (Object.prototype.hasOwnProperty.call(nextPatch, "content")) {
      const links = extractKnowledgeLinks(updated.content ?? "")
      await replaceKnowledgeLinksForNote(id, updated.project_id, links)
      state.knowledgeLinks = await listKnowledgeLinks(updated.project_id)
      markWikiGraphDirty()
    }
  } else if (state.knowledgeProjectId) {
    state.knowledgeNotes = await listKnowledgeNotes(state.knowledgeProjectId)
    state.knowledgeLinks = await listKnowledgeLinks(state.knowledgeProjectId)
  }
  if (render) {
    renderAppUI()
  }
}

async function flushKnowledgePatch(id, { render = false } = {}) {
  const patch = knowledgePendingPatches.get(id)
  if (!patch) {
    return
  }
  knowledgePendingPatches.delete(id)
  if (knowledgeSaveTimers.has(id)) {
    clearTimeout(knowledgeSaveTimers.get(id))
    knowledgeSaveTimers.delete(id)
  }
  await applyKnowledgePatch(id, patch, { render })
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

function getUniqueKnowledgeTitle(baseTitle) {
  const base = baseTitle.trim() || "Nouvelle note"
  const existing = new Set(
    state.knowledgeNotes.map((note) => normalizeKnowledgeTitle(note.title))
  )
  let title = base
  let index = 2
  while (existing.has(normalizeKnowledgeTitle(title))) {
    title = `${base} ${index}`
    index += 1
  }
  return title
}

function getUniqueKnowledgeTitleWithSuffix(baseTitle) {
  const trimmed = baseTitle.trim() || "Note"
  const match = trimmed.match(/^(.*?)(?:\s*\((\d+)\))?$/)
  const stem = (match?.[1] ?? trimmed).trim() || trimmed
  const existing = new Set(
    state.knowledgeNotes.map((note) => normalizeKnowledgeTitle(note.title))
  )
  let index = 2
  let candidate = `${stem} (${index})`
  while (existing.has(normalizeKnowledgeTitle(candidate))) {
    index += 1
    candidate = `${stem} (${index})`
  }
  return candidate
}

function findKnowledgeNoteByTitle(title) {
  const key = normalizeKnowledgeTitle(title)
  if (!key) {
    return null
  }
  return state.knowledgeNotes.find(
    (note) => normalizeKnowledgeTitle(note.title) === key
  )
}

function syncKnowledgeDraftFromDom() {
  const active = getActiveKnowledgeNote()
  if (!active) {
    return
  }
  const titleInput = document.querySelector("#knowledge-title")
  const contentInput = document.querySelector("#knowledge-content")
  const patch = {}
  if (titleInput instanceof HTMLInputElement) {
    setKnowledgeTitleDraft(active.id, titleInput.value)
  }
  if (contentInput instanceof HTMLTextAreaElement) {
    patch.content = contentInput.value
  }
  if (Object.keys(patch).length) {
    updateKnowledgeNoteState(active.id, patch)
  }
}

function closeKnowledgeAutocomplete() {
  if (!state.knowledgeAutocomplete.open) {
    return
  }
  state.knowledgeAutocomplete = {
    open: false,
    query: "",
    matches: [],
    range: null,
    createTitle: ""
  }
  renderKnowledgeAutocomplete()
}

function getKnowledgeAutocompleteRange(content, caret) {
  if (!Number.isFinite(caret)) {
    return null
  }
  const before = content.slice(0, caret)
  const openIndex = before.lastIndexOf("[[")
  if (openIndex === -1) {
    return null
  }
  const closeIndex = before.lastIndexOf("]]")
  if (closeIndex > openIndex) {
    return null
  }
  const query = before.slice(openIndex + 2)
  if (query.includes("\n")) {
    return null
  }
  return { query, start: openIndex + 2, end: caret }
}

function updateKnowledgeAutocomplete(target) {
  if (!(target instanceof HTMLTextAreaElement)) {
    return
  }
  if (state.writingNav !== "knowledge" || state.knowledgePreviewOpen) {
    closeKnowledgeAutocomplete()
    return
  }
  const result = getKnowledgeAutocompleteRange(target.value, target.selectionStart)
  if (!result) {
    closeKnowledgeAutocomplete()
    return
  }
  const query = result.query
  const trimmedQuery = query.trim()
  let matches = state.knowledgeNotes.map((note) => note.title).filter(Boolean)
  if (trimmedQuery) {
    const needle = normalizeKnowledgeTitle(trimmedQuery)
    matches = matches.filter((title) =>
      normalizeKnowledgeTitle(title).includes(needle)
    )
  }
  matches = matches.slice(0, 6)
  const exactMatch = trimmedQuery
    ? matches.some(
        (title) => normalizeKnowledgeTitle(title) === normalizeKnowledgeTitle(trimmedQuery)
      )
    : false
  const createTitle = trimmedQuery && !exactMatch ? trimmedQuery : ""
  if (!matches.length && !createTitle) {
    closeKnowledgeAutocomplete()
    return
  }
  state.knowledgeAutocomplete = {
    open: true,
    query,
    matches,
    range: result,
    createTitle
  }
  renderKnowledgeAutocomplete()
}

function renderKnowledgeAutocomplete() {
  const container = document.querySelector("#knowledge-autocomplete")
  if (!container) {
    return
  }
  container.replaceChildren()
  if (!state.knowledgeAutocomplete.open) {
    container.classList.remove("is-open")
    return
  }
  container.classList.add("is-open")
  const { matches, createTitle } = state.knowledgeAutocomplete
  const fragment = document.createDocumentFragment()
  for (const title of matches) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "knowledge-autocomplete-item"
    button.dataset.action = "knowledge-autocomplete-select"
    button.dataset.title = encodeURIComponent(title)
    button.textContent = title
    fragment.appendChild(button)
  }
  if (createTitle) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "knowledge-autocomplete-item is-create"
    button.dataset.action = "knowledge-autocomplete-select"
    button.dataset.title = encodeURIComponent(createTitle)
    button.dataset.create = "true"
    button.textContent = `Creer : ${createTitle}`
    fragment.appendChild(button)
  }
  container.appendChild(fragment)
}

async function handleKnowledgeCreate(title = "") {
  if (!state.knowledgeProjectId) {
    return
  }
  if (state.knowledgeActiveId) {
    syncKnowledgeDraftFromDom()
    await commitKnowledgeTitle(state.knowledgeActiveId, { reason: "blur" })
    await flushKnowledgePatch(state.knowledgeActiveId, { render: false })
  }
  const baseTitle = String(title || "Nouvelle note").trim() || "Nouvelle note"
  const existing = findKnowledgeNoteByTitle(baseTitle)
  if (existing) {
    await handleKnowledgeSelect(existing.id)
    return
  }
  const created = await createKnowledgeNote(state.knowledgeProjectId, baseTitle)
  state.knowledgeNotes = await listKnowledgeNotes(state.knowledgeProjectId)
  state.knowledgeLinks = await listKnowledgeLinks(state.knowledgeProjectId)
  markWikiGraphDirty()
  refreshKnowledgeDuplicates()
  if (created?.id) {
    state.knowledgeActiveId = created.id
    state.wikiGraphSelectedNodeId = created.id
  }
  state.knowledgePreviewOpen = false
  closeKnowledgeAutocomplete()
  renderAppUI()
}

async function handleKnowledgeSelect(id) {
  if (!id || id === state.knowledgeActiveId) {
    return
  }
  const activeId = state.knowledgeActiveId
  if (activeId) {
    syncKnowledgeDraftFromDom()
    await commitKnowledgeTitle(activeId, { reason: "blur" })
    await flushKnowledgePatch(activeId, { render: false })
  }
  state.knowledgeActiveId = id
  state.wikiGraphSelectedNodeId = id
  state.knowledgePreviewOpen = false
  closeKnowledgeAutocomplete()
  renderAppUI()
}

async function handleKnowledgeDelete(id) {
  if (!id) {
    return
  }
  const confirmed = window.confirm("Supprimer cette note ?")
  if (!confirmed) {
    return
  }
  knowledgePendingPatches.delete(id)
  if (knowledgeSaveTimers.has(id)) {
    clearTimeout(knowledgeSaveTimers.get(id))
    knowledgeSaveTimers.delete(id)
  }
  await deleteKnowledgeNote(id)
  if (state.knowledgeProjectId) {
    state.knowledgeNotes = await listKnowledgeNotes(state.knowledgeProjectId)
    state.knowledgeLinks = await listKnowledgeLinks(state.knowledgeProjectId)
  } else {
    state.knowledgeNotes = []
    state.knowledgeLinks = []
  }
  markWikiGraphDirty()
  refreshKnowledgeDuplicates()
  if (state.knowledgeActiveId === id) {
    state.knowledgeActiveId = state.knowledgeNotes[0]?.id ?? null
    state.wikiGraphSelectedNodeId = state.knowledgeActiveId
  }
  state.knowledgePreviewOpen = false
  closeKnowledgeAutocomplete()
  renderAppUI()
}

async function handleKnowledgeOpenLink(rawTitle) {
  const title = String(rawTitle ?? "").trim()
  if (!title) {
    return
  }
  const existing = findKnowledgeNoteByTitle(title)
  if (existing) {
    await handleKnowledgeSelect(existing.id)
    return
  }
  await handleKnowledgeCreate(title)
}

async function handleEditorWikiLinkOpen(rawTitle) {
  const projectId = state.selectedProjectId
  if (!projectId) {
    return
  }
  const title = String(rawTitle ?? "").trim()
  if (!title) {
    return
  }
  const key = normalizeKnowledgeTitle(title)
  if (!key) {
    return
  }

  state.knowledgeProjectId = projectId
  state.knowledgeNotes = await listKnowledgeNotes(projectId)
  state.knowledgeLinks = await listKnowledgeLinks(projectId)
  markWikiGraphDirty()
  refreshKnowledgeDuplicates()

  let target = findKnowledgeNoteByTitle(title)
  if (!target) {
    const created = await createKnowledgeNote(projectId, title)
    if (created) {
      state.knowledgeNotes = await listKnowledgeNotes(projectId)
      state.knowledgeLinks = await listKnowledgeLinks(projectId)
      markWikiGraphDirty()
      refreshKnowledgeDuplicates()
      target = created
    }
  }
  if (!target) {
    return
  }

  state.knowledgeActiveId = target.id
  state.wikiGraphSelectedNodeId = target.id
  state.knowledgeTab = "notes"
  state.knowledgePreviewOpen = false
  closeKnowledgeAutocomplete()

  if (state.writingNav !== "knowledge") {
    window.location.hash = `#/project/${projectId}/knowledge`
    return
  }
  renderAppUI()
}

function findWikiLinkAtCaret(content, caret) {
  if (typeof content !== "string" || !Number.isFinite(caret)) {
    return null
  }
  if (!content.includes("[[")) {
    return null
  }
  const regex = /\[\[([^\]]+)\]\]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const start = match.index
    const end = start + match[0].length
    if (caret < start || caret > end) {
      continue
    }
    const raw = match[1] ?? ""
    if (raw.includes("\n")) {
      continue
    }
    const pipeIndex = raw.indexOf("|")
    const title = (pipeIndex === -1 ? raw : raw.slice(0, pipeIndex)).trim()
    if (!title) {
      return null
    }
    return { title, start, end }
  }
  return null
}

function isWikiLinkEditableField(target) {
  if (target instanceof HTMLTextAreaElement) {
    return true
  }
  if (target instanceof HTMLInputElement) {
    const type = (target.type || "text").toLowerCase()
    return type === "text" || type === "search"
  }
  return false
}

function isWikiLinkContext(target) {
  if (target.closest(".knowledge-editor")) {
    return target.id !== "knowledge-title"
  }
  if (target.closest(".character-detail-panel")) {
    return true
  }
  if (target.id === "ideas-create-input") {
    return true
  }
  if (
    target.classList.contains("ideas-detail-input") ||
    target.classList.contains("ideas-note-input")
  ) {
    return true
  }
  return false
}

async function handleWikiLinkOpen(rawTitle) {
  const title = String(rawTitle ?? "").trim()
  if (!title) {
    return
  }
  const key = normalizeKnowledgeTitle(title)
  if (!key) {
    return
  }
  if (wikiLinkOpenRequests.has(key)) {
    return wikiLinkOpenRequests.get(key)
  }
  const task = (async () => {
    if (state.writingNav === "knowledge") {
      await handleKnowledgeOpenLink(title)
      return
    }
    await handleEditorWikiLinkOpen(title)
  })().finally(() => {
    wikiLinkOpenRequests.delete(key)
  })
  wikiLinkOpenRequests.set(key, task)
  return task
}

function getGraphTooltip() {
  return document.querySelector("#graph-tooltip")
}

function getGraphTooltipBounds() {
  const canvas =
    document.querySelector(".knowledge-graph-canvas") ||
    document.querySelector(".wiki-graph-canvas")
  if (!canvas) {
    return {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight
    }
  }
  return canvas.getBoundingClientRect()
}

function getTooltipOrigin(tooltip) {
  let current = tooltip.parentElement
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    if (
      style.transform !== "none" ||
      style.perspective !== "none" ||
      style.filter !== "none"
    ) {
      const rect = current.getBoundingClientRect()
      return { left: rect.left, top: rect.top }
    }
    current = current.parentElement
  }
  return { left: 0, top: 0 }
}

function positionGraphTooltipNearNode(tooltip, node) {
  const nodeRect = node.getBoundingClientRect()
  const bounds = getGraphTooltipBounds()
  const origin = getTooltipOrigin(tooltip)
  const offset = 8
  const margin = 6
  const width = tooltip.offsetWidth || 0
  const height = tooltip.offsetHeight || 0

  const boundsLeft = bounds.left - origin.left
  const boundsTop = bounds.top - origin.top
  const boundsRight = bounds.right - origin.left
  const boundsBottom = bounds.bottom - origin.top

  let left = nodeRect.right - origin.left + offset
  let top = nodeRect.top - origin.top + (nodeRect.height - height) / 2

  if (left + width + margin > boundsRight) {
    left = nodeRect.left - origin.left - width - offset
  }
  if (left < boundsLeft + margin) {
    left = boundsLeft + margin
  }
  if (top < boundsTop + margin) {
    top = boundsTop + margin
  }
  if (top + height + margin > boundsBottom) {
    top = boundsBottom - height - margin
  }

  tooltip.style.left = `${left}px`
  tooltip.style.top = `${top}px`
}

function showGraphTooltip(node, event) {
  const tooltip = getGraphTooltip()
  if (!tooltip) {
    return
  }
  const raw = node.dataset.title || ""
  const title = raw ? decodeURIComponent(raw) : node.getAttribute("aria-label") || ""
  if (!title) {
    return
  }
  tooltip.textContent = title
  tooltip.setAttribute("aria-hidden", "false")
  tooltip.classList.add("is-visible")
  positionGraphTooltipNearNode(tooltip, node)
}

function hideGraphTooltip() {
  const tooltip = getGraphTooltip()
  if (!tooltip) {
    return
  }
  tooltip.classList.remove("is-visible")
  tooltip.setAttribute("aria-hidden", "true")
}

function handleKnowledgeSortToggle() {
  state.knowledgeSort = state.knowledgeSort === "alpha" ? "recent" : "alpha"
  renderAppUI()
}

async function handleKnowledgeTabChange(tab) {
  if (!tab || tab === state.knowledgeTab) {
    return
  }
  if (state.knowledgeTab === "notes" && state.knowledgeActiveId) {
    syncKnowledgeDraftFromDom()
    await commitKnowledgeTitle(state.knowledgeActiveId, { reason: "blur" })
    await flushKnowledgePatch(state.knowledgeActiveId, { render: false })
  }
  state.knowledgeTab = tab
  if (tab === "graph") {
    closeKnowledgeAutocomplete()
    state.knowledgePreviewOpen = false
    ensureWikiGraphData()
    if (!state.wikiGraphSelectedNodeId && state.knowledgeActiveId) {
      state.wikiGraphSelectedNodeId = state.knowledgeActiveId
    }
  }
  renderAppUI()
}

function handleKnowledgePreviewToggle() {
  syncKnowledgeDraftFromDom()
  state.knowledgePreviewOpen = !state.knowledgePreviewOpen
  closeKnowledgeAutocomplete()
  renderAppUI()
}

function handleKnowledgeAutocompleteSelect(rawTitle) {
  const active = getActiveKnowledgeNote()
  if (!active) {
    return
  }
  const textarea = document.querySelector("#knowledge-content")
  if (!(textarea instanceof HTMLTextAreaElement)) {
    return
  }
  const range = state.knowledgeAutocomplete.range
  if (!range) {
    return
  }
  const title = String(rawTitle ?? "").trim()
  if (!title) {
    return
  }
  const before = textarea.value.slice(0, range.start)
  const after = textarea.value.slice(range.end)
  const hasClosing = after.startsWith("]]")
  const closing = hasClosing ? "" : "]]"
  const nextContent = `${before}${title}${closing}${after}`
  textarea.value = nextContent
  const caret = before.length + title.length + closing.length
  textarea.setSelectionRange(caret, caret)
  updateKnowledgeNoteState(active.id, { content: nextContent })
  queueKnowledgePatch(active.id, { content: nextContent })
  closeKnowledgeAutocomplete()
  textarea.focus()
}

function handleWikiGraphSelectNode(id) {
  if (!id) {
    return
  }
  state.wikiGraphSelectedNodeId = id
  renderAppUI()
}

function handleWikiGraphResetView() {
  state.wikiGraphView = { offsetX: 0, offsetY: 0, scale: WIKI_GRAPH_DEFAULT_SCALE }
  renderAppUI()
}

async function handleWikiGraphOpenNote(id) {
  if (!id) {
    return
  }
  state.knowledgeTab = "notes"
  await handleKnowledgeSelect(id)
}

function restoreKnowledgeTitleEdit(id, originalTitle) {
  const input = document.querySelector("#knowledge-title")
  if (input instanceof HTMLInputElement && input.dataset.id === id) {
    input.value = originalTitle
  }
  updateKnowledgeListItemTitle(id, originalTitle)
  clearKnowledgeTitleDraft(id)
  setKnowledgeTitleError("")
}

async function updateKnowledgeLinksForRename({ projectId, oldTitle, newTitle }) {
  const notes = [...state.knowledgeNotes]
  for (const note of notes) {
    const content = note.content ?? ""
    const updatedContent = replaceKnowledgeLinks(content, oldTitle, newTitle)
    if (updatedContent === content) {
      continue
    }
    const updatedNote = await updateKnowledgeNote(note.id, { content: updatedContent })
    if (updatedNote) {
      state.knowledgeNotes = state.knowledgeNotes.map((item) =>
        item.id === note.id ? updatedNote : item
      )
      const links = extractKnowledgeLinks(updatedNote.content ?? "")
      await replaceKnowledgeLinksForNote(note.id, projectId, links)
    }
  }
  state.knowledgeLinks = await listKnowledgeLinks(projectId)
}

async function applyKnowledgeRename({ id, oldTitle, newTitle }) {
  const note = state.knowledgeNotes.find((item) => item.id === id)
  if (!note) {
    return
  }
  const projectId = note.project_id
  const totalNotes = state.knowledgeNotes.length
  if (AUTO_UPDATE_WIKI_LINKS_ON_RENAME && totalNotes > 200) {
    state.knowledgeRenameBusy = true
    renderAppUI()
  }

  const updated = await updateKnowledgeNote(id, { title: newTitle })
  if (updated) {
    state.knowledgeNotes = state.knowledgeNotes.map((item) =>
      item.id === id ? updated : item
    )
  }

  if (AUTO_UPDATE_WIKI_LINKS_ON_RENAME && oldTitle.trim() !== newTitle.trim()) {
    await updateKnowledgeLinksForRename({ projectId, oldTitle, newTitle })
  }

  state.knowledgeRenameBusy = false
  markWikiGraphDirty()
  refreshKnowledgeDuplicates()
}

async function commitKnowledgeTitle(id, { reason = "blur" } = {}) {
  if (!id) {
    return
  }
  const draft = state.knowledgeTitleDrafts[id]
  if (draft === undefined) {
    return
  }
  const original = state.knowledgeTitleOriginals[id] ?? getKnowledgeNoteTitle(id)
  const nextTitle = String(draft ?? "").trim()

  if (!nextTitle) {
    setKnowledgeTitleError("Le titre ne peut pas etre vide.")
    return
  }

  if (isKnowledgeTitleDuplicate(id, nextTitle)) {
    setKnowledgeTitleError("Ce titre existe deja dans ce projet.")
    return
  }

  setKnowledgeTitleError("")

  if (nextTitle === original.trim()) {
    clearKnowledgeTitleDraft(id)
    updateKnowledgeListItemTitle(id, nextTitle)
    return
  }

  await applyKnowledgeRename({ id, oldTitle: original, newTitle: nextTitle })
  clearKnowledgeTitleDraft(id)
  updateKnowledgeListItemTitle(id, nextTitle)
  renderAppUI()
}

async function handleKnowledgeDuplicateRename(id) {
  if (!id) {
    return
  }
  const note = state.knowledgeNotes.find((item) => item.id === id)
  if (!note) {
    return
  }
  const baseTitle = note.title?.trim() || "Note"
  const uniqueTitle = getUniqueKnowledgeTitleWithSuffix(baseTitle)
  await applyKnowledgeRename({ id, oldTitle: baseTitle, newTitle: uniqueTitle })
  renderAppUI()
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

async function handleMindmapUpdateNode(id, patch, { render = true } = {}) {
  const updated = await updateMindmapNode(id, patch)
  if (!updated) {
    return
  }
  state.mindmapNodes = state.mindmapNodes.map((node) =>
    node.id === id ? updated : node
  )
  if (render) {
    renderAppUI()
  }
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
  state.mindmapDeleteConfirmId = null
  renderAppUI()
}

function handleMindmapResetView() {
  state.mindmapView = { offsetX: 0, offsetY: 0, scale: 1 }
  renderAppUI()
}

function getGraphEdgeIntersection(rect, fromPoint, toPoint) {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const dx = toPoint.x - fromPoint.x
  const dy = toPoint.y - fromPoint.y
  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy }
  }
  const halfW = rect.width / 2
  const halfH = rect.height / 2
  const scale = Math.min(
    halfW / Math.max(Math.abs(dx), 1e-6),
    halfH / Math.max(Math.abs(dy), 1e-6)
  )
  return {
    x: cx + dx * scale,
    y: cy + dy * scale
  }
}

function updateWikiGraphViewportDom() {
  const viewport = document.querySelector(".wiki-graph-viewport")
  if (!viewport) {
    return
  }
  const view = state.wikiGraphView
  viewport.style.transform = `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.scale})`
}

function scheduleWikiGraphViewUpdate() {
  if (wikiGraphViewFrame) {
    return
  }
  wikiGraphViewFrame = window.requestAnimationFrame(() => {
    wikiGraphViewFrame = null
    updateWikiGraphViewportDom()
  })
}

function updateWikiGraphNodeDom(nodeId) {
  const node = state.wikiGraphNodes.find((item) => item.id === nodeId)
  if (!node) {
    return
  }
  const nodeEl = document.querySelector(`.graph-node[data-id="${nodeId}"]`)
  if (nodeEl) {
    nodeEl.style.transform = `translate(${node.x}px, ${node.y}px)`
  }
}

function updateWikiGraphEdgesDom(nodeId) {
  const edges = state.wikiGraphEdges.filter(
    (edge) => edge.fromId === nodeId || edge.toId === nodeId
  )
  for (const edge of edges) {
    const fromNode = state.wikiGraphNodes.find((item) => item.id === edge.fromId)
    const toNode = state.wikiGraphNodes.find((item) => item.id === edge.toId)
    if (!fromNode || !toNode) {
      continue
    }
    const fromEl = document.querySelector(`.graph-node[data-id="${edge.fromId}"]`)
    const toEl = document.querySelector(`.graph-node[data-id="${edge.toId}"]`)
    const fromWidth = fromEl?.offsetWidth || 0
    const fromHeight = fromEl?.offsetHeight || 0
    const toWidth = toEl?.offsetWidth || 0
    const toHeight = toEl?.offsetHeight || 0
    const fromRect = {
      x: fromNode.x,
      y: fromNode.y,
      width: fromWidth || MINDMAP_NODE_WIDTH,
      height: fromHeight || MINDMAP_NODE_HEIGHT
    }
    const toRect = {
      x: toNode.x,
      y: toNode.y,
      width: toWidth || MINDMAP_NODE_WIDTH,
      height: toHeight || MINDMAP_NODE_HEIGHT
    }
    const fromCenter = {
      x: fromRect.x + fromRect.width / 2,
      y: fromRect.y + fromRect.height / 2
    }
    const toCenter = {
      x: toRect.x + toRect.width / 2,
      y: toRect.y + toRect.height / 2
    }
    const start = getGraphEdgeIntersection(fromRect, fromCenter, toCenter)
    const end = getGraphEdgeIntersection(toRect, toCenter, fromCenter)
    const line = document.querySelector(
      `.graph-edge[data-from="${edge.fromId}"][data-to="${edge.toId}"]`
    )
    if (line) {
      line.setAttribute("x1", start.x)
      line.setAttribute("y1", start.y)
      line.setAttribute("x2", end.x)
      line.setAttribute("y2", end.y)
    }
  }
}

function scheduleWikiGraphDragUpdate(nodeId) {
  if (wikiGraphDragFrame) {
    return
  }
  wikiGraphDragFrame = window.requestAnimationFrame(() => {
    wikiGraphDragFrame = null
    updateWikiGraphNodeDom(nodeId)
    updateWikiGraphEdgesDom(nodeId)
  })
}

function updateMindmapNodeState(id, patch) {
  if (!id) {
    return null
  }
  let updatedNode = null
  state.mindmapNodes = state.mindmapNodes.map((node) => {
    if (node.id !== id) {
      return node
    }
    updatedNode = { ...node, ...patch }
    return updatedNode
  })
  return updatedNode
}

function updateMindmapNodeTitlePreview(id, title) {
  const nodeEl = document.querySelector(`.mindmap-node[data-id="${id}"]`)
  const titleEl = nodeEl?.querySelector(".mindmap-node-title")
  if (titleEl) {
    titleEl.textContent = title || "Sans titre"
  }
}

async function flushMindmapUpdates() {
  if (mindmapUpdateTimer) {
    clearTimeout(mindmapUpdateTimer)
    mindmapUpdateTimer = null
  }
  const entries = Array.from(mindmapUpdateQueue.entries())
  mindmapUpdateQueue.clear()
  for (const [id, patch] of entries) {
    await handleMindmapUpdateNode(id, patch, { render: false })
  }
}

function queueMindmapUpdate(id, patch) {
  if (!id) {
    return
  }
  const current = mindmapUpdateQueue.get(id) ?? {}
  mindmapUpdateQueue.set(id, { ...current, ...patch })
  if (mindmapUpdateTimer) {
    clearTimeout(mindmapUpdateTimer)
  }
  mindmapUpdateTimer = setTimeout(() => {
    flushMindmapUpdates()
  }, MINDMAP_UPDATE_DEBOUNCE_MS)
}

function getMindmapCoordsFromCanvasPoint(point) {
  return {
    x:
      (point.x - state.mindmapView.offsetX) / state.mindmapView.scale -
      MINDMAP_NODE_WIDTH / 2,
    y:
      (point.y - state.mindmapView.offsetY) / state.mindmapView.scale -
      MINDMAP_NODE_HEIGHT / 2
  }
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
    const hash = window.location.hash
    if (hash.startsWith("#/project/") || hash.startsWith("#/editor")) {
      const projectId =
        state.selectedProjectId ?? hash.replace("#/project/", "").split("/")[0]
      if (projectId) {
        await loadEditorView(projectId)
      } else {
        await loadLocalProjects({ allowFallback: false })
        renderCurrentUI()
      }
    } else if (hash.startsWith("#/projects")) {
      await loadProjectsView()
    } else if (hash.startsWith("#/home")) {
      await loadHomeView()
    } else {
      await loadLocalProjects({ allowFallback: false })
      await computeHomeStats()
      await updateLastChapterTitle()
      renderCurrentUI()
    }

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
  const writingSessions = await idbGetAll("writing_sessions")
  const knowledgeNotes = await idbGetAll("knowledge_notes")
  const knowledgeLinks = await idbGetAll("knowledge_links")
  const focusSessions = await idbGetAll("focus_sessions")
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
      mindmapEdges,
      writingSessions,
      knowledgeNotes,
      knowledgeLinks,
      focusSessions
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
  const writingSessions = Array.isArray(data.writingSessions) ? data.writingSessions : []
  const knowledgeNotes = Array.isArray(data.knowledgeNotes) ? data.knowledgeNotes : []
  const knowledgeLinks = Array.isArray(data.knowledgeLinks) ? data.knowledgeLinks : []
  const focusSessions = Array.isArray(data.focusSessions) ? data.focusSessions : []

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
  await clearStore("writing_sessions", "id")
  await clearStore("knowledge_notes", "id")
  await clearStore("knowledge_links", "id")
  await clearStore("focus_sessions", "id")
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
  for (const session of writingSessions) {
    await idbPut("writing_sessions", session)
  }
  for (const note of knowledgeNotes) {
    await idbPut("knowledge_notes", note)
  }
  for (const link of knowledgeLinks) {
    await idbPut("knowledge_links", link)
  }
  for (const session of focusSessions) {
    await idbPut("focus_sessions", session)
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

  if (state.focusSession && state.focusSession.project_id !== projectId) {
    await stopFocusSession({ reason: "project-change" })
  }

  setLastOpenedProjectId(projectId)
  state.statusText = ""
  state.editingProjectId = state.editingProjectId === projectId ? projectId : null
  await loadLocalChapters()
  await loadLocalCharacters()
  await loadLocalInspiration()
  await loadLocalMindmap()
  if (state.writingNav === "stats") {
    await loadProjectStatsView({ projectId, force: true })
  }
  state.knowledgeProjectId = state.writingNav === "knowledge" ? projectId : null
  if (state.writingNav === "knowledge") {
    await loadKnowledgeView({ projectId, render: false })
  }
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
    if (state.writingNav === "knowledge") {
      await loadKnowledgeView({ projectId, render: false })
    }
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
  await deleteLocalProjectKnowledge(id)
  await deleteLocalProjectFocus(id)
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
  await deleteLocalProjectKnowledge(id)
  await deleteLocalProjectFocus(id)
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

  touchWritingSession()

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
  if (state.focusSession) {
    await stopFocusSession({ reason: "chapter-change" })
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

  await finalizeWritingSession("chapter-select")
  if (state.focusSession) {
    await stopFocusSession({ reason: "chapter-change" })
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

  if (state.focusSession && state.selectedChapterId === id) {
    await stopFocusSession({ reason: "chapter-delete" })
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

  if (state.selectedChapterId === id) {
    await finalizeWritingSession("chapter-delete")
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
  if (event.button === 0) {
    const target = event.target
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      if (isWikiLinkEditableField(target) && isWikiLinkContext(target)) {
        const caret = target.selectionStart
        if (caret !== null && caret === target.selectionEnd) {
          const match = findWikiLinkAtCaret(target.value, caret)
          if (match) {
            event.preventDefault()
            await handleWikiLinkOpen(match.title)
            return
          }
        }
      }
    }
  }

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

  if (action === "knowledge-create") {
    await handleKnowledgeCreate()
    return
  }

  if (action === "knowledge-tab") {
    await handleKnowledgeTabChange(actionTarget.dataset.tab)
    return
  }

  if (action === "knowledge-select") {
    await handleKnowledgeSelect(actionTarget.dataset.id)
    return
  }

  if (action === "knowledge-delete") {
    await handleKnowledgeDelete(actionTarget.dataset.id)
    return
  }

  if (action === "knowledge-open-link") {
    const raw = actionTarget.dataset.title || ""
    await handleWikiLinkOpen(decodeURIComponent(raw))
    return
  }

  if (action === "knowledge-preview-toggle") {
    handleKnowledgePreviewToggle()
    return
  }

  if (action === "knowledge-sort-toggle") {
    handleKnowledgeSortToggle()
    return
  }

  if (action === "wiki-graph-reset") {
    handleWikiGraphResetView()
    return
  }

  if (action === "wiki-graph-open-note") {
    await handleWikiGraphOpenNote(actionTarget.dataset.id)
    return
  }

  if (action === "wiki-graph-settings-toggle") {
    state.wikiGraphSettingsOpen = !state.wikiGraphSettingsOpen
    renderAppUI()
    return
  }

  if (action === "wiki-graph-min") {
    const nextValue = Number(actionTarget.dataset.value)
    state.wikiGraphMinDegree = Number.isFinite(nextValue) ? nextValue : 0
    renderAppUI()
    return
  }

  if (action === "wiki-graph-panel-toggle") {
    state.wikiGraphPanelCollapsed = !state.wikiGraphPanelCollapsed
    renderAppUI()
    return
  }

  if (action === "wiki-graph-select") {
    handleWikiGraphSelectNode(actionTarget.dataset.id)
    return
  }

  if (action === "knowledge-autocomplete-select") {
    const raw = actionTarget.dataset.title || ""
    handleKnowledgeAutocompleteSelect(decodeURIComponent(raw))
    return
  }

  if (action === "knowledge-duplicate-rename") {
    await handleKnowledgeDuplicateRename(actionTarget.dataset.id)
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

  if (action === "focus-toggle") {
    if (state.focusSession) {
      await stopFocusSession({ reason: "manual" })
    } else {
      await startFocusSession()
    }
    return
  }

  if (action === "writing-nav") {
    const nextNav = actionTarget.dataset.nav
    if (nextNav && nextNav !== state.writingNav) {
      if (state.focusSession && nextNav !== "chapter") {
        await stopFocusSession({ reason: "leave-editor" })
      }
      const projectId = state.selectedProjectId
      if (!projectId) {
        return
      }
      const routeMap = {
        chapter: "write",
        characters: "characters",
        inspiration: "inspiration",
        ideas: "ideas",
        mindmap: "mindmap",
        stats: "stats",
        knowledge: "knowledge"
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
    state.mindmapContextMenu = null
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
    const dataset = getGraphDataset()
    if (dataset === "wikiGraph") {
      await handleWikiGraphOpenNote(nodeId)
      return
    }
    state.mindmapContextMenu = null
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
    const dataset = getGraphDataset()
    if (dataset === "wikiGraph") {
      state.wikiGraphSelectedNodeId = null
      renderAppUI()
      return
    }
    state.mindmapContextMenu = null
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
    state.mindmapDeleteConfirmId = actionTarget.dataset.id || null
    renderAppUI()
    return
  }

  if (action === "mindmap-context-add-node") {
    const menu = state.mindmapContextMenu
    state.mindmapContextMenu = null
    if (!menu) {
      return
    }
    const position = getMindmapCoordsFromCanvasPoint({
      x: menu.canvasX,
      y: menu.canvasY
    })
    await handleMindmapCreateNode(position)
    return
  }

  if (action === "mindmap-context-link") {
    const menu = state.mindmapContextMenu
    state.mindmapContextMenu = null
    state.mindmapMode = "link"
    state.mindmapLinkSourceId = menu?.nodeId || null
    renderAppUI()
    return
  }

  if (action === "mindmap-delete-confirm") {
    state.mindmapDeleteConfirmId = null
    await handleMindmapDeleteNode(actionTarget.dataset.id)
    return
  }

  if (action === "mindmap-delete-cancel") {
    state.mindmapDeleteConfirmId = null
    renderAppUI()
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

app.addEventListener("pointerover", (event) => {
  const tooltip = getGraphTooltip()
  if (!tooltip) {
    return
  }
  const node = event.target.closest(".graph-node")
  if (!node) {
    return
  }
  if (node.contains(event.relatedTarget)) {
    return
  }
  graphTooltipNode = node
  showGraphTooltip(node, event)
})

app.addEventListener("pointermove", (event) => {
  if (!graphTooltipNode) {
    return
  }
  const tooltip = getGraphTooltip()
  if (!tooltip) {
    graphTooltipNode = null
    return
  }
  if (!graphTooltipNode.contains(event.target)) {
    return
  }
  positionGraphTooltipNearNode(tooltip, graphTooltipNode)
})

app.addEventListener("pointerout", (event) => {
  if (!graphTooltipNode) {
    return
  }
  const node = event.target.closest(".graph-node")
  if (!node || node !== graphTooltipNode) {
    return
  }
  if (node.contains(event.relatedTarget)) {
    return
  }
  graphTooltipNode = null
  hideGraphTooltip()
})

app.addEventListener("contextmenu", (event) => {
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
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const nodeEl = target.closest(".mindmap-node")
  state.mindmapContextMenu = {
    open: true,
    x,
    y,
    nodeId: nodeEl?.dataset.id || null,
    canvasX: x,
    canvasY: y
  }
  renderAppUI()
})

app.addEventListener("mousedown", (event) => {
  const dataset = getGraphDataset()
  if (!dataset) {
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
    const node = getGraphNodes(dataset).find((item) => item.id === nodeId)
    if (!node) {
      return
    }
    mindmapDrag = {
      id: node.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y,
      dataset
    }
    event.preventDefault()
    return
  }

  const view = getGraphView(dataset)
  mindmapPan = {
    startX: event.clientX,
    startY: event.clientY,
    originX: view.offsetX,
    originY: view.offsetY,
    dataset
  }
  event.preventDefault()
})

app.addEventListener("dblclick", async (event) => {
  const dataset = getGraphDataset()
  if (!dataset) {
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
  const nodeEl = target.closest(".graph-node")
  if (dataset === "wikiGraph" && nodeEl?.dataset.id) {
    const nodeId = nodeEl.dataset.id
    handleWikiGraphSelectNode(nodeId)
    await handleWikiGraphOpenNote(nodeId)
    return
  }
  if (dataset !== "mindmap") {
    return
  }
  const rect = canvasEl.getBoundingClientRect()
  const view = getGraphView("mindmap")
  const x = (event.clientX - rect.left - view.offsetX) / view.scale - MINDMAP_NODE_WIDTH / 2
  const y = (event.clientY - rect.top - view.offsetY) / view.scale - MINDMAP_NODE_HEIGHT / 2
  await handleMindmapCreateNode({ x, y })
})

app.addEventListener("mousemove", (event) => {
  if (mindmapDrag) {
    const dataset = mindmapDrag.dataset ?? "mindmap"
    const view = getGraphView(dataset)
    const dx = (event.clientX - mindmapDrag.startX) / view.scale
    const dy = (event.clientY - mindmapDrag.startY) / view.scale
    const nextX = mindmapDrag.originX + dx
    const nextY = mindmapDrag.originY + dy
    const nodes = getGraphNodes(dataset).map((node) =>
      node.id === mindmapDrag.id ? { ...node, x: nextX, y: nextY } : node
    )
    setGraphNodes(nodes, dataset)
    if (dataset === "wikiGraph") {
      scheduleWikiGraphDragUpdate(mindmapDrag.id)
      return
    }
    renderAppUI()
    return
  }

  if (mindmapPan) {
    const dataset = mindmapPan.dataset ?? "mindmap"
    const dx = event.clientX - mindmapPan.startX
    const dy = event.clientY - mindmapPan.startY
    const view = getGraphView(dataset)
    const nextView = {
      ...view,
      offsetX: mindmapPan.originX + dx,
      offsetY: mindmapPan.originY + dy
    }
    setGraphView(nextView, dataset)
    if (dataset === "wikiGraph") {
      scheduleWikiGraphViewUpdate()
      return
    }
    renderAppUI()
  }
})

app.addEventListener("mouseup", async () => {
  const dataset = mindmapDrag?.dataset ?? mindmapPan?.dataset ?? getGraphDataset()
  if (!dataset) {
    mindmapDrag = null
    mindmapPan = null
    return
  }
  if (dataset === "mindmap" && mindmapDrag) {
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
    const dataset = getGraphDataset()
    if (!dataset) {
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
    const view = getGraphView(dataset)
    const prevScale = view.scale
    const nextScale = Math.min(2, Math.max(0.4, prevScale + (event.deltaY > 0 ? -0.08 : 0.08)))
    const scaleRatio = nextScale / prevScale
    const nextOffsetX = mouseX - (mouseX - view.offsetX) * scaleRatio
    const nextOffsetY = mouseY - (mouseY - view.offsetY) * scaleRatio
    const nextView = {
      offsetX: nextOffsetX,
      offsetY: nextOffsetY,
      scale: nextScale
    }
    setGraphView(nextView, dataset)
    if (dataset === "wikiGraph") {
      scheduleWikiGraphViewUpdate()
      return
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

  if (target.id === "knowledge-search") {
    state.knowledgeSearch = target.value
    renderCurrentUI()
    return
  }

  if (target.id === "wiki-graph-search") {
    state.wikiGraphSearch = target.value
    renderAppUI()
    return
  }

  if (target.id === "wiki-graph-min") {
    state.wikiGraphMinDegree = Number(target.value) || 0
    renderAppUI()
    return
  }

  if (target.id === "knowledge-title") {
    const id = target.dataset.id
    if (id) {
      if (!state.knowledgeTitleOriginals[id]) {
        state.knowledgeTitleOriginals = {
          ...state.knowledgeTitleOriginals,
          [id]: getKnowledgeNoteTitle(id)
        }
      }
      setKnowledgeTitleDraft(id, target.value)
      setKnowledgeTitleError("")
    }
    return
  }

  if (target.id === "knowledge-content") {
    const id = target.dataset.id
    if (id) {
      updateKnowledgeNoteState(id, { content: target.value })
      queueKnowledgePatch(id, { content: target.value })
      updateKnowledgeAutocomplete(target)
    }
    return
  }

  if (target.dataset.mindmapField) {
    const field = target.dataset.mindmapField
    const id = target.dataset.id
    if (id) {
      const value = target.value
      const patch =
        field === "tags" ? { tags: parseTags(value) } : { [field]: value }
      updateMindmapNodeState(id, patch)
      if (field === "title") {
        updateMindmapNodeTitlePreview(id, value)
      }
      queueMindmapUpdate(id, patch)
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

  if (target.dataset.mindmapField) {
    await flushMindmapUpdates()
    return
  }

  if (target.dataset.ideaField) {
    const id = target.dataset.id
    if (id) {
      await flushIdeaPatch(id, { render: false })
    }
  }

  if (target.id === "knowledge-title") {
    const id = target.dataset.id
    if (id) {
      await commitKnowledgeTitle(id, { reason: "blur" })
    }
    return
  }

  if (target.id === "knowledge-content") {
    const id = target.dataset.id
    if (id) {
      await flushKnowledgePatch(id, { render: false })
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
      const value = target.value
      const patch =
        field === "tags" ? { tags: parseTags(value) } : { [field]: value }
      updateMindmapNodeState(id, patch)
      if (field === "title") {
        updateMindmapNodeTitlePreview(id, value)
      }
      queueMindmapUpdate(id, patch)
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

  if (target.id === "wiki-graph-orphans") {
    state.wikiGraphShowOrphans = Boolean(target.checked)
    renderAppUI()
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

document.addEventListener("click", (event) => {
  if (!state.mindmapContextMenu?.open) {
    return
  }
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }
  if (target.closest(".mindmap-context-menu")) {
    return
  }
  state.mindmapContextMenu = null
  renderCurrentUI()
})

document.addEventListener("click", (event) => {
  if (!state.knowledgeAutocomplete.open) {
    return
  }
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }
  if (target.closest("#knowledge-autocomplete") || target.closest("#knowledge-content")) {
    return
  }
  closeKnowledgeAutocomplete()
})

document.addEventListener("click", (event) => {
  if (!state.wikiGraphSettingsOpen) {
    return
  }
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }
  if (target.closest(".graph-settings")) {
    return
  }
  state.wikiGraphSettingsOpen = false
  renderCurrentUI()
})

document.addEventListener("keydown", (event) => {
  const target = event.target
  const isEditable =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)

  if (event.key === "Escape") {
    if (state.wikiGraphSettingsOpen) {
      state.wikiGraphSettingsOpen = false
      renderCurrentUI()
      return
    }
    if (state.mindmapContextMenu?.open) {
      state.mindmapContextMenu = null
      renderCurrentUI()
      return
    }
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
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  if (target.id !== "knowledge-title") {
    return
  }
  if (event.key === "Enter") {
    event.preventDefault()
    const id = target.dataset.id
    if (id) {
      commitKnowledgeTitle(id, { reason: "enter" }).then(() => {
        if (!state.knowledgeTitleError) {
          target.blur()
        }
      })
    }
    return
  }
  if (event.key === "Escape") {
    event.preventDefault()
    const id = target.dataset.id
    if (id) {
      const original = state.knowledgeTitleOriginals[id] ?? getKnowledgeNoteTitle(id)
      restoreKnowledgeTitleEdit(id, original)
    }
    target.blur()
  }
})

app.addEventListener("keydown", (event) => {
  const target = event.target
  if (!(target instanceof HTMLTextAreaElement)) {
    return
  }
  if (target.id !== "knowledge-content") {
    return
  }
  if (event.key === "Escape" && state.knowledgeAutocomplete.open) {
    event.preventDefault()
    closeKnowledgeAutocomplete()
  }
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

  const nextWritingNav = page === "editor" ? props.writingNav ?? "chapter" : null
  const switchingProject =
    page === "editor" &&
    props.projectId &&
    state.selectedProjectId &&
    props.projectId !== state.selectedProjectId
  const leavingWriting =
    page !== "editor" || nextWritingNav !== "chapter" || switchingProject

  if (leavingWriting) {
    await finalizeWritingSession("route-change")
  }

  clearAutosaveTimer()

  if (!focusCleanupDone) {
    focusCleanupDone = true
    await cleanupOpenFocusSessions()
  }

  if (page !== "editor" && state.focusSession) {
    await stopFocusSession({ reason: "leave-editor" })
  }

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
      const nextNav = props.writingNav
      if (nextNav !== state.writingNav) {
        if (state.focusSession && nextNav !== "chapter") {
          await stopFocusSession({ reason: "leave-editor" })
        }
        state.writingNav = nextNav
        if (nextNav === "mindmap") {
          state.mindmapNeedsCenter = true
        }
      }
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
window.addEventListener("beforeunload", () => {
  if (state.focusSession) {
    stopFocusSession({ reason: "unload" })
  }
})
render()
