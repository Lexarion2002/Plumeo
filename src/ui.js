import { renderHomeSidebar } from "./homeSidebar.js"

export function renderLogin({ onSignIn, onSignUp, message = "" } = {}) {
  return `
    <section class="page">
      <h1>Login</h1>
      <p>Connecte-toi pour acceder a l'app.</p>
      <form id="auth-form" class="form" autocomplete="on">
        <label class="field">
          <span>Email</span>
          <input id="email" type="email" required placeholder="email@exemple.com" />
        </label>
        <label class="field">
          <span>Mot de passe</span>
          <input id="password" type="password" required minlength="6" />
        </label>
        <div class="actions">
          <button id="sign-in" type="button">Se connecter</button>
          <button id="sign-up" class="secondary" type="button">Creer un compte</button>
        </div>
      </form>
      <p id="message" class="message">${message}</p>
    </section>
  `
}

function formatDate(iso) {
  if (!iso) {
    return ""
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }

  return date.toLocaleString()
}

function renderTopBar({
  userEmail = "",
  activeRoute = "home",
  editorProjectId = null,
  lastProjectId = null
} = {}) {
  const editorTarget = editorProjectId || lastProjectId
  const editorDisabled = editorTarget ? "" : "disabled"
  const editorTargetAttr = editorTarget ? `data-id="${editorTarget}"` : ""
  const homeActive = activeRoute === "home" ? " is-active" : ""
  const editorActive = activeRoute === "editor" ? " is-active" : ""
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="topbar-left">
          <h1>Plumeo</h1>
          <div class="topbar-nav">
            <button data-action="nav-home" type="button" class="topbar-tab${homeActive}">Accueil</button>
            <button data-action="nav-editor" type="button" class="topbar-tab${editorActive}" ${editorTargetAttr} ${editorDisabled}>Editeur</button>
          </div>
        </div>
      </div>
    </header>
  `
}

export function renderHome({
  userEmail = "",
  projects = [],
  lastProjectId = null,
  lastChapterTitle = null,
  lastCloudSaveAt = null,
  cloudStatus = "",
  cloudBusy = false,
  backupStatus = "",
  homeStats = null,
  homeMessage = ""
} = {}) {
  const hasProjects = projects.length > 0
  const lastProject = projects.find((project) => project.id === lastProjectId)
  const lastTitle = lastProject?.title ?? "Aucun projet recent"
  const lastButtonDisabled = lastProject ? "" : "disabled"
  const lastButtonId = lastProject ? `data-id="${lastProject.id}"` : ""
  const lastCloudSaveLabel = lastCloudSaveAt
    ? formatDate(new Date(lastCloudSaveAt).toISOString())
    : "-"
  const stats = homeStats ?? {
    totalWords: 0,
    wordsPerDay: 0,
    pagesTotal: 0,
    pagesPerDay: 0,
    timeSpent: null,
    timePerDay: null
  }
  const timeTotalLabel = stats.timeSpent ? stats.timeSpent : "—"
  const timePerDayLabel = stats.timePerDay ? stats.timePerDay : "—"
  const wordsTotalLabel = `${stats.totalWords} mots`
  const wordsPerDayLabel = `${stats.wordsPerDay} mots par jour`
  const pagesTotalLabel = `${stats.pagesTotal}`
  const pagesPerDayLabel = `${stats.pagesPerDay.toFixed(1)} pages par jour`

  const projectCards = projects
    .map((project) => {
      const isActive = project.id === lastProjectId
      const statusLabel = isActive ? "Actif" : "En pause"
      const statusClass = isActive ? " is-active" : ""
      const progressLabel = isActive ? "En cours" : "Brouillon"
      const createdLabel = project.created_at
        ? `Modifie le ${formatDate(project.created_at)}`
        : "A reprendre"
      return `
        <div class="project-card${isActive ? " is-active" : ""}">
          <button class="project-card-main" data-action="home-project-open" data-id="${project.id}" type="button">
            <h3>${project.title}</h3>
            <div class="project-card-meta">
              <span class="project-card-status${statusClass}">${statusLabel}</span>
              <span class="project-card-progress">${progressLabel}</span>
              <span class="project-card-info">${createdLabel}</span>
            </div>
          </button>
          <button class="project-card-delete" data-action="home-project-delete" data-id="${project.id}" type="button" aria-label="Supprimer le projet" title="Supprimer">
            Supprimer
          </button>
        </div>
      `
    })
    .join("")

  const heroBlock = `
        <section class="home-quote">
          <p>Ecrire, c'est tenter de savoir ce que l'on ecrirait si l'on ecrivait.</p>
        </section>
        <section class="home-hero">
          <p class="home-hero-title">Pret a ecrire ?</p>
          <button
            class="home-hero-cta"
            data-action="home-project-continue"
            ${lastButtonId}
            ${lastButtonDisabled}
            type="button"
          >
            Continuer a ecrire
          </button>
          <p class="home-hero-note">Ton texte est sauvegarde automatiquement.</p>
        </section>
      `

  return `
    <section class="page-shell home-shell">
      ${renderTopBar({ userEmail, activeRoute: "home", lastProjectId })}
      <div class="page dashboard">
        <div class="home-layout">
          ${renderHomeSidebar({
            userEmail,
            lastCloudSaveLabel,
            cloudStatus,
            cloudBusy,
            backupStatus
          })}
          <main class="home-content">
            ${heroBlock}
            <section class="panel panel-card home-projects">
              <div class="panel-header">
                <h2>Projets en cours</h2>
                <button data-action="home-project-create" type="button" class="secondary compact">+ Nouveau projet</button>
              </div>
              ${
                hasProjects
                  ? `<div class="project-grid">${projectCards}</div>`
                  : `<p class="muted">Aucun projet pour le moment.</p>`
              }
            </section>
            <section class="panel panel-card home-stats">
              <div class="panel-header">
                <h2>Vos statistiques d'ecriture</h2>
                <span class="home-stats-note">Mises a jour tous les matins a 10h</span>
              </div>
              <div class="home-stats-card">
                <div class="home-stats-col">
                  <p class="home-stats-value">${timeTotalLabel}</p>
                  <p class="home-stats-label">Temps passe a ecrire</p>
                  <p class="home-stats-sub">${timePerDayLabel} par jour</p>
                </div>
                <div class="home-stats-divider"></div>
                <div class="home-stats-col">
                  <p class="home-stats-value">${wordsTotalLabel}</p>
                  <p class="home-stats-label">Nombre total de mots</p>
                  <p class="home-stats-sub">${wordsPerDayLabel}</p>
                </div>
                <div class="home-stats-divider"></div>
                <div class="home-stats-col">
                  <p class="home-stats-value">${pagesTotalLabel}</p>
                  <p class="home-stats-label">Nombre total de pages</p>
                  <p class="home-stats-hint">250 mots/page</p>
                  <p class="home-stats-sub">${pagesPerDayLabel}</p>
                </div>
              </div>
            </section>
            <p id="home-message" class="message">${homeMessage}</p>
          </main>
        </div>
      </div>
    </section>
  `
}
export function renderApp({
  onSignOut,
  userEmail = "",
  projects = [],
  selectedProjectId = null,
  editingProjectId = null,
  chapters = [],
  selectedChapterId = null,
  chapterDetail = null,
  versions = [],
  statusText = ""
} = {}) {
  const hasProjectSelected = Boolean(selectedProjectId)
  const hasChapters = chapters.length > 0
  const hasChapterSelected = Boolean(chapterDetail)
  const activeProject = hasProjectSelected
    ? projects.find((project) => project.id === selectedProjectId)
    : null
  const projectTitle = activeProject?.title ?? "Sans titre"
  const projectTitleLabel = hasProjectSelected ? projectTitle : "-"
  const chapterIndex = hasChapterSelected
    ? chapters.findIndex((chapter) => chapter.id === selectedChapterId) + 1
    : 0
  const chapterPosition =
    hasChapterSelected && chapterIndex > 0 && chapters.length
      ? `${chapterIndex}/${chapters.length}`
      : "-"
  const isEditingProject = hasProjectSelected && editingProjectId === selectedProjectId

  const chapterItems = chapters
    .map((chapter) => {
      const isSelected = chapter.id === selectedChapterId
      return `
        <li>
          <button
            class="list-button${isSelected ? " is-selected" : ""}"
            data-action="chapter-select"
            data-id="${chapter.id}"
          >
            ${chapter.title}
          </button>
        </li>
      `
    })
    .join("")

  const versionItems = versions
    .map((version) => {
      return `
        <li class="version-item">
          <div>
            <strong>${version.label ?? "Version"}</strong>
            <div class="muted">${formatDate(version.created_at)}</div>
          </div>
          <button
            data-action="version-restore"
            data-id="${version.id}"
            type="button"
          >
            Restaurer
          </button>
        </li>
      `
    })
    .join("")

  const conflictBlock = chapterDetail?.conflict
    ? `
      <div class="conflict">
        <p>Conflit detecte (serveur different).</p>
        <div class="actions">
          <button data-action="conflict-reload-server" type="button">
            Recharger serveur
          </button>
          <button data-action="conflict-duplicate-local" class="secondary" type="button">
            Dupliquer local
          </button>
        </div>
      </div>
    `
    : ""

  const editorContent = hasChapterSelected
    ? `
      ${conflictBlock}
      <label class="field">
        <span>Titre du chapitre</span>
        <input
          id="chapter-title"
          type="text"
          value="${chapterDetail.title ?? ""}"
          readonly
        />
      </label>
      <div class="field editor-field">
        <span>Contenu</span>
        <div id="editor-toolbar" class="editor-toolbar" role="toolbar" aria-label="Outils de mise en forme">
          <div class="toolbar-group">
            <button type="button" class="toolbar-button icon-bold" data-command="bold" aria-label="Gras" title="Gras">
              <span aria-hidden="true">G</span>
            </button>
            <button type="button" class="toolbar-button icon-italic" data-command="italic" aria-label="Italique" title="Italique">
              <span aria-hidden="true">I</span>
            </button>
            <button type="button" class="toolbar-button icon-heading" data-command="heading-1" aria-label="Titre 1" title="Titre 1">
              <span aria-hidden="true">H1</span>
            </button>
            <button type="button" class="toolbar-button icon-heading" data-command="heading-2" aria-label="Titre 2" title="Titre 2">
              <span aria-hidden="true">H2</span>
            </button>
          </div>
          <div class="toolbar-group toolbar-segment" role="group" aria-label="Alignement">
            <button type="button" class="toolbar-button icon-align icon-align-left" data-command="align-left" aria-label="Aligner a gauche" title="Aligner a gauche">
              <span aria-hidden="true"></span>
            </button>
            <button type="button" class="toolbar-button icon-align icon-align-center" data-command="align-center" aria-label="Centrer" title="Centrer">
              <span aria-hidden="true"></span>
            </button>
            <button type="button" class="toolbar-button icon-align icon-align-right" data-command="align-right" aria-label="Aligner a droite" title="Aligner a droite">
              <span aria-hidden="true"></span>
            </button>
            <button type="button" class="toolbar-button icon-align icon-align-justify" data-command="align-justify" aria-label="Justifier" title="Justifier">
              <span aria-hidden="true"></span>
            </button>
          </div>
          <div class="toolbar-group">
            <button type="button" class="toolbar-button icon-list icon-list-bullet" data-command="bullet-list" aria-label="Liste a puces" title="Liste a puces">
              <span aria-hidden="true"></span>
            </button>
            <button type="button" class="toolbar-button icon-list icon-list-ordered" data-command="ordered-list" aria-label="Liste numerotee" title="Liste numerotee">
              <span aria-hidden="true"></span>
            </button>
          </div>
          <div class="toolbar-group">
            <button type="button" class="toolbar-button icon-highlight" data-command="highlight" aria-label="Surligner" title="Surligner">
              <span aria-hidden="true">A</span>
            </button>
          </div>
          <div class="toolbar-group">
            <label class="toolbar-label" for="toolbar-font-size">Taille</label>
            <select id="toolbar-font-size" class="toolbar-select" data-command="font-size" aria-label="Taille de police" title="Taille de police">
              <option value="12">12</option>
              <option value="14">14</option>
              <option value="16">16</option>
              <option value="18">18</option>
              <option value="24">24</option>
            </select>
          </div>
          <div class="toolbar-group toolbar-group-right">
            <button type="button" class="toolbar-button icon-history" data-command="undo" aria-label="Annuler" title="Annuler">
              <span aria-hidden="true">â†º</span>
            </button>
            <button type="button" class="toolbar-button icon-history" data-command="redo" aria-label="Retablir" title="Retablir">
              <span aria-hidden="true">â†»</span>
            </button>
          </div>
        </div>
        <div class="paper-shell">
          <div id="chapter-editor" class="editor-canvas" aria-label="Contenu du chapitre"></div>
        </div>
      </div>
    `
    : `
      <div class="empty">
        <p>${hasProjectSelected ? "Cree un chapitre pour ecrire." : "Commence par creer un projet."}</p>
      </div>
    `

  const historyPanel = hasChapterSelected
    ? `
      <details class="history" data-section="history">
        <summary class="history-summary">Afficher / Masquer l'historique</summary>
        <div class="history-body">
          <div class="panel-header">
            <h2>Historique</h2>
            <button data-action="version-create" type="button">Snapshot maintenant</button>
          </div>
          ${versions.length ? `<ul class="version-list">${versionItems}</ul>` : `<p class="muted">Aucune version.</p>`}
        </div>
      </details>
    `
    : ""

  const exportButton = `
    <button
      id="project-export"
      data-action="project-export-md"
      type="button"
      class="secondary compact"
      ${hasProjectSelected ? "" : "disabled"}
      aria-disabled="${hasProjectSelected ? "false" : "true"}"
      aria-describedby="project-export-hint"
    >
      Exporter Markdown
    </button>
  `

  const chapterTitle = hasChapterSelected ? chapterDetail?.title ?? "" : "-"

  return `
    <section class="page-shell writing-page">
      ${renderTopBar({ userEmail, activeRoute: "editor", editorProjectId: selectedProjectId })}
      <div class="page app-shell">
        <div class="writing-layout">
        <aside class="writing-sidebar">
        <section class="panel panel-card">
          <div class="panel-header">
            <h2>Chapitres</h2>
            <div class="actions">
              <button data-action="chapter-create" type="button" class="secondary" ${hasProjectSelected ? "" : "disabled"}>+ Nouveau chapitre</button>
              ${exportButton.replace("Exporter Markdown", "Exporter ce projet (Markdown)")}
            </div>
          </div>
          <div class="project-summary">
            <span class="project-summary-label">Projet actif</span>
            ${
              isEditingProject
                ? `
                  <input
                    class="project-edit-input"
                    data-id="${selectedProjectId ?? ""}"
                    type="text"
                    value="${projectTitle}"
                    aria-label="Renommer le projet"
                    autofocus
                  />
                `
                : `<div class="project-summary-title${hasProjectSelected ? " is-active" : ""}">${projectTitleLabel}</div>`
            }
          </div>
          <p class="muted">L'export concerne le projet actif.</p>
          <div id="project-export-hint" class="projects-export-hint" aria-live="polite"></div>
          ${hasProjectSelected
            ? hasChapters
              ? `<ul class="list">${chapterItems}</ul>`
              : `<p class="muted">Cree un chapitre pour ecrire.</p>`
            : `<p class="muted">Selectionne un projet.</p>`}
        </section>
        </aside>

        <main class="writing-editor">
        <section class="panel panel-card editor ${hasChapterSelected ? "" : "is-disabled"}">
          <div class="panel-header">
            <div>
              <h2>3. Ecriture</h2>
              <p class="context">Projet: ${projectTitleLabel} / Chapitre: ${chapterTitle} / Position: ${chapterPosition}</p>
            </div>
            <span id="status-text" class="status">${statusText}</span>
          </div>
          <div class="editor-body">
            ${editorContent}
          </div>
        </section>
        </main>
        </div>
        ${historyPanel}
      </div>
    </section>
  `
}




