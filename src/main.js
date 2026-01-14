import "../styles/app.css"
import { route } from "./router.js"
import { renderApp, renderHome, renderLogin } from "./ui.js"
import { signIn, signOut, signUp } from "./auth.js"
import {
  listProjects,
  createProject,
  renameProject,
  deleteProject,
  listChapters,
  createChapter,
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
  saveLocalChapterDraft,
  getLastOpenedProjectId,
  getLastOpenedChapterId,
  setLastOpenedProjectId,
  setLastOpenedChapterId,
  getLastCloudSaveAt,
  setLastCloudSaveAt,
  upsertProjectsLocal,
  upsertChaptersLocal
} from "./localStore.js"
import { enqueueChapterUpsert, startSyncLoop, syncOnce } from "./sync.js"
import { idbDel, idbGetAll, idbPut } from "./idb.js"
import { mountWritingView, unmountWritingView } from "./writingView.js"
import { loadFromCloud, saveToCloud } from "./cloud.js"

const app = document.querySelector("#app")

const state = {
  projects: [],
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
  backupStatus: ""
}

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000
const CLOUD_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000

let autosaveTimer = null
let cloudAutosaveTimer = null
let syncStarted = false
let currentUserEmail = ""

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
  app.innerHTML = renderApp({
    userEmail: currentUserEmail,
    projects: state.projects,
    selectedProjectId: state.selectedProjectId,
    editingProjectId: state.editingProjectId,
    chapters: state.chapters,
    selectedChapterId: state.selectedChapterId,
    chapterDetail: state.chapterDetail,
    versions: state.versions,
    statusText: state.statusText
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
    homeMessage: state.homeMessage
  })
}

function renderProjectSelectionState() {
  const exportButton = document.querySelector("#project-export")
  const exportHint = document.querySelector("#project-export-hint")
  if (!exportButton || !exportHint) {
    return
  }

  const project = state.projects.find(
    (item) => item.id === state.selectedProjectId
  )
  const hasProject = Boolean(project)

  exportButton.disabled = !hasProject
  exportButton.setAttribute("aria-disabled", hasProject ? "false" : "true")

  if (hasProject) {
    const projectTitle = project.title || "Sans titre"
    const hint = `Exporter le projet "${projectTitle}" en Markdown.`
    exportHint.textContent = hint
    exportButton.setAttribute("aria-label", hint)
  } else {
    const hint = "Selectionne un projet pour exporter."
    exportHint.textContent = hint
    exportButton.setAttribute("aria-label", hint)
  }
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

async function loadHomeView() {
  state.editingProjectId = null
  state.lastCloudSaveAt = getLastCloudSaveAt()
  await loadLocalProjects()
  await updateLastChapterTitle()
  renderHomeUI()

  await pullProjectsFromCloud()
  await loadLocalProjects()
  await updateLastChapterTitle()
  renderHomeUI()
}

async function handleCloudSave() {
  if (state.cloudBusy) {
    return
  }
  state.cloudBusy = true
  state.cloudStatus = "Sauvegarde..."
  renderHomeUI()

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
  renderHomeUI()
}

async function handleCloudLoad() {
  if (state.cloudBusy) {
    return
  }
  state.cloudBusy = true
  state.cloudStatus = "Chargement..."
  renderHomeUI()

  const result = await loadFromCloud()
  if (result.ok) {
    await loadLocalProjects({ allowFallback: false })
    await updateLastChapterTitle()
    state.cloudStatus = "Chargement termine."
  } else {
    state.cloudStatus = `Erreur: ${result.errorMessage}`
  }

  state.cloudBusy = false
  renderHomeUI()
}

async function handleBackupExport() {
  const projects = await idbGetAll("projects")
  const chapters = await idbGetAll("chapters")
  const outbox = await idbGetAll("outbox")
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      projects,
      chapters,
      outbox
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
  renderHomeUI()
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
    renderHomeUI()
    return
  }

  if (!parsed || parsed.version !== 1 || !parsed.data) {
    state.backupStatus = "Import refuse (format)."
    renderHomeUI()
    return
  }

  const data = parsed.data
  const projects = Array.isArray(data.projects) ? data.projects : null
  const chapters = Array.isArray(data.chapters) ? data.chapters : null
  const outbox = Array.isArray(data.outbox) ? data.outbox : []

  if (!projects || !chapters) {
    state.backupStatus = "Import refuse (donnees)."
    renderHomeUI()
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
  await upsertProjectsLocal(projects)
  await upsertChaptersLocal(chapters)
  for (const op of outbox) {
    await idbPut("outbox", op)
  }

  state.backupStatus = "Import termine."
  await loadLocalProjects({ allowFallback: false })
  await updateLastChapterTitle()
  renderHomeUI()
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
    window.location.hash = "#/home"
    return
  }

  setLastOpenedProjectId(projectId)
  state.statusText = ""
  state.editingProjectId = state.editingProjectId === projectId ? projectId : null
  await loadLocalChapters()
  await loadLocalChapterDetail()
  if (state.selectedChapterId) {
    setLastOpenedChapterId(state.selectedChapterId)
  }
  await loadVersionsForChapter(state.selectedChapterId)
  renderAppUI()

  await pullChaptersFromCloud(projectId)
  await loadLocalChapterDetail()
  if (state.selectedChapterId) {
    setLastOpenedChapterId(state.selectedChapterId)
  }
  await loadVersionsForChapter(state.selectedChapterId)
  renderAppUI()
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
  window.location.hash = `#/editor/${result.data.id}`
}

async function handleProjectSelect(id) {
  if (id === state.selectedProjectId) {
    return
  }

  setLastOpenedProjectId(id)
  state.editingProjectId = null
  window.location.hash = `#/editor/${id}`
}

async function handleHomeProjectOpen(id) {
  if (!id) {
    return
  }

  setLastOpenedProjectId(id)
  window.location.hash = `#/editor/${id}`
}

async function handleHomeProjectContinue() {
  const lastProjectId = getLastOpenedProjectId()
  if (!lastProjectId) {
    return
  }

  window.location.hash = `#/editor/${lastProjectId}`
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
  window.location.hash = `#/editor/${result.data.id}`
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
  renderHomeUI()
}

async function commitProjectRename(projectId, nextTitle) {
  const title = nextTitle.trim() || "Sans titre"
  const result = await renameProject(projectId, title)
  if (!result.ok) {
    setStatus(`Erreur: ${result.errorMessage}`)
    return
  }

  await upsertProjectsLocal([result.data])
  await loadLocalProjects({ allowFallback: false })
  state.editingProjectId = null
  renderAppUI()
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

  const title = window.prompt("Titre du chapitre")
  if (!title) {
    return
  }

  const orderIndex = state.chapters.length
  const result = await createChapter(
    state.selectedProjectId,
    title.trim(),
    orderIndex
  )

  if (!result.ok) {
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

  if (action === "nav-home") {
    window.location.hash = "#/home"
    return
  }

  if (action === "nav-editor") {
    const targetId = actionTarget.dataset.id || getLastOpenedProjectId()
    if (!targetId) {
      return
    }
    window.location.hash = `#/editor/${targetId}`
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
    await handleBackupExport()
    return
  }

  if (action === "home-backup-import") {
    const input = document.querySelector("#home-backup-file")
    if (input) {
      input.value = ""
      input.click()
    }
    return
  }

  if (action === "home-cloud-save") {
    await handleCloudSave()
    return
  }

  if (action === "home-cloud-load") {
    await handleCloudLoad()
    return
  }

  if (action === "home-sign-out") {
    const result = await signOut()
    if (!result.ok) {
      console.error(result.errorMessage)
      setHomeMessage(`Erreur: ${result.errorMessage}`)
      return
    }
    currentUserEmail = ""
    setHomeMessage("")
    renderHomeUI()
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
})

app.addEventListener("input", async (event) => {
  const target = event.target
  if (target && target.id === "chapter-content") {
    await handleChapterContentUpdate(target.value)
  }
})

app.addEventListener("change", async (event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  if (target.id !== "home-backup-file") {
    return
  }

  const file = target.files?.[0] ?? null
  await handleBackupImport(file)
  target.value = ""
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
    renderAppUI()
  }
})

async function render() {
  const { page, props } = await route()
  clearAutosaveTimer()

  if (page === "editor") {
    currentUserEmail = props.userEmail
    setCloudAutosaveActive(Boolean(currentUserEmail))
    if (!syncStarted) {
      startSyncLoop(handleSyncResults)
      syncStarted = true
    }

    await loadEditorView(props.projectId)
    return
  }

  unmountWritingView()

  if (page === "home") {
    currentUserEmail = props.userEmail
    setCloudAutosaveActive(Boolean(currentUserEmail))
    await loadHomeView()
    return
  }

  app.innerHTML = renderLogin({ message: props.message })
  setCloudAutosaveActive(false)

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
