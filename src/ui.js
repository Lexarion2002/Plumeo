export function renderLogin({ onSignIn, onSignUp, message = "" } = {}) {
  return `
    <section class="page">
      <h1>Login</h1>
      <p>Connecte-toi pour acceder a l'app.</p>
      <form id="auth-form" class="form" autocomplete="on">
        <label class="field">
          <span>Email</span>
          <input class="input" id="email" type="email" required placeholder="email@exemple.com" />
        </label>
        <label class="field">
          <span>Mot de passe</span>
          <input class="input" id="password" type="password" required minlength="6" />
        </label>
        <div class="actions">
          <button class="btn btn-primary" id="sign-in" type="button">Se connecter</button>
          <button id="sign-up" class="btn btn-secondary" type="button">Creer un compte</button>
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
  lastProjectId = null,
  lastCloudSaveAt = null,
  cloudBusy = false,
  accountMenuOpen = false,
  backupStatus = "",
  backupMenuOpen = false
} = {}) {
  const editorTarget = editorProjectId || lastProjectId
  const editorDisabled = editorTarget ? "" : "disabled"
  const editorTargetAttr = editorTarget ? `data-id="${editorTarget}"` : ""
  const homeActive = activeRoute === "home" ? " is-active" : ""
  const editorActive = activeRoute === "editor" ? " is-active" : ""
  const backupActive = backupMenuOpen ? " is-active" : ""
  const accountActive = accountMenuOpen ? " is-active" : ""
  
  const isAuthed = Boolean(userEmail)
  const emailLabel = userEmail ? userEmail.split("@")[0].slice(0, 14) : "Non connecte"
  const avatarInitial = userEmail ? userEmail.trim().charAt(0).toUpperCase() : "?"
  const lastCloudSaveLabel = lastCloudSaveAt
    ? formatDate(new Date(lastCloudSaveAt).toISOString())
    : "-"
  const saveDisabled = !isAuthed || cloudBusy ? "disabled" : ""
  const loadDisabled = !isAuthed || cloudBusy ? "disabled" : ""
  const signOutButton = isAuthed
    ? `<button class="btn btn-ghost topbar-popover-item" data-action="home-sign-out" type="button"><span class="topbar-popover-icon"><svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 12H4m0 0l3-3m-3 3l3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="topbar-popover-label">Deconnexion</span></button>`
    : ""
  
  const backupStatusLine = backupStatus
    ? `<p class="topbar-popover-meta"><span class="topbar-popover-icon"><svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="topbar-popover-label">${backupStatus}</span></p>`
    : ""
  const backupPopover = backupMenuOpen
    ? `
        <div class="topbar-popover" role="menu" aria-label="Backup">
          <button class="btn btn-ghost topbar-popover-item" data-action="home-backup-export" type="button"><span class="topbar-popover-icon"><svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v10m0 0l-3-3m3 3l3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span><span class="topbar-popover-label">Exporter</span></button>
          <button class="btn btn-ghost topbar-popover-item" data-action="home-backup-import" type="button"><span class="topbar-popover-icon"><svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V9m0 0l-3 3m3-3l3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 5h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span><span class="topbar-popover-label">Importer</span></button>
          <input id="home-backup-file" type="file" accept=".json" hidden />
          ${backupStatusLine}
        </div>
      `
    : ""
const popover = accountMenuOpen
    ? `
        <div class="topbar-popover" role="menu" aria-label="Compte">
          <button class="btn btn-ghost topbar-popover-item" data-action="home-cloud-save" type="button" ${saveDisabled}><span class="topbar-popover-icon"><svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18a4 4 0 0 1 .7-7.95A5.5 5.5 0 0 1 19 10a3.5 3.5 0 0 1 0 7H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 15V9m0 0l-3 3m3-3l3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="topbar-popover-label">Sauver cloud</span></button>
          <button class="btn btn-ghost topbar-popover-item" data-action="home-cloud-load" type="button" ${loadDisabled}><span class="topbar-popover-icon"><svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18a4 4 0 0 1 .7-7.95A5.5 5.5 0 0 1 19 10a3.5 3.5 0 0 1 0 7H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 9v6m0 0l-3-3m3 3l3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="topbar-popover-label">Charger cloud</span></button>
          <div class="topbar-popover-sep" role="presentation"></div>
          ${signOutButton}
          <p class="topbar-popover-meta"><span class="topbar-popover-icon"><svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="topbar-popover-label">Sauvegarde : ${lastCloudSaveLabel}</span></p>
        </div>
      `
    : ""
  return `
    <header class="topbar">
      <div class="topbar-inner layout-container">
        <div class="topbar-left">
          <h1>Plumeo</h1>
        </div>
        <div class="topbar-right">
          <div class="topbar-nav">
            <button data-action="nav-home" type="button" class="topbar-pill${homeActive}">Accueil</button>
            <button data-action="nav-editor" type="button" class="topbar-pill${editorActive}" ${editorTargetAttr} ${editorDisabled}>Editeur</button>
          </div>
          <div class="topbar-backup">
            <button
              class="topbar-pill${backupActive}"
              type="button"
              data-action="backup-toggle"
              aria-haspopup="menu"
              aria-expanded="${backupMenuOpen ? "true" : "false"}"
              title="Backup"
            >
              <span class="topbar-account-avatar">B</span>
              <span class="topbar-account-label">Backup</span>
            </button>
            ${backupPopover}
          </div>
          <div class="topbar-account">
            <button
              type="button"
              data-action="account-toggle"
              aria-haspopup="menu"
              aria-expanded="${accountMenuOpen ? "true" : "false"}"
              class="topbar-pill${accountActive}"
            >
              <span class="topbar-account-avatar">${avatarInitial}</span>
              <span class="topbar-account-label">${emailLabel}</span>
            </button>
            ${popover}
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
  homeMessage = "",
  accountMenuOpen = false,
  backupMenuOpen = false
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
  const timeTotalLabel = stats.timeSpent ? stats.timeSpent : "�"
  const timePerDayLabel = stats.timePerDay ? stats.timePerDay : "�"
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
      ${renderTopBar({ userEmail, activeRoute: "home", lastProjectId, lastCloudSaveAt, cloudBusy, accountMenuOpen, backupStatus, backupMenuOpen })}
      <div class="page dashboard">
        <main class="home-landing layout-container">
          <section class="home-hero-split">
            <div class="home-hero-copy">
              <h1 class="home-hero-title-large">Bonjour, Louis</h1>
              <blockquote class="home-hero-quote">&Eacute;crire, c'est tenter de savoir ce qu'on &eacute;crirait si on &eacute;crivait</blockquote>
              <button
                class="home-hero-cta"
                data-action="home-project-continue"
                type="button"
              >
                Continuer a ecrire
              </button>
            </div>
            <div class="home-hero-art" aria-hidden="true"></div>
          </section>
          <p class="home-hero-footnote">Texte leger</p>
        </main>
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
  statusText = "",
  editorTab = "session",
  writingNav = "chapter",
  characters = [],
  selectedCharacterId = null,
  characterFilter = "",
  characterSections = {},
  lastCloudSaveAt = null,
  cloudBusy = false,
  accountMenuOpen = false,
  backupStatus = "",
  backupMenuOpen = false
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
        <li class="chapter-item" draggable="true" data-id="${chapter.id}">
          <button
            class="list-button${isSelected ? " is-selected" : ""}"
            data-action="chapter-select"
            data-id="${chapter.id}"
          >
            ${chapter.title}
          </button>
          <button
            type="button"
            class="chapter-delete"
            data-action="chapter-delete"
            data-id="${chapter.id}"
            aria-label="Supprimer le chapitre"
            title="Supprimer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
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
          <button class="btn btn-primary"
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
          <button class="btn btn-primary" data-action="conflict-reload-server" type="button">
            Recharger serveur
          </button>
          <button data-action="conflict-duplicate-local" class="btn btn-secondary" type="button">
            Dupliquer local
          </button>
        </div>
      </div>
    `
    : ""

  const editorContent = hasChapterSelected
    ? `
      ${conflictBlock}
      <div class="field editor-field">
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
            <select id="toolbar-font-size" class="toolbar-select input input-sm" data-command="font-size" aria-label="Taille de police" title="Taille de police">
              <option value="12">12</option>
              <option value="14">14</option>
              <option value="16">16</option>
              <option value="18">18</option>
              <option value="24">24</option>
            </select>
          </div>
          <div class="toolbar-group toolbar-group-right">
            <button type="button" class="toolbar-button icon-history" data-command="undo" aria-label="Annuler" title="Annuler">
              <span aria-hidden="true">↺</span>
            </button>
            <button type="button" class="toolbar-button icon-history" data-command="redo" aria-label="Retablir" title="Retablir">
              <span aria-hidden="true">↻</span>
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

  const historyPanel = ""

  const exportButton = `
    <button
      id="project-export"
      data-action="project-export-md"
      type="button"
      class="btn btn-secondary btn-compact"
      ${hasProjectSelected ? "" : "disabled"}
      aria-disabled="${hasProjectSelected ? "false" : "true"}"
      aria-label="Exporter le projet en Markdown"
      title="Exporter le projet en Markdown"
    >
      Exporter
    </button>
  `

  const chapterTitle = hasChapterSelected ? chapterDetail?.title ?? "" : "-"
  const editorTabs = [
    { id: "session", label: "Session" },
    { id: "characters", label: "Personnages" },
    { id: "notes", label: "Notes" },
    { id: "versions", label: "Versions" }
  ]

  const editorTabContent = {
    session: "<p class=\"muted\">Aucun indicateur de session pour le moment.</p>",
    characters: `
      <div class="character-sidebar">
        <div class="character-filter">
          <label for="character-filter-input">Filtrer</label>
          <div class="character-filter-row">
            <input class="input" id="character-filter-input" type="text" placeholder="Rechercher..." />
            <button type="button" class="btn btn-secondary btn-compact">Ajouter</button>
          </div>
        </div>
        <div class="character-items">
          <button type="button" class="character-item is-active">
            <span class="character-avatar">JD</span>
            <span class="character-name">John Doe</span>
          </button>
          <button type="button" class="character-item">
            <span class="character-avatar">JD</span>
            <span class="character-name">Jane Doe</span>
          </button>
        </div>
      </div>
    `,
    notes: "<p class=\"muted\">Notes rapides a venir.</p>",
    versions: "<p class=\"muted\">Acces rapide aux versions a venir.</p>"
  }

  const filteredCharacters = characters.filter((character) => {
    if (!characterFilter.trim()) {
      return true
    }
    const needle = characterFilter.trim().toLowerCase()
    const fullName = `${character.first_name ?? ""} ${character.last_name ?? ""}`.toLowerCase()
    const nickname = (character.nickname ?? "").toLowerCase()
    return fullName.includes(needle) || nickname.includes(needle)
  })

  const effectiveSelectedId = selectedCharacterId ?? filteredCharacters[0]?.id ?? null
  const activeCharacter =
    characters.find((character) => character.id === effectiveSelectedId) ?? null
  const characterName =
    activeCharacter?.first_name || activeCharacter?.last_name
      ? `${activeCharacter?.first_name ?? ""} ${activeCharacter?.last_name ?? ""}`.trim()
      : "Personnage sans nom"
  const avatarLabel = characterName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?"
  const avatarSrc = activeCharacter?.avatar_url?.trim()
    ? activeCharacter.avatar_url.trim()
    : "/character-placeholder.svg"

  const summaryParts = []
  if (activeCharacter?.age || activeCharacter?.birth_place) {
    const ageLabel = activeCharacter?.age ? `${activeCharacter.age} ans` : ""
    const birthLabel = activeCharacter?.birth_place
      ? `ne a ${activeCharacter.birth_place}`
      : ""
    summaryParts.push([ageLabel, birthLabel].filter(Boolean).join(", "))
  }
  if (activeCharacter?.residence) {
    summaryParts.push(activeCharacter.residence)
  }

  const roleRating = Math.max(0, Math.min(5, Number(activeCharacter?.role_rating ?? 0)))

  const renderSection = (id, label, content, isOpen) => `
        <section class="character-accordion${isOpen ? " is-open" : ""}">
          <button
            type="button"
            class="character-accordion-header"
            data-action="character-toggle"
            data-section="${id}"
            aria-expanded="${isOpen}"
          >
            <span class="character-dot"></span>
            <span>${label}</span>
            <span class="character-accordion-icon" aria-hidden="true">></span>
          </button>
          ${isOpen ? `<div class="character-accordion-body">${content}</div>` : ""}
        </section>
      `

  const characterDetailPanel = activeCharacter
    ? `
      <div class="character-detail-panel">
        <div class="character-hero">
          <button type="button" class="character-hero-avatar" data-action="character-avatar" aria-label="Changer l'avatar">
            <img src="${avatarSrc}" alt="${avatarLabel}" />
          </button>
          <input id="character-avatar-input" type="file" accept="image/*" hidden />
          <div class="character-hero-info">
            <h3>${characterName}</h3>
            <ul>
              ${summaryParts.length ? summaryParts.map((item) => `<li>${item}</li>`).join("") : "<li class=\"muted\">Resume a completer.</li>"}
            </ul>
          </div>
            <div class="character-hero-meta">
              <p>Role :</p>
              <div class="character-stars" role="radiogroup" aria-label="Role">
                ${[1, 2, 3, 4, 5]
                  .map(
                    (value) => `
                  <button
                    type="button"
                    class="character-star${value <= roleRating ? " is-active" : ""}"
                    data-action="character-rate"
                    data-rating="${value}"
                    aria-label="${value} etoiles"
                  >
                    ★
                  </button>
                `
                  )
                  .join("")}
              </div>
            </div>
        </div>
        <div class="character-sections">
          ${renderSection(
            "civil",
            "Etat civil",
            `
              <div class="character-grid">
                <label>
                  <span>Prenom</span>
                  <input class="input" type="text" value="${activeCharacter.first_name ?? ""}" data-character-field="first_name" />
                </label>
                <label>
                  <span>Nom de famille</span>
                  <input class="input" type="text" value="${activeCharacter.last_name ?? ""}" data-character-field="last_name" />
                </label>
                <label>
                  <span>Surnom</span>
                  <input class="input" type="text" value="${activeCharacter.nickname ?? ""}" data-character-field="nickname" />
                </label>
                <label>
                  <span>Pronoms</span>
                  <input class="input" type="text" value="${activeCharacter.pronouns ?? ""}" data-character-field="pronouns" />
                </label>
                <label class="character-inline">
                  <span>Sexe</span>
                  <div class="character-inline-row">
                    <label><input type="radio" name="sex" value="femme" data-character-field="sex" ${activeCharacter.sex === "femme" ? "checked" : ""} />Femme</label>
                    <label><input type="radio" name="sex" value="homme" data-character-field="sex" ${activeCharacter.sex === "homme" ? "checked" : ""} />Homme</label>
                    <label><input type="radio" name="sex" value="autre" data-character-field="sex" ${activeCharacter.sex === "autre" ? "checked" : ""} />Autre</label>
                  </div>
                </label>
                <label>
                  <span>Race</span>
                  <input class="input" type="text" value="${activeCharacter.race ?? ""}" data-character-field="race" />
                </label>
                <label>
                  <span>Age</span>
                  <input class="input" type="number" value="${activeCharacter.age ?? ""}" data-character-field="age" />
                </label>
                <label>
                  <span>Date de naissance</span>
                  <input class="input" type="date" value="${activeCharacter.birth_date ?? ""}" data-character-field="birth_date" />
                </label>
                <label>
                  <span>Lieu de naissance</span>
                  <input class="input" type="text" value="${activeCharacter.birth_place ?? ""}" data-character-field="birth_place" />
                </label>
                <label>
                  <span>Lieu de residence</span>
                  <input class="input" type="text" value="${activeCharacter.residence ?? ""}" data-character-field="residence" />
                </label>
                <label>
                  <span>Occupation</span>
                  <input class="input" type="text" value="${activeCharacter.occupation ?? ""}" data-character-field="occupation" />
                </label>
              </div>
            `,
            characterSections.civil
          )}
          ${renderSection(
            "physique",
            "Physique",
            `
              <div class="character-physique">
                <div class="character-physique-preview">
                  <img
                    src="${activeCharacter.meta?.physique?.image_url?.trim() ? activeCharacter.meta.physique.image_url.trim() : "/character-placeholder.svg"}"
                    alt="Physique du personnage"
                  />
                </div>
                <button type="button" class="btn btn-secondary btn-compact" data-action="character-physique">
                  Charger une image
                </button>
                <input id="character-physique-input" type="file" accept="image/*" hidden />
              </div>
            `,
            characterSections.physique
          )}
          ${renderSection(
            "caractere",
            "Caractere",
            `
              <div class="character-grid">
                <label>
                  <span>Traits dominants</span>
                  <textarea data-character-meta="caractere" data-character-field="traits">${activeCharacter.meta?.caractere?.traits ?? ""}</textarea>
                </label>
                <label>
                  <span>Qualites</span>
                  <textarea data-character-meta="caractere" data-character-field="qualites">${activeCharacter.meta?.caractere?.qualites ?? ""}</textarea>
                </label>
                <label>
                  <span>Defauts</span>
                  <textarea data-character-meta="caractere" data-character-field="defauts">${activeCharacter.meta?.caractere?.defauts ?? ""}</textarea>
                </label>
                <label>
                  <span>Peur(s)</span>
                  <textarea data-character-meta="caractere" data-character-field="peurs">${activeCharacter.meta?.caractere?.peurs ?? ""}</textarea>
                </label>
              </div>
            `,
            characterSections.caractere
          )}
          ${renderSection(
            "profil",
            "Profil",
            `
              <div class="character-grid">
                <label class="character-inline">
                  <span>Histoire courte</span>
                  <textarea data-character-meta="profil" data-character-field="histoire">${activeCharacter.meta?.profil?.histoire ?? ""}</textarea>
                </label>
                <label>
                  <span>Objectifs</span>
                  <textarea data-character-meta="profil" data-character-field="objectifs">${activeCharacter.meta?.profil?.objectifs ?? ""}</textarea>
                </label>
                <label>
                  <span>Relations</span>
                  <textarea data-character-meta="profil" data-character-field="relations">${activeCharacter.meta?.profil?.relations ?? ""}</textarea>
                </label>
              </div>
            `,
            characterSections.profil
          )}
          ${renderSection(
            "evolution",
            "Evolution",
            `
              <div class="character-grid">
                <label class="character-inline">
                  <span>Arc</span>
                  <textarea data-character-meta="evolution" data-character-field="arc">${activeCharacter.meta?.evolution?.arc ?? ""}</textarea>
                </label>
                <label class="character-inline">
                  <span>Changements</span>
                  <textarea data-character-meta="evolution" data-character-field="changements">${activeCharacter.meta?.evolution?.changements ?? ""}</textarea>
                </label>
                <label class="character-inline">
                  <span>Etapes cles</span>
                  <textarea data-character-meta="evolution" data-character-field="etapes">${activeCharacter.meta?.evolution?.etapes ?? ""}</textarea>
                </label>
              </div>
            `,
            characterSections.evolution
          )}
          ${renderSection(
            "inventaire",
            "Inventaire",
            `
              <div class="character-grid">
                <label class="character-inline">
                  <span>Objets</span>
                  <textarea data-character-meta="inventaire" data-character-field="items">${activeCharacter.meta?.inventaire?.items ?? ""}</textarea>
                </label>
              </div>
            `,
            characterSections.inventaire
          )}
          ${renderSection(
            "possession",
            "Possession",
            `
              <div class="character-grid">
                <label class="character-inline">
                  <span>Biens & lieux</span>
                  <textarea data-character-meta="possession" data-character-field="biens">${activeCharacter.meta?.possession?.biens ?? ""}</textarea>
                </label>
              </div>
            `,
            characterSections.possession
          )}
          ${renderSection(
            "autres",
            "Autres",
            `
              <div class="character-grid">
                <label class="character-inline">
                  <span>Notes libres</span>
                  <textarea data-character-meta="autres" data-character-field="notes">${activeCharacter.meta?.autres?.notes ?? ""}</textarea>
                </label>
              </div>
            `,
            characterSections.autres
          )}
        </div>
      </div>
    `
    : `
      <div class="character-detail-panel empty">
        <p>Selectionnez un personnage.</p>
      </div>
    `

  const characterPanel = `
        <section class="panel card character-panel characters-skin">
          <div class="character-shell">
            <aside class="character-list characters-panel">
              <div class="characters-panel__header">
                <div class="characters-panel__title">
                  Personnages <span class="characters-panel__count">· ${filteredCharacters.length}</span>
                </div>
                <button type="button" class="characters-panel__create btn btn-secondary btn-compact" data-action="character-create" aria-label="Nouveau personnage" title="Nouveau personnage">
                  <span aria-hidden="true">+</span> Nouveau personnage
                </button>
              </div>
              <div class="characters-panel__search">
                <input class="input" id="character-filter" type="text" placeholder="Rechercher..." value="${characterFilter}" />
              </div>
              <div class="characters-list">
                ${
                  filteredCharacters.length
                    ? filteredCharacters
                        .map((character) => {
                          const rawName = `${character.first_name ?? ""} ${character.last_name ?? ""}`.trim()
                          const hasName = Boolean(rawName)
                          const displayName = hasName ? rawName : "Sans nom"
                          const initials = hasName
                            ? rawName
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((part) => part[0]?.toUpperCase())
                                .join("")
                            : "NP"
                          const itemAvatarSrc = character.avatar_url?.trim()
                            ? character.avatar_url.trim()
                            : "/character-placeholder.svg"
                          const subtext = hasName ? "" : `<span class="characters-item__meta">Brouillon</span>`
                          const deleteLabel = hasName
                            ? `Supprimer ${displayName}`
                            : "Supprimer ce personnage"
                          return `
                            <div class="characters-item${character.id === effectiveSelectedId ? " is-active" : ""}" data-action="character-select" data-id="${character.id}">
                              <button
                                type="button"
                                class="characters-item__main"
                                data-action="character-select"
                                data-id="${character.id}"
                              >
                                <span class="characters-item__avatar">
                                  <img src="${itemAvatarSrc}" alt="${initials}" />
                                </span>
                                <span class="characters-item__content">
                                  <span class="characters-item__name">${displayName}</span>
                                  ${subtext}
                                </span>
                              </button>
                              <button
                                type="button"
                                class="characters-item__delete"
                                data-action="character-delete"
                                data-id="${character.id}"
                                aria-label="${deleteLabel}"
                                title="Supprimer"
                              >
                                <span aria-hidden="true">×</span>
                              </button>
                            </div>
                          `
                        })
                        .join("")
                    : `<p class="muted">Aucun personnage pour le moment.
                  Cree ton premier personnage pour commencer.</p>`
                }
              </div>
            </aside>
            ${characterDetailPanel}
          </div>
        </section>
      `
  const chapterSidebar = `
        <aside class="writing-secondary">
          <section class="panel card story-panel">
            <header class="story-panel__header">
              <h3>Chapitres</h3>
              <button type="button" class="btn btn-secondary btn-compact" data-action="chapter-create" aria-label="Nouveau chapitre" title="Nouveau chapitre" ${hasProjectSelected ? "" : "disabled"}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
                              </button>
            </header>
            <div class="story-panel__divider"></div>

            <div class="story-panel__section story-panel__search">
              <div class="story-panel__search-row">
                <input class="input" id="chapter-search-input" type="text" placeholder="Rechercher..." />
              </div>
            </div>

            <div class="story-panel__section story-panel__chapters">
              <div class="story-panel__list">
                ${hasProjectSelected
                  ? hasChapters
                    ? `<ul class="list chapter-list">${chapterItems}</ul>`
                    : `<p class="muted">Cree un chapitre pour ecrire.</p>`
                  : `<p class="muted">Selectionne un projet.</p>`}
              </div>
            </div>

            <div class="story-panel__section story-panel__footer">
              <div class="story-panel__file-actions">
                <button type="button" class="btn btn-secondary btn-compact">Importer</button>
                ${exportButton}
              </div>
            </div>
          </section>
        </aside>
      `

  const characterLayoutControls = ""

  return `
    <section class="page-shell writing-page">
      ${renderTopBar({ userEmail, activeRoute: "editor", editorProjectId: selectedProjectId, lastCloudSaveAt, cloudBusy, accountMenuOpen, backupStatus, backupMenuOpen })}
      <div class="page app-shell">
        <div class="writing-layout${writingNav === "chapter" ? " with-chapter" : ""}">
        <aside class="writing-sidebar editor-sidebar">
          <section class="panel card writing-nav">
            <div class="writing-nav-header">Plumeo</div>
            <nav class="writing-nav-list" aria-label="Navigation ecriture">
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "chapter" ? " is-active" : ""}" data-action="writing-nav" data-nav="chapter" aria-label="Chapitre" title="Chapitre">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 20l4-1 11-11-3-3-11 11-1 4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                    <path d="M14 6l3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Chapitre</span>
              </button>
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "characters" ? " is-active" : ""}" data-action="writing-nav" data-nav="characters" aria-label="Personnages" title="Personnages">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
                    <path d="M5 20c1.6-3.2 5-5 7-5s5.4 1.8 7 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Personnages</span>
              </button>
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "structure" ? " is-active" : ""}" data-action="writing-nav" data-nav="structure" aria-label="Structurer son recit" title="Structurer son recit">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M6 4h12v4H6zM6 10h12v10H6z" fill="none" stroke="currentColor" stroke-width="1.6"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Structurer son recit</span>
              </button>
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "documents" ? " is-active" : ""}" data-action="writing-nav" data-nav="documents" aria-label="Documents" title="Documents">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M6 4h9l3 3v13H6z" fill="none" stroke="currentColor" stroke-width="1.6"/>
                    <path d="M9 11h6M9 15h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Documents</span>
              </button>
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "encyclopedia" ? " is-active" : ""}" data-action="writing-nav" data-nav="encyclopedia" aria-label="Encyclopedie" title="Encyclopedie">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M6 4h12v16H6z" fill="none" stroke="currentColor" stroke-width="1.6"/>
                    <path d="M9 7h6M9 11h6M9 15h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Encyclopedie</span>
              </button>
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "images" ? " is-active" : ""}" data-action="writing-nav" data-nav="images" aria-label="Generateur d'images" title="Generateur d'images">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="4" y="6" width="16" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
                    <path d="M8 10l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Generateur d'images</span>
              </button>
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "mindmap" ? " is-active" : ""}" data-action="writing-nav" data-nav="mindmap" aria-label="Carte mentale" title="Carte mentale">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
                    <circle cx="16" cy="16" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
                    <path d="M9.5 9.5l5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Carte mentale</span>
              </button>
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "appendix" ? " is-active" : ""}" data-action="writing-nav" data-nav="appendix" aria-label="Luminaires & Annexes" title="Luminaires & Annexes">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M6 5h9a3 3 0 0 1 3 3v11H6z" fill="none" stroke="currentColor" stroke-width="1.6"/>
                    <path d="M6 8h12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Luminaires &amp; Annexes</span>
              </button>
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "goals" ? " is-active" : ""}" data-action="writing-nav" data-nav="goals" aria-label="Objectifs & stats" title="Objectifs & stats">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 19V9m7 10V5m7 14v-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Objectifs &amp; stats</span>
              </button>
            </nav>
          </section>
        </aside>

        ${writingNav === "chapter" ? chapterSidebar : ""}

        <main class="writing-editor">
        ${
          writingNav === "characters"
            ? characterPanel
            : `
            <section class="panel card editor ${hasChapterSelected ? "" : "is-disabled"}">
              <div class="panel-header">
                <span id="status-text" class="status">${statusText}</span>
              </div>
              <div class="editor-body">
                ${editorContent}
              </div>
            </section>
          `
        }
        </main>
        </div>
        ${historyPanel}
        
      </div>
    </section>
  `
}





