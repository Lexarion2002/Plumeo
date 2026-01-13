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

export function renderApp({
  onSignOut,
  userEmail = "",
  projects = [],
  selectedProjectId = null,
  chapters = [],
  selectedChapterId = null,
  chapterDetail = null,
  versions = [],
  statusText = ""
} = {}) {
  const projectItems = projects
    .map((project) => {
      const isSelected = project.id === selectedProjectId
      return `
        <li>
          <button
            class="list-button${isSelected ? " selected" : ""}"
            data-action="project-select"
            data-id="${project.id}"
          >
            ${project.title}
          </button>
        </li>
      `
    })
    .join("")

  const chapterItems = chapters
    .map((chapter) => {
      const isSelected = chapter.id === selectedChapterId
      return `
        <li>
          <button
            class="list-button${isSelected ? " selected" : ""}"
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

  const editorContent = chapterDetail
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
      <label class="field">
        <span>Contenu</span>
        <textarea
          id="chapter-content"
          rows="14"
          placeholder="Commence a ecrire..."
        >${chapterDetail.content_md ?? ""}</textarea>
      </label>
    `
    : `
      <p class="muted">Selectionne un chapitre pour ecrire.</p>
    `

  const historyPanel = chapterDetail
    ? `
      <section class="panel">
        <div class="panel-header">
          <h2>Historique</h2>
          <button data-action="version-create" type="button">Snapshot maintenant</button>
        </div>
        ${versions.length ? `<ul class="version-list">${versionItems}</ul>` : `<p class="muted">Aucune version.</p>`}
      </section>
    `
    : ""

  const exportButton = selectedProjectId
    ? `<button data-action="project-export-md" type="button">Exporter Markdown</button>`
    : ""

  return `
    <section class="page app-shell">
      <header class="app-header">
        <div>
          <h1>writer-app</h1>
          <p>Connecte: ${userEmail}</p>
        </div>
        <button data-action="sign-out" type="button">Se deconnecter</button>
      </header>

      <div class="app-layout">
        <section class="panel">
          <div class="panel-header">
            <h2>Projets</h2>
            <div class="actions">
              <button data-action="project-create" type="button">Nouveau projet</button>
              ${exportButton}
            </div>
          </div>
          ${projects.length ? `<ul class="list">${projectItems}</ul>` : `<p class="muted">Aucun projet.</p>`}
        </section>

        <section class="panel">
          <div class="panel-header">
            <h2>Chapitres</h2>
            <button data-action="chapter-create" type="button">Nouveau chapitre</button>
          </div>
          ${chapters.length ? `<ul class="list">${chapterItems}</ul>` : `<p class="muted">Aucun chapitre.</p>`}
        </section>

        <section class="panel editor">
          <div class="panel-header">
            <h2>Editeur</h2>
            <span id="status-text" class="status">${statusText}</span>
          </div>
          <div class="editor-body">
            ${editorContent}
          </div>
        </section>
      </div>
      ${historyPanel}
    </section>
  `
}
