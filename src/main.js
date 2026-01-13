import "../styles/app.css"
import { route } from "./router.js"
import { renderApp, renderLogin } from "./ui.js"
import { signIn, signOut, signUp } from "./auth.js"
import {
  listProjects,
  createProject,
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
  saveLocalChapterDraft,
  upsertProjectsLocal,
  upsertChaptersLocal
} from "./localStore.js"
import { enqueueChapterUpsert, startSyncLoop, syncOnce } from "./sync.js"
import { idbPut } from "./idb.js"

const app = document.querySelector("#app")

const state = {
  projects: [],
  selectedProjectId: null,
  chapters: [],
  selectedChapterId: null,
  chapterDetail: null,
  versions: [],
  statusText: ""
}

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000

let autosaveTimer = null
let syncStarted = false
let currentUserEmail = ""

function clearAutosaveTimer() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
    autosaveTimer = null
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

function renderAppUI() {
  app.innerHTML = renderApp({
    userEmail: currentUserEmail,
    projects: state.projects,
    selectedProjectId: state.selectedProjectId,
    chapters: state.chapters,
    selectedChapterId: state.selectedChapterId,
    chapterDetail: state.chapterDetail,
    versions: state.versions,
    statusText: state.statusText
  })
}

function getCredentials() {
  const email = document.querySelector("#email")
  const password = document.querySelector("#password")
  return {
    email: email ? email.value.trim() : "",
    password: password ? password.value : ""
  }
}

async function loadLocalProjects() {
  const local = await getLocalProjects()
  state.projects = local

  if (state.projects.length === 0) {
    state.selectedProjectId = null
    return
  }

  const hasSelected = state.projects.some(
    (project) => project.id === state.selectedProjectId
  )

  if (!hasSelected) {
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

async function loadAppView() {
  await loadLocalProjects()
  await loadLocalChapters()
  await loadLocalChapterDetail()
  await loadVersionsForChapter(state.selectedChapterId)
  renderAppUI()

  await pullProjectsFromCloud()
  await loadLocalChapters()
  await loadLocalChapterDetail()
  await loadVersionsForChapter(state.selectedChapterId)
  renderAppUI()

  if (state.selectedProjectId) {
    await pullChaptersFromCloud(state.selectedProjectId)
    await loadLocalChapterDetail()
    await loadVersionsForChapter(state.selectedChapterId)
    renderAppUI()
  }
}

async function handleProjectCreate() {
  const title = window.prompt("Titre du projet")
  if (!title) {
    return
  }

  const result = await createProject(title.trim())
  if (!result.ok) {
    setStatus(`Erreur: ${result.errorMessage}`)
    return
  }

  await upsertProjectsLocal([result.data])
  state.selectedProjectId = result.data.id
  state.selectedChapterId = null
  state.chapterDetail = null
  state.versions = []

  await loadLocalProjects()
  await loadLocalChapters()
  await loadLocalChapterDetail()
  renderAppUI()
}

async function handleProjectSelect(id) {
  if (id === state.selectedProjectId) {
    return
  }

  clearAutosaveTimer()
  state.selectedProjectId = id
  state.selectedChapterId = null
  state.chapterDetail = null
  state.versions = []
  state.statusText = ""

  await loadLocalChapters()
  await loadLocalChapterDetail()
  renderAppUI()

  await pullChaptersFromCloud(id)
  await loadLocalChapterDetail()
  await loadVersionsForChapter(state.selectedChapterId)
  renderAppUI()
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

  for (const chapter of chapters) {
    lines.push(`## ${chapter.title ?? "Sans titre"}`)
    lines.push(chapter.content_md ?? "")
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

  if (action === "project-create") {
    await handleProjectCreate()
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
    if (!state.selectedChapterId) {
      return
    }

    const updated = await saveLocalChapterDraft(state.selectedChapterId, {
      content_md: target.value
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
})

async function render() {
  const { page, props } = await route()

  if (page === "app") {
    currentUserEmail = props.userEmail
    if (!syncStarted) {
      startSyncLoop(handleSyncResults)
      syncStarted = true
    }

    await loadAppView()
    return
  }

  app.innerHTML = renderLogin({ message: props.message })

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
      window.location.hash = "#app"
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
