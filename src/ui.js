const ASSET_BASE = import.meta.env.BASE_URL || "/"

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

function formatIdeaMetaDate(value) {
  if (!value) {
    return ""
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  const dayLabel = date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short"
  })
  const timeLabel = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  })
  return `${dayLabel} ${timeLabel}`
}

function renderTopBar({
  userEmail = "",
  activeRoute = "home",
  lastProjectId = null,
  lastCloudSaveAt = null,
  cloudStatus = "",
  cloudBusy = false,
  accountMenuOpen = false,
  backupStatus = "",
  backupMenuOpen = false
} = {}) {
  const homeActive = activeRoute === "home" ? " is-active" : ""
  const projectsActive = activeRoute === "projects" ? " is-active" : ""
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
  const cloudStatusPill = cloudStatus
    ? `<span class="status topbar-cloud-status">${cloudStatus}</span>`
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
            <button data-action="nav-projects" type="button" class="topbar-pill${projectsActive}">Projets</button>
          </div>
          ${cloudStatusPill}
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
    totalWords: null,
    wordsPerDay: null,
    pagesTotal: null,
    pagesPerDay: null,
    timeSpent: null,
    timePerDay: null,
    favoriteTime: null
  }
  const withDash = (value, formatter) =>
    value === null || value === undefined ? "--" : formatter(value)
  const wordsTotalLabel = withDash(stats.totalWords, (value) => `${value} mots`)
  const wordsPerDayLabel = withDash(
    stats.wordsPerDay,
    (value) => `${value} mots`
  )
  const pagesTotalLabel = withDash(stats.pagesTotal, (value) => `${value}`)
  const pagesPerDayLabel = withDash(
    stats.pagesPerDay,
    (value) => `${value.toFixed(1)} pages`
  )

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
          <button class="project-card-delete danger-hover" data-action="home-project-delete" data-id="${project.id}" type="button" aria-label="Supprimer le projet" title="Supprimer">
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
      ${renderTopBar({ userEmail, activeRoute: "home", lastProjectId, lastCloudSaveAt, cloudStatus, cloudBusy, accountMenuOpen, backupStatus, backupMenuOpen })}
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
          <section id="home-next" class="home-next" aria-hidden="true"></section>
          <section id="home-analysis" class="home-analysis">
            <div class="analysis-frame">
              <div class="analysis-frame-header">
                <h2 class="analysis-title">Analyse</h2>
              </div>
              <div class="analysis-frame-body">
                <div class="home-analysis-left">
                  <img
                    class="home-analysis-illustration"
                    src="${ASSET_BASE}assets/illustrations/analysis.png"
                    alt="Illustration des statistiques d'ecriture"
                    loading="lazy"
                  />
                </div>
                <div class="home-analysis-right">
                  <section class="home-analysis-card">
                    <h3>Vos statistiques d'&eacute;criture</h3>
                    <div class="home-analysis-kpis">
                      <div class="home-analysis-kpi">
                        <span class="home-analysis-kpi-label">Temps pass&eacute; &agrave; &eacute;crire</span>
                        <span class="home-analysis-kpi-value">${stats.timeSpent ?? "--"}</span>
                        <span class="home-analysis-kpi-meta">${stats.timePerDay ?? "--"} / jour</span>
                      </div>
                      <div class="home-analysis-kpi">
                        <span class="home-analysis-kpi-label">Nombre total de mots</span>
                        <span class="home-analysis-kpi-value">${wordsTotalLabel ?? "--"}</span>
                        <span class="home-analysis-kpi-meta">${wordsPerDayLabel ?? "--"} / jour</span>
                      </div>
                      <div class="home-analysis-kpi">
                        <span class="home-analysis-kpi-label">Nombre total de pages</span>
                        <span class="home-analysis-kpi-value">${pagesTotalLabel ?? "--"}</span>
                        <span class="home-analysis-kpi-meta">${pagesPerDayLabel ?? "--"} / jour</span>
                      </div>
                    </div>
                  </section>
                  <section class="home-analysis-card home-analysis-insight">
                    <h3>Moment pr&eacute;f&eacute;r&eacute; pour &eacute;crire</h3>
                    <div class="home-analysis-insight-visual"></div>
                    <p class="home-analysis-insight-text">Moment pr&eacute;f&eacute;r&eacute; pour &eacute;crire : ${stats.favoriteTime ?? "--"}</p>
                  </section>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </section>
  `
}

function renderIdeasContent({
  ideas = [],
  selectedIdeaId = null,
  ideasQuery = "",
  ideasTagFilter = "",
  ideasStatusFilter = "all",
  ideasSort = "desc",
  ideasFiltersOpen = false,
  ideasNoteExpanded = false
} = {}) {
  const selectedIdea = ideas.find((idea) => idea.id === selectedIdeaId) ?? null
  const statusLabels = {
    raw: "Brute",
    used: "Exploitee",
    abandoned: "Abandonnee"
  }

  const ideaItems = ideas
    .map((idea) => {
      const content = idea.content?.trim() || "Sans contenu"
      const excerpt = content.length > 80 ? `${content.slice(0, 77)}...` : content
      const createdLabel = formatIdeaMetaDate(idea.created_at)
      const statusLabel = statusLabels[idea.status] ?? "Brute"
      const statusHtml = `<span class="ideas-item__status status-${idea.status}">${statusLabel}</span>`
      const tagCount = Array.isArray(idea.tags) ? idea.tags.length : 0
      const tagLabel = tagCount === 1
        ? `tags: ${idea.tags[0]}`
        : tagCount > 1
          ? `tags: +${tagCount}`
          : ""
      const metaParts = [
        createdLabel,
        statusHtml,
        tagLabel
      ].filter(Boolean)
      return `
        <button type="button" class="ideas-item${idea.id === selectedIdeaId ? " is-selected" : ""}" data-action="ideas-select" data-id="${idea.id}">
          <span class="ideas-item__line1">${excerpt}</span>
          <span class="ideas-item__meta">${metaParts.join(" · ")}</span>
        </button>
      `
    })
    .join("")

  const noteValue = selectedIdea?.note ?? ""
  const hasNote = Boolean(noteValue.trim())
  const noteToggleLabel = ideasNoteExpanded
    ? "Masquer la note"
    : hasNote
      ? "Afficher la note"
      : "Ajouter une note"

  const detailPanel = selectedIdea
    ? `
        <div class="ideas-detail-body">
          <textarea
            class="ideas-detail-input"
            rows="8"
            data-idea-field="content"
            data-id="${selectedIdea.id}"
            placeholder="Ecris ton idee..."
          >${selectedIdea.content ?? ""}</textarea>
          <div class="ideas-detail-meta">
            <label class="ideas-meta-field">
              <span>Statut</span>
              <select class="input" data-idea-field="status" data-id="${selectedIdea.id}">
                <option value="raw"${selectedIdea.status === "raw" ? " selected" : ""}>Brute</option>
                <option value="used"${selectedIdea.status === "used" ? " selected" : ""}>Exploitee</option>
                <option value="abandoned"${selectedIdea.status === "abandoned" ? " selected" : ""}>Abandonnee</option>
              </select>
            </label>
            <label class="ideas-meta-field">
              <span>Tags</span>
              <input class="input" type="text" value="${(selectedIdea.tags ?? []).join(", ")}" data-idea-field="tags" data-id="${selectedIdea.id}" placeholder="tag1, tag2" />
            </label>
          </div>
          <div class="ideas-detail-note">
            <button type="button" class="btn btn-ghost ideas-note-toggle" data-action="ideas-note-toggle">
              ${noteToggleLabel}
            </button>
            ${
              ideasNoteExpanded
                ? `<textarea class="input ideas-note-input" rows="3" data-idea-field="note" data-id="${selectedIdea.id}" placeholder="Note">${noteValue}</textarea>`
                : ""
            }
          </div>
          <div class="ideas-detail-footer">
            <div class="ideas-detail-actions">
              <button type="button" class="btn btn-secondary" disabled>Associer a un projet</button>
              <button type="button" class="btn btn-secondary" disabled>Transformer en chapitre</button>
            </div>
            <button type="button" class="btn btn-danger ideas-delete danger-hover" data-action="ideas-delete" data-id="${selectedIdea.id}">Supprimer</button>
          </div>
        </div>
      `
    : `
        <div class="ideas-detail-empty">
          <h3>Selectionne une idee</h3>
          <p>La idee apparaitra ici pour etre enrichie.</p>
        </div>
      `

  const filtersPanel = ideasFiltersOpen
    ? `
        <div class="ideas-filters-panel" id="ideas-filters-panel">
          <label class="field">
            <span>Tag</span>
            <input id="ideas-tag-filter" class="input" type="text" placeholder="Tag" value="${ideasTagFilter}" />
          </label>
          <label class="field">
            <span>Statut</span>
            <select id="ideas-status-filter" class="input">
              <option value="all"${ideasStatusFilter === "all" ? " selected" : ""}>Tous</option>
              <option value="raw"${ideasStatusFilter === "raw" ? " selected" : ""}>Brute</option>
              <option value="used"${ideasStatusFilter === "used" ? " selected" : ""}>Exploitee</option>
              <option value="abandoned"${ideasStatusFilter === "abandoned" ? " selected" : ""}>Abandonnee</option>
            </select>
          </label>
          <label class="field">
            <span>Tri</span>
            <select id="ideas-sort" class="input">
              <option value="desc"${ideasSort === "desc" ? " selected" : ""}>Plus recentes</option>
              <option value="asc"${ideasSort === "asc" ? " selected" : ""}>Plus anciennes</option>
            </select>
          </label>
        </div>
      `
    : ""

  return `
    <section class="ideas-create panel card">
      <h3>Ajouter une idee</h3>
      <textarea
        id="ideas-create-input"
        class="input ideas-create-input"
        rows="3"
        placeholder="Une phrase, une scene, un concept, une question..."
        aria-label="Ajouter une idee"
      ></textarea>
      <div class="ideas-create-hint">↵ Entree pour ajouter</div>
    </section>

    <section class="ideas-controls">
      <div class="ideas-controls-main">
        <input id="ideas-search" class="input" type="text" placeholder="Rechercher..." value="${ideasQuery}" />
        <button
          type="button"
          class="btn btn-ghost ideas-filters-toggle"
          data-action="ideas-filters-toggle"
          aria-expanded="${ideasFiltersOpen ? "true" : "false"}"
          aria-controls="ideas-filters-panel"
        >
          Filtres v
        </button>
      </div>
      ${filtersPanel}
    </section>

    <div class="ideas-layout ideas-layout--master-detail">
      <div class="ideas-list">
        ${ideaItems || `<p class="ideas-empty">Ajoute une idee ci-dessus.</p>`}
      </div>
      <div class="ideas-detail">
        ${detailPanel}
      </div>
    </div>
  `
}

export function renderIdeas({
  userEmail = "",
  ideas = [],
  selectedIdeaId = null,
  ideasQuery = "",
  ideasTagFilter = "",
  ideasStatusFilter = "all",
  ideasSort = "desc",
  ideasFiltersOpen = false,
  ideasNoteExpanded = false,
  lastProjectId = null,
  lastCloudSaveAt = null,
  cloudStatus = "",
  cloudBusy = false,
  accountMenuOpen = false,
  backupStatus = "",
  backupMenuOpen = false
} = {}) {
  const ideasContent = renderIdeasContent({
    ideas,
    selectedIdeaId,
    ideasQuery,
    ideasTagFilter,
    ideasStatusFilter,
    ideasSort,
    ideasFiltersOpen,
    ideasNoteExpanded
  })

  return `
    <section class="page ideas-page">
      ${renderTopBar({ userEmail, activeRoute: "ideas", lastProjectId, lastCloudSaveAt, cloudStatus, cloudBusy, accountMenuOpen, backupStatus, backupMenuOpen })}
      <main class="ideas-content layout-container">
        ${ideasContent}
      </main>
    </section>
  `
}

export function renderProjects({
  userEmail = "",
  projects = [],
  projectStats = {},
  projectsMenuOpenId = null,
  editingProjectId = null,
  lastProjectId = null,
  lastCloudSaveAt = null,
  cloudStatus = "",
  cloudBusy = false,
  accountMenuOpen = false,
  backupStatus = "",
  backupMenuOpen = false
} = {}) {
  const hasProjects = projects.length > 0
  const statusLabels = {
    active: "Actif",
    paused: "En pause",
    done: "Termine",
    archived: "Archive"
  }
  const cards = projects
    .map((project) => {
      const stats = projectStats[project.id] ?? {}
      const updatedLabel = stats.updatedAt
        ? formatIdeaMetaDate(stats.updatedAt)
        : project.created_at
          ? formatIdeaMetaDate(project.created_at)
          : "—"
      const chapterLabel = typeof stats.chapterCount === "number"
        ? stats.chapterCount
        : "—"
      const wordLabel = typeof stats.wordCount === "number"
        ? stats.wordCount
        : "—"
      const chapterText = chapterLabel === "—"
        ? "—"
        : `${chapterLabel} chapitre${chapterLabel === 1 ? "" : "s"}`
      const wordText = wordLabel === "—"
        ? "—"
        : `${wordLabel} mot${wordLabel === 1 ? "" : "s"}`
      const status = project.status ?? "active"
      const statusLabel = statusLabels[status] ?? "Actif"
      const isActive = project.id === lastProjectId
      const activeBadge = isActive
        ? `<span class="project-badge">Actif</span>`
        : ""
      const statusBadge = status !== "active"
        ? `<span class="project-status status-${status}">${statusLabel}</span>`
        : ""
      const isEditing = editingProjectId === project.id
      const titleMarkup = isEditing
        ? `
            <div class="project-title-edit">
              <input
                class="project-edit-input"
                data-action="projects-rename-input"
                data-id="${project.id}"
                type="text"
                value="${project.title ?? ""}"
                placeholder="Sans titre"
                spellcheck="false"
              />
              <div class="project-title-actions">
                <button type="button" class="btn btn-secondary btn-compact" data-action="projects-rename-confirm" data-id="${project.id}">OK</button>
                <button type="button" class="btn btn-ghost btn-compact" data-action="projects-rename-cancel" data-id="${project.id}">Annuler</button>
              </div>
            </div>
            ${activeBadge}
            ${statusBadge}
          `
        : `
            <h3>${project.title ?? "Sans titre"}</h3>
            ${activeBadge}
            ${statusBadge}
          `
      const menuOpen = projectsMenuOpenId === project.id
      const menu = menuOpen
        ? `
            <div class="project-menu" role="menu" aria-label="Actions projet">
              <button type="button" class="project-menu-item" data-action="projects-rename" data-id="${project.id}">Renommer</button>
              <button type="button" class="project-menu-item" data-action="projects-status" data-id="${project.id}" data-status="active">Actif</button>
              <button type="button" class="project-menu-item" data-action="projects-status" data-id="${project.id}" data-status="paused">En pause</button>
              <button type="button" class="project-menu-item" data-action="projects-status" data-id="${project.id}" data-status="done">Termine</button>
              <button type="button" class="project-menu-item" data-action="projects-status" data-id="${project.id}" data-status="archived">Archive</button>
              <button type="button" class="project-menu-item danger-hover" data-action="projects-delete" data-id="${project.id}">Supprimer</button>
            </div>
          `
        : ""
      return `
        <article
          class="project-card project-card--projects${isActive ? " is-active" : ""}"
          data-action="projects-open"
          data-id="${project.id}"
          role="button"
          tabindex="0"
        >
          <div class="project-card-main">
            <div class="project-card-title">
              ${titleMarkup}
            </div>
            <div class="project-card-meta">
              <span class="project-card-info">Derniere modification : ${updatedLabel} · ${chapterText} · ${wordText}</span>
            </div>
          </div>
          <div class="project-card-actions">
            <button class="project-menu-toggle" type="button" data-action="projects-menu-toggle" data-id="${project.id}" aria-haspopup="menu" aria-expanded="${menuOpen ? "true" : "false"}" aria-label="Menu projet">⋯</button>
            ${menu}
          </div>
        </article>
      `
    })
    .join("")

  const emptyState = `
      <div class="projects-empty">
        <p>Aucun projet pour le moment.</p>
        <button class="btn btn-secondary" data-action="projects-create" type="button">+ Nouveau projet</button>
      </div>
    `

  return `
    <section class="page projects-page">
      ${renderTopBar({ userEmail, activeRoute: "projects", lastProjectId, lastCloudSaveAt, cloudStatus, cloudBusy, accountMenuOpen, backupStatus, backupMenuOpen })}
      <main class="projects-content layout-container">
        <header class="projects-header">
          <h2>Projets</h2>
          <button class="btn btn-secondary" data-action="projects-create" type="button">+ Nouveau projet</button>
        </header>
        <section class="projects-grid">
          ${hasProjects ? cards : emptyState}
        </section>
      </main>
    </section>
  `
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function getUrlDomain(value) {
  try {
    const url = new URL(value)
    return url.hostname.replace(/^www\./, "")
  } catch (error) {
    return value
  }
}

function renderInspirationTags(tags = []) {
  if (!tags.length) {
    return ""
  }
  const visible = tags.slice(0, 2)
  const extra = tags.length - visible.length
  const chips = visible
    .map((tag) => `<span class="inspiration-tag">${tag}</span>`)
    .join("")
  const extraChip = extra > 0 ? `<span class="inspiration-tag">+${extra}</span>` : ""
  return `<div class="inspiration-tags">${chips}${extraChip}</div>`
}

function renderInspirationPanel({
  projectTitle = "-",
  inspirationItems = [],
  inspirationSearch = "",
  inspirationTag = "",
  inspirationModal = null,
  inspirationDetailId = null,
  chapters = [],
  characters = []
} = {}) {
  const normalizedSearch = normalizeText(inspirationSearch)
  const filtered = inspirationItems.filter((item) => {
    const text = [
      item.title,
      item.note,
      item.url,
      ...(item.tags ?? [])
    ]
      .map((part) => normalizeText(part))
      .join(" ")
    const matchesSearch = normalizedSearch ? text.includes(normalizedSearch) : true
    const matchesTag = inspirationTag ? (item.tags ?? []).includes(inspirationTag) : true
    return matchesSearch && matchesTag
  })
  const tagOptions = Array.from(
    new Set(inspirationItems.flatMap((item) => item.tags ?? []))
  )

  const cards = filtered.length
    ? filtered
        .map((item) => {
          const isImage = item.type === "image"
          const isVideo = item.type === "video"
          const preview = isImage
            ? `<img src="${item.image_data}" alt="" loading="lazy" />`
            : `<div class="inspiration-preview-icon">
                <span>${isVideo ? "Video" : "Lien"}</span>
                <span class="inspiration-preview-domain">${getUrlDomain(item.url)}</span>
              </div>`
          const title = item.title?.trim() || getUrlDomain(item.url) || "Sans titre"
          return `
            <article class="inspiration-card" data-action="inspiration-open" data-id="${item.id}">
              <div class="inspiration-preview${isImage ? " is-image" : ""}">
                ${preview}
              </div>
              <div class="inspiration-card-body">
                <h4 class="inspiration-card-title">${title}</h4>
                ${renderInspirationTags(item.tags ?? [])}
                <div class="inspiration-card-actions">
                  <button type="button" class="btn btn-ghost" data-action="inspiration-edit" data-id="${item.id}">Modifier</button>
                  <button type="button" class="btn btn-ghost danger-hover" data-action="inspiration-delete" data-id="${item.id}">Supprimer</button>
                </div>
              </div>
            </article>
          `
        })
        .join("")
    : `<p class="muted">Aucune inspiration pour ce projet.</p>`

  const totalCount = inspirationItems.length
  const countLabel = `${totalCount} inspiration${totalCount > 1 ? "s" : ""}`

  const modalOpen = inspirationModal?.open
  const modalStep = inspirationModal?.step ?? "type"
  const modalType = inspirationModal?.type ?? ""
  const modalDraft = inspirationModal?.draft ?? {}
  const modalTitle = inspirationModal?.mode === "edit" ? "Modifier" : "Ajouter"
  const imagePreview = modalDraft.image_data
    ? `<div class="inspiration-preview is-image"><img src="${modalDraft.image_data}" alt="" /></div>`
    : ""

  const modalBody =
    modalStep === "type"
      ? `
          <div class="inspiration-modal-options">
            <button type="button" class="btn btn-secondary" data-action="inspiration-choose-type" data-type="image">Image</button>
            <button type="button" class="btn btn-secondary" data-action="inspiration-choose-type" data-type="link">Lien</button>
            <button type="button" class="btn btn-secondary" data-action="inspiration-choose-type" data-type="video">Video</button>
          </div>
        `
      : `
          <form class="inspiration-form">
            ${modalType === "image" ? `<label class="field"><span>Image</span><input id="inspiration-image-input" type="file" accept="image/*" /></label>${imagePreview}` : ""}
            ${modalType !== "image" ? `<label class="field"><span>URL</span><input id="inspiration-url" class="input" type="url" value="${modalDraft.url ?? ""}" placeholder="https://..." /></label>` : ""}
            <label class="field"><span>Titre</span><input id="inspiration-title" class="input" type="text" value="${modalDraft.title ?? ""}" placeholder="Titre (optionnel)" /></label>
            <label class="field"><span>Tags</span><input id="inspiration-tags" class="input" type="text" value="${(modalDraft.tags ?? []).join(", ")}" placeholder="tag1, tag2" /></label>
            <label class="field"><span>Note</span><textarea id="inspiration-note" class="input" rows="3" placeholder="Note">${modalDraft.note ?? ""}</textarea></label>
            <label class="field"><span>Lie a un chapitre</span>
              <select id="inspiration-link-chapter" class="input">
                <option value="">Aucun</option>
                ${chapters
                  .map((chapter) => `<option value="${chapter.id}" ${modalDraft.linkedChapterId === chapter.id ? "selected" : ""}>${chapter.title || "Sans titre"}</option>`)
                  .join("")}
              </select>
            </label>
            <label class="field"><span>Lie a un personnage</span>
              <select id="inspiration-link-character" class="input">
                <option value="">Aucun</option>
                ${characters
                  .map((character) => {
                    const rawName = `${character.first_name ?? ""} ${character.last_name ?? ""}`.trim()
                    const name = rawName || "Sans nom"
                    return `<option value="${character.id}" ${modalDraft.linkedCharacterId === character.id ? "selected" : ""}>${name}</option>`
                  })
                  .join("")}
              </select>
            </label>
          </form>
        `

  const modal = modalOpen
    ? `
        <div class="inspiration-modal-backdrop" role="dialog" aria-modal="true">
          <div class="inspiration-modal">
            <header class="inspiration-modal-header">
              <h3>${modalTitle}</h3>
            </header>
            <div class="inspiration-modal-body">
              ${modalBody}
            </div>
            <footer class="inspiration-modal-actions">
              <button type="button" class="btn btn-ghost" data-action="inspiration-cancel">Annuler</button>
              ${modalStep === "form" ? `<button type="button" class="btn btn-primary" data-action="inspiration-save">Enregistrer</button>` : ""}
            </footer>
          </div>
        </div>
      `
    : ""

  const detailItem = inspirationItems.find((item) => item.id === inspirationDetailId)
  const detailView = detailItem
    ? `
        <div class="inspiration-modal-backdrop" role="dialog" aria-modal="true">
          <div class="inspiration-modal">
            <header class="inspiration-modal-header">
              <h3>${detailItem.title || getUrlDomain(detailItem.url) || "Sans titre"}</h3>
            </header>
            <div class="inspiration-modal-body">
              ${detailItem.type === "image"
                ? `<div class="inspiration-preview is-image"><img src="${detailItem.image_data}" alt="" /></div>`
                : `<div class="inspiration-preview">${getUrlDomain(detailItem.url)}</div>`}
              ${detailItem.note ? `<p>${detailItem.note}</p>` : ""}
              ${renderInspirationTags(detailItem.tags ?? [])}
            </div>
            <footer class="inspiration-modal-actions">
              <button type="button" class="btn btn-ghost" data-action="inspiration-close">Fermer</button>
              <button type="button" class="btn btn-secondary" data-action="inspiration-edit" data-id="${detailItem.id}">Modifier</button>
              <button type="button" class="btn btn-danger danger-hover" data-action="inspiration-delete" data-id="${detailItem.id}">Supprimer</button>
            </footer>
          </div>
        </div>
      `
    : ""

  return `
    <section class="panel inspiration-panel">
      <header class="inspiration-header">
        <div class="inspiration-header-main">
          <h2 class="inspiration-title">Inspiration — Projet : ${projectTitle}</h2>
          <span class="inspiration-count">${countLabel}</span>
        </div>
        <div class="inspiration-actions">
          <button type="button" class="btn btn-primary inspiration-create" data-action="inspiration-add">+ Ajouter</button>
          <label class="inspiration-field" for="inspiration-search">
            <span>Rechercher</span>
            <input id="inspiration-search" class="input" type="text" placeholder="Rechercher..." value="${inspirationSearch}" />
          </label>
          <label class="inspiration-field" for="inspiration-tag-filter">
            <span>Tags</span>
            <select id="inspiration-tag-filter" class="input">
              <option value="">Tous les tags</option>
              ${tagOptions
                .map((tag) => `<option value="${tag}" ${tag === inspirationTag ? "selected" : ""}>${tag}</option>`)
                .join("")}
            </select>
          </label>
        </div>
      </header>
      <div class="inspiration-grid">
        ${cards}
      </div>
      ${modal}
      ${detailView}
    </section>
  `
}


function renderMindmapPanel({
  projectTitle = "-",
  nodes = [],
  edges = [],
  selectedNodeId = null,
  mode = "select",
  linkSourceId = null,
  search = "",
  createType = "note",
  linkTypeMenu = null,
  flashNodeId = null,
  view = { offsetX: 0, offsetY: 0, scale: 1 },
  chapters = [],
  characters = []
} = {}) {
  const nodeWidth = 180
  const nodeHeight = 64
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null

  const normalizedSearch = normalizeText(search)
  const visibleNodes = normalizedSearch
    ? nodes.filter((node) => {
        const haystack = [
          node.title,
          node.summary,
          ...(node.tags ?? [])
        ]
          .filter(Boolean)
          .join(" ")
        return normalizeText(haystack).includes(normalizedSearch)
      })
    : nodes

  const visibleIds = new Set(visibleNodes.map((node) => node.id))

  const edgeLabels = {
    linked: "lie a",
    conflict: "conflit",
    appears: "apparait dans",
    cause: "cause-consequence"
  }

  const edgesMarkup = edges
    .filter((edge) => visibleIds.has(edge.fromNodeId) && visibleIds.has(edge.toNodeId))
    .map((edge) => {
      const fromNode = nodes.find((node) => node.id === edge.fromNodeId)
      const toNode = nodes.find((node) => node.id === edge.toNodeId)
      if (!fromNode || !toNode) {
        return ""
      }
      const x1 = fromNode.x + nodeWidth / 2
      const y1 = fromNode.y + nodeHeight / 2
      const x2 = toNode.x + nodeWidth / 2
      const y2 = toNode.y + nodeHeight / 2
      const label = edgeLabels[edge.type] ?? edge.type ?? ""
      const mx = (x1 + x2) / 2
      const my = (y1 + y2) / 2
      return `
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />
        ${label ? `<text x="${mx}" y="${my}" class="mindmap-edge-label">${label}</text>` : ""}
      `
    })
    .join("")

  const typeLabels = {
    chapter: "Chapitre",
    character: "Personnage",
    place: "Lieu",
    theme: "Theme",
    event: "Evenement",
    note: "Idee"
  }

  const nodesMarkup = visibleNodes
    .map((node) => {
      const isActive = node.id === selectedNodeId
      const isSource = node.id === linkSourceId
      const isFlash = node.id === flashNodeId
      const typeLabel = typeLabels[node.type] ?? "Idee"
      return `
        <button
          type="button"
          class="mindmap-node node--${node.type}${isActive ? " is-active" : ""}${isSource ? " is-source" : ""}${isFlash ? " is-flash" : ""}"
          data-action="mindmap-node"
          data-id="${node.id}"
          style="transform: translate(${node.x}px, ${node.y}px);"
          aria-label="${node.title}"
        >
          <span class="mindmap-node-title">${node.title}</span>
          <span class="mindmap-node-type">${typeLabel}</span>
        </button>
      `
    })
    .join("")

  const chapterOptions = (selectedId) =>
    chapters
      .map((chapter) => {
        const selected = chapter.id === selectedId ? "selected" : ""
        return `<option value="${chapter.id}" ${selected}>${chapter.title || "Sans titre"}</option>`
      })
      .join("")
  const characterOptions = (selectedId) =>
    characters
      .map((character) => {
        const rawName = `${character.first_name ?? ""} ${character.last_name ?? ""}`.trim()
        const name = rawName || "Sans nom"
        const selected = character.id === selectedId ? "selected" : ""
        return `<option value="${character.id}" ${selected}>${name}</option>`
      })
      .join("")

  const detailPanel = selectedNode
    ? `
      <aside class="mindmap-sidebar">
        <header class="mindmap-sidebar-header">
          <h3>${selectedNode.title}</h3>
          <button type="button" class="btn btn-ghost danger-hover" data-action="mindmap-delete-node" data-id="${selectedNode.id}">Supprimer</button>
        </header>
        <div class="mindmap-sidebar-body">
          <label class="field"><span>Titre</span>
            <input class="input" type="text" value="${selectedNode.title}" data-mindmap-field="title" data-id="${selectedNode.id}" />
          </label>
          <label class="field"><span>Type</span>
            <select class="input" data-mindmap-field="type" data-id="${selectedNode.id}">
              ${["chapter", "character", "place", "theme", "event", "note"]
                .map((value) => `<option value="${value}" ${value === selectedNode.type ? "selected" : ""}>${value}</option>`)
                .join("")}
            </select>
          </label>
          <label class="field"><span>Resume</span>
            <textarea class="input" rows="3" data-mindmap-field="summary" data-id="${selectedNode.id}">${selectedNode.summary ?? ""}</textarea>
          </label>
          <label class="field"><span>Tags</span>
          <input class="input" type="text" value="${(selectedNode.tags ?? []).join(", ")}" data-mindmap-field="tags" data-id="${selectedNode.id}" placeholder="tag1, tag2" />
          </label>
          <label class="field"><span>Lier un chapitre</span>
            <select class="input" data-mindmap-field="linkedChapterId" data-id="${selectedNode.id}">
              <option value="">Aucun</option>
              ${chapterOptions(selectedNode.linkedChapterId)}
            </select>
          </label>
          <label class="field"><span>Lier un personnage</span>
            <select class="input" data-mindmap-field="linkedCharacterId" data-id="${selectedNode.id}">
              <option value="">Aucun</option>
              ${characterOptions(selectedNode.linkedCharacterId)}
            </select>
          </label>
          ${(selectedNode.linkedChapterId || selectedNode.linkedCharacterId)
            ? `<button type="button" class="btn btn-secondary" data-action="mindmap-open-source" data-id="${selectedNode.id}">Ouvrir la source</button>`
            : ""}
        </div>
      </aside>
    `
    : `
      <aside class="mindmap-sidebar">
        <div class="mindmap-empty">
          <h3>Carte mentale</h3>
          <ul>
            <li>Double-clique pour creer un noeud</li>
            <li>Glisse un noeud pour le deplacer</li>
            <li>Relie deux noeuds pour creer un lien</li>
          </ul>
          <p>Utilise la carte pour voir la structure, pas pour ecrire tout le texte.</p>
        </div>
      </aside>
    `

  const linkMenu = linkTypeMenu?.open
    ? `
        <div class="mindmap-link-menu" style="transform: translate(${linkTypeMenu.x}px, ${linkTypeMenu.y}px);">
          <button type="button" data-action="mindmap-link-type" data-type="linked">lie a</button>
          <button type="button" data-action="mindmap-link-type" data-type="conflict">conflit</button>
          <button type="button" data-action="mindmap-link-type" data-type="appears">apparait dans</button>
          <button type="button" data-action="mindmap-link-type" data-type="cause">cause-consequence</button>
          <button type="button" data-action="mindmap-link-cancel">valider</button>
        </div>
      `
    : ""

  return `
    <section class="panel card mindmap-panel">
      <header class="mindmap-toolbar">
        <div class="mindmap-toolbar-left">
          <h2>Carte mentale — Projet : ${projectTitle}</h2>
          <p class="mindmap-subtitle">Visualise la structure de ton recit</p>
        </div>
        <div class="mindmap-toolbar-actions">
          <button type="button" class="btn btn-primary" data-action="mindmap-add-node">+ Noeud</button>
          <select id="mindmap-create-type" class="input" data-action="mindmap-create-type">
            ${["chapter", "character", "place", "theme", "event", "note"]
              .map((value) => `<option value="${value}" ${value === createType ? "selected" : ""}>${typeLabels[value]}</option>`)
              .join("")}
          </select>
          <button type="button" class="btn btn-secondary${mode === "link" ? " is-active" : ""}" data-action="mindmap-link-mode">+ Lien</button>
          <input class="input" type="text" id="mindmap-search" placeholder="Rechercher..." value="${search}" />
          <button type="button" class="btn btn-ghost" data-action="mindmap-reset" title="Centrer la carte sur l'ensemble des noeuds">Recentrer</button>
        </div>
      </header>
      <div class="mindmap-body">
        <div class="mindmap-canvas" data-action="mindmap-canvas">
          <div class="mindmap-viewport" style="transform: translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.scale});">
            <svg class="mindmap-edges" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              ${edgesMarkup}
            </svg>
            ${nodesMarkup}
            ${linkMenu}
          </div>
        </div>
        ${detailPanel}
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
  inspirationItems = [],
  inspirationSearch = "",
  inspirationTag = "",
  inspirationModal = null,
  inspirationDetailId = null,
  ideas = [],
  selectedIdeaId = null,
  ideasQuery = "",
  ideasTagFilter = "",
  ideasStatusFilter = "all",
  ideasSort = "desc",
  ideasFiltersOpen = false,
  ideasNoteExpanded = false,
  mindmapNodes = [],
  mindmapEdges = [],
  mindmapSelectedNodeId = null,
  mindmapMode = "select",
  mindmapLinkSourceId = null,
  mindmapSearch = "",
  mindmapCreateType = "note",
  mindmapLinkTypeMenu = null,
  mindmapFlashNodeId = null,
  mindmapView = { offsetX: 0, offsetY: 0, scale: 1 },
  characterSections = {},
  lastCloudSaveAt = null,
  cloudStatus = "",
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
  const writingContextLabel =
    {
      chapter: "Ecriture",
      characters: "Personnages",
      inspiration: "Inspiration",
      mindmap: "Carte mentale",
      ideas: "Idees"
    }[writingNav] ?? "Ecriture"
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
            class="chapter-delete danger-hover"
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

  const ageLabel = activeCharacter?.age ? `${activeCharacter.age} ans` : ""
  const placeLabel = (activeCharacter?.residence ?? "").trim()
    || (activeCharacter?.birth_place ?? "").trim()
  const contextLine = [ageLabel, placeLabel].filter(Boolean).join(" — ")

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
            ${contextLine ? `<div class="character-meta">${contextLine}</div>` : ""}
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
            "storyRole",
            "Role dans l'histoire",
            `
              <div class="character-grid">
                <label class="character-inline">
                  <span>Role dans l'histoire</span>
                  <textarea data-character-field="storyRole" placeholder="Decris la fonction narrative du personnage...">${activeCharacter.storyRole ?? ""}</textarea>
                </label>
              </div>
            `,
            characterSections.storyRole
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
                                class="characters-item__delete danger-hover"
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
  const inspirationPanel = renderInspirationPanel({
    projectTitle: projectTitleLabel,
    inspirationItems,
    inspirationSearch,
    inspirationTag,
    inspirationModal,
    inspirationDetailId,
    chapters,
    characters
  })
  const mindmapPanel = renderMindmapPanel({
    projectTitle: projectTitleLabel,
    nodes: mindmapNodes,
    edges: mindmapEdges,
    selectedNodeId: mindmapSelectedNodeId,
    mode: mindmapMode,
    linkSourceId: mindmapLinkSourceId,
    search: mindmapSearch,
    createType: mindmapCreateType,
    linkTypeMenu: mindmapLinkTypeMenu,
    flashNodeId: mindmapFlashNodeId,
    view: mindmapView,
    chapters,
    characters
  })
  const ideasPanel = `
        <section class="ideas-panel">
          <div class="ideas-content ideas-content--embedded">
            ${renderIdeasContent({
              ideas,
              selectedIdeaId,
              ideasQuery,
              ideasTagFilter,
              ideasStatusFilter,
              ideasSort,
              ideasFiltersOpen,
              ideasNoteExpanded
            })}
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
      ${renderTopBar({ userEmail, activeRoute: "projects", lastProjectId: selectedProjectId, lastCloudSaveAt, cloudStatus, cloudBusy, accountMenuOpen, backupStatus, backupMenuOpen })}
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
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "inspiration" ? " is-active" : ""}" data-action="writing-nav" data-nav="inspiration" aria-label="Inspiration" title="Inspiration">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3a6 6 0 0 0-3 11.2V17h6v-2.8A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                    <path d="M9 21h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Inspiration</span>
              </button>
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "ideas" ? " is-active" : ""}" data-action="writing-nav" data-nav="ideas" aria-label="Idees" title="Idees">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M6 4h9l3 3v13H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                    <path d="M15 4v3h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Idees</span>
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
            </nav>
          </section>
        </aside>

        ${writingNav === "chapter" ? chapterSidebar : ""}

        <main class="writing-editor${writingNav === "inspiration" ? " writing-editor--wide" : ""}${writingNav === "ideas" ? " writing-editor--ideas" : ""}${writingNav === "mindmap" ? " writing-editor--mindmap" : ""}">
        ${
          writingNav === "characters"
            ? characterPanel
            : writingNav === "inspiration"
            ? inspirationPanel
            : writingNav === "ideas"
            ? ideasPanel
            : writingNav === "mindmap"
            ? mindmapPanel
            : `
            <section class="panel card editor ${hasChapterSelected ? "" : "is-disabled"}">
              <div class="panel-header">
                <span id="status-text" class="status">${statusText}</span>
                <span id="editor-word-count" class="status"></span>
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








