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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
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
    favoriteTime: null,
    favoriteTimeStatus: null
  }
  const withDash = (value, formatter) =>
    value === null || value === undefined ? "--" : formatter(value)
  const formatMinutes = (value) => {
    if (!Number.isFinite(value)) {
      return ""
    }
    const minutes = Math.round(value)
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remaining = minutes % 60
    return remaining ? `${hours} h ${remaining} min` : `${hours} h`
  }
  const timeUnavailableLabel = "Non disponible"
  const hasTimeSpent = Number.isFinite(stats.timeSpent)
  const hasTimePerDay = Number.isFinite(stats.timePerDay)
  const timeSpentLabel = hasTimeSpent
    ? formatMinutes(stats.timeSpent)
    : timeUnavailableLabel
  const timePerDayLabel = hasTimePerDay
    ? formatMinutes(stats.timePerDay)
    : timeUnavailableLabel
  const timePerDaySuffix = hasTimePerDay ? " / jour" : ""
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
  const favoriteStatus = stats.favoriteTimeStatus ??
    (stats.favoriteTime ? "ok" : "unavailable")
  const favoriteLabel =
    favoriteStatus === "ok"
      ? stats.favoriteTime
      : favoriteStatus === "insufficient"
        ? "Non determine"
        : "Non disponible"
  const favoriteVisualLabel =
    favoriteStatus === "ok"
      ? stats.favoriteTime
      : favoriteStatus === "insufficient"
        ? "Donnees insuffisantes"
        : "Aucune donnee pour le moment"
  const favoriteNote = favoriteStatus === "unavailable"
    ? "<span class=\"home-analysis-insight-note\">Mesure via vos sessions de focus.</span>"
    : ""

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
                        <span class="home-analysis-kpi-value">${timeSpentLabel}</span>
                        <span class="home-analysis-kpi-meta">${timePerDayLabel}${timePerDaySuffix}</span>
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
                    <div class="home-analysis-insight-visual">
                      <span class="${favoriteStatus === "ok" ? "home-analysis-insight-label" : "home-analysis-insight-empty"}">${favoriteVisualLabel}</span>
                    </div>
                    <p class="home-analysis-insight-text">Moment pr&eacute;f&eacute;r&eacute; pour &eacute;crire : ${favoriteLabel}${favoriteNote}</p>
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

function getRectEdgeIntersection(rect, fromPoint, toPoint) {
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
  mindmapDeleteConfirmId = null,
  mindmapContextMenu = null,
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
    linked: "li&eacute; &agrave;",
    conflict: "conflit",
    appears: "appara&icirc;t dans",
    cause: "cause-cons&eacute;quence"
  }

  const edgesMarkup = edges
    .filter((edge) => visibleIds.has(edge.fromNodeId) && visibleIds.has(edge.toNodeId))
    .map((edge) => {
      const fromNode = nodes.find((node) => node.id === edge.fromNodeId)
      const toNode = nodes.find((node) => node.id === edge.toNodeId)
      if (!fromNode || !toNode) {
        return ""
      }
      const fromRect = { x: fromNode.x, y: fromNode.y, width: nodeWidth, height: nodeHeight }
      const toRect = { x: toNode.x, y: toNode.y, width: nodeWidth, height: nodeHeight }
      const fromCenter = { x: fromRect.x + fromRect.width / 2, y: fromRect.y + fromRect.height / 2 }
      const toCenter = { x: toRect.x + toRect.width / 2, y: toRect.y + toRect.height / 2 }
      const start = getRectEdgeIntersection(fromRect, fromCenter, toCenter)
      const end = getRectEdgeIntersection(toRect, toCenter, fromCenter)
      const x1 = start.x
      const y1 = start.y
      const x2 = end.x
      const y2 = end.y
      const label = edgeLabels[edge.type] ?? edge.type ?? ""
      const mx = (x1 + x2) / 2
      const my = (y1 + y2) / 2
      const nx = y1 - y2
      const ny = x2 - x1
      const nLen = Math.hypot(nx, ny) || 1
      const offset = 8
      const lx = mx + (nx / nLen) * offset
      const ly = my + (ny / nLen) * offset
      return `
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />
        ${label ? `<text x="${lx}" y="${ly}" class="mindmap-edge-label">${label}</text>` : ""}
      `
    })
    .join("")

  const typeLabels = {
    chapter: "Chapitre",
    character: "Personnage",
    place: "Lieu",
    theme: "Th&egrave;me",
    event: "&Eacute;v&eacute;nement",
    note: "Id&eacute;e"
  }

  const nodesMarkup = visibleNodes
    .map((node) => {
      const isActive = node.id === selectedNodeId
      const isSource = node.id === linkSourceId
      const isFlash = node.id === flashNodeId
      const typeLabel = typeLabels[node.type] ?? "Id&eacute;e"
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
          <h3>N&oelig;ud : ${selectedNode.title || "Sans titre"}</h3>
        </header>
        <div class="mindmap-sidebar-body">
          <label class="field"><span>Titre</span>
            <input class="input" type="text" value="${selectedNode.title}" data-mindmap-field="title" data-id="${selectedNode.id}" />
          </label>
          <label class="field"><span>Type du n&oelig;ud</span>
            <select class="input" data-mindmap-field="type" data-id="${selectedNode.id}">
              ${["chapter", "character", "place", "theme", "event", "note"]
                .map(
                  (value) =>
                    `<option value="${value}" ${value === selectedNode.type ? "selected" : ""}>${typeLabels[value]}</option>`
                )
                .join("")}
            </select>
          </label>
          <label class="field"><span>R&eacute;sum&eacute;</span>
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
        <div class="mindmap-sidebar-actions">
          <div class="mindmap-sidebar-divider"></div>
          <button type="button" class="btn btn-danger" data-action="mindmap-delete-node" data-id="${selectedNode.id}">Supprimer</button>
        </div>
      </aside>
    `
    : `
      <aside class="mindmap-sidebar">
        <div class="mindmap-empty">
          <h3>S&eacute;lectionne un n&oelig;ud</h3>
          <p>Choisis un n&oelig;ud pour afficher ses d&eacute;tails.</p>
        </div>
      </aside>
    `

  const linkMenu = linkTypeMenu?.open
    ? `
        <div class="mindmap-link-menu" style="transform: translate(${linkTypeMenu.x}px, ${linkTypeMenu.y}px);">
          <button type="button" data-action="mindmap-link-type" data-type="linked">li&eacute; &agrave;</button>
          <button type="button" data-action="mindmap-link-type" data-type="conflict">conflit</button>
          <button type="button" data-action="mindmap-link-type" data-type="appears">appara&icirc;t dans</button>
          <button type="button" data-action="mindmap-link-type" data-type="cause">cause-cons&eacute;quence</button>
          <button type="button" data-action="mindmap-link-cancel">Valider</button>
        </div>
      `
    : ""

  const contextMenu = mindmapContextMenu?.open
    ? `
        <div class="mindmap-context-menu" style="left: ${mindmapContextMenu.x}px; top: ${mindmapContextMenu.y}px;">
          <button type="button" class="btn btn-primary" data-action="mindmap-context-add-node">+ N&oelig;ud</button>
          <button type="button" class="btn btn-secondary" data-action="mindmap-context-link">+ Lien</button>
        </div>
      `
    : ""

  const deleteConfirm = selectedNodeId && mindmapDeleteConfirmId === selectedNodeId
  const confirmTitle = selectedNode?.title || "Sans titre"

  return `
    <section class="panel card mindmap-panel">
      <header class="mindmap-toolbar">
        <div class="mindmap-toolbar-left">
          <h2>Carte mentale &mdash; Projet : ${projectTitle}</h2>
          <p class="mindmap-subtitle">Visualise la structure de ton r&eacute;cit</p>
        </div>
        <div class="mm-controls">
          <div class="mm-controls__group mm-controls__group--actions">
            <button type="button" class="btn btn-primary" data-action="mindmap-add-node">+ N&oelig;ud</button>
            <button type="button" class="btn btn-secondary${mode === "link" ? " is-active" : ""}" data-action="mindmap-link-mode">+ Lien</button>
          </div>
          <div class="mm-controls__group mm-controls__group--type">
            <label class="mm-controls__field">
              <span>Type du nouveau n&oelig;ud</span>
              <select id="mindmap-create-type" class="input" data-action="mindmap-create-type">
                ${["chapter", "character", "place", "theme", "event", "note"]
                  .map(
                    (value) =>
                      `<option value="${value}" ${value === createType ? "selected" : ""}>${typeLabels[value]}</option>`
                  )
                  .join("")}
              </select>
            </label>
          </div>
          <div class="mm-controls__group mm-controls__group--nav">
            <label class="mm-controls__field">
              <span>Recherche</span>
              <div class="mm-controls__row">
                <input class="input" type="text" id="mindmap-search" placeholder="Rechercher..." value="${search}" />
                <button type="button" class="btn btn-secondary mm-controls__recenter" data-action="mindmap-reset" title="Centrer la carte sur l'ensemble des n&oelig;uds">Recentrer</button>
              </div>
            </label>
          </div>
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
            ${contextMenu}
          </div>
        </div>
        ${detailPanel}
      </div>
      ${
        deleteConfirm
          ? `
        <div class="mindmap-confirm-backdrop" role="dialog" aria-modal="true">
          <div class="mindmap-confirm">
            <h3>Supprimer le n&oelig;ud &quot;${confirmTitle}&quot;&nbsp;?</h3>
            <p>Cette action est d&eacute;finitive.</p>
            <div class="mindmap-confirm-actions">
              <button type="button" class="btn btn-ghost" data-action="mindmap-delete-cancel">Annuler</button>
              <button type="button" class="btn btn-danger" data-action="mindmap-delete-confirm" data-id="${selectedNodeId}">Supprimer</button>
            </div>
          </div>
        </div>
      `
          : ""
      }
    </section>
  `
}

function renderKnowledgePreview(content = "") {
  const regex = /\[\[([^\]]+)\]\]/g
  let cursor = 0
  let html = ""
  let match
  while ((match = regex.exec(content)) !== null) {
    const before = content.slice(cursor, match.index)
    html += escapeHtml(before)
    const raw = match[1] ?? ""
    const pipeIndex = raw.indexOf("|")
    const titleRaw = pipeIndex === -1 ? raw : raw.slice(0, pipeIndex)
    const aliasRaw = pipeIndex === -1 ? "" : raw.slice(pipeIndex + 1)
    const title = titleRaw.trim()
    const label = (aliasRaw.trim() || title).trim()
    if (title) {
      html += `<button type="button" class="knowledge-link" data-action="knowledge-open-link" data-title="${encodeURIComponent(title)}">${escapeHtml(label)}</button>`
    } else {
      html += escapeHtml(match[0])
    }
    cursor = regex.lastIndex
  }
  html += escapeHtml(content.slice(cursor))
  return html.replace(/\n/g, "<br>")
}

function renderKnowledgeGraphPanel(graph = {}, details = {}) {
  const {
    nodes = [],
    edges = [],
    selectedNodeId = null,
    view = { offsetX: 0, offsetY: 0, scale: 1 },
    search = "",
    minDegree = 0,
    showOrphans = false,
    blockedMessage = "",
    panelCollapsed = false,
    settingsOpen = false
  } = graph
  const outgoingCount = details.outgoing?.length ?? 0
  const incomingCount = details.backlinks?.length ?? 0
  const totalCount = outgoingCount + incomingCount

  const dotSizes = { sm: 10, md: 14, lg: 18 }
  const degreeValues = nodes
    .map((node) => node.degree ?? 0)
    .sort((a, b) => a - b)
  const degreeIndex = (ratio) =>
    degreeValues.length ? degreeValues[Math.floor((degreeValues.length - 1) * ratio)] : 0
  const lowCut = degreeIndex(0.33)
  const highCut = degreeIndex(0.66)
  const getDotTier = (degree) => {
    if (!degreeValues.length || lowCut === highCut) {
      return "md"
    }
    if (degree <= lowCut) {
      return "sm"
    }
    if (degree >= highCut) {
      return "lg"
    }
    return "md"
  }
  const getDotSize = (degree) => dotSizes[getDotTier(degree)] ?? dotSizes.md
  const sizeById = new Map(nodes.map((node) => [node.id, getDotSize(node.degree ?? 0)]))
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const neighborIds = new Set()

  if (selectedNodeId) {
    edges.forEach((edge) => {
      if (edge.fromId === selectedNodeId) {
        neighborIds.add(edge.toId)
      } else if (edge.toId === selectedNodeId) {
        neighborIds.add(edge.fromId)
      }
    })
  }

  const edgesMarkup = edges
    .map((edge) => {
      const fromNode = nodeById.get(edge.fromId)
      const toNode = nodeById.get(edge.toId)
      if (!fromNode || !toNode) {
        return ""
      }
      const fromSize = sizeById.get(edge.fromId) ?? dotSizes.md
      const toSize = sizeById.get(edge.toId) ?? dotSizes.md
      const fromRect = { x: fromNode.x, y: fromNode.y, width: fromSize, height: fromSize }
      const toRect = { x: toNode.x, y: toNode.y, width: toSize, height: toSize }
      const fromCenter = { x: fromRect.x + fromRect.width / 2, y: fromRect.y + fromRect.height / 2 }
      const toCenter = { x: toRect.x + toRect.width / 2, y: toRect.y + toRect.height / 2 }
      const start = getRectEdgeIntersection(fromRect, fromCenter, toCenter)
      const end = getRectEdgeIntersection(toRect, toCenter, fromCenter)
      let edgeClass = "graph-edge"
      if (selectedNodeId) {
        if (edge.fromId === selectedNodeId) {
          edgeClass += " is-outgoing"
        } else if (edge.toId === selectedNodeId) {
          edgeClass += " is-incoming"
        } else {
          edgeClass += " is-dim"
        }
      }
      return `
        <line class="${edgeClass}" data-from="${edge.fromId}" data-to="${edge.toId}" x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" />
      `
    })
    .join("")

  const nodesMarkup = nodes
    .map((node) => {
      const isActive = node.id === selectedNodeId
      const isNeighbor = neighborIds.has(node.id)
      let nodeClass = "mindmap-node graph-node"
      if (isActive) {
        nodeClass += " is-active"
      } else if (isNeighbor) {
        nodeClass += " is-neighbor"
      } else if (selectedNodeId) {
        nodeClass += " is-dim"
      }
      const tier = getDotTier(node.degree ?? 0)
      nodeClass += ` graph-node--${tier}`
      const size = sizeById.get(node.id) ?? dotSizes.md
      return `
        <button
          type="button"
          class="${nodeClass}"
          data-action="mindmap-node"
          data-id="${node.id}"
          data-title="${encodeURIComponent(node.title || "Sans titre")}"
          aria-label="${escapeHtml(node.title)}"
          style="transform: translate(${node.x}px, ${node.y}px); width: ${size}px; height: ${size}px;"
        >
          <span class="mindmap-node-title">${escapeHtml(node.title || "Sans titre")}</span>
        </button>
      `
    })
    .join("")

  const outgoingItems = (details.outgoing ?? [])
    .map((item) => {
      const countLabel = item.count > 1 ? `<span class="graph-link-count">x${item.count}</span>` : ""
      return `
        <button type="button" class="graph-link" data-action="wiki-graph-select" data-id="${item.id}">
          <span>${escapeHtml(item.title)}</span>
          ${countLabel}
        </button>
      `
    })
    .join("")

  const backlinksItems = (details.backlinks ?? [])
    .map((item) => {
      const contexts = (item.contexts ?? [])
        .map((snippet) => `<p class="graph-backlink-context">${escapeHtml(snippet)}</p>`)
        .join("")
      return `
        <div class="graph-backlink-item">
          <button type="button" class="graph-link" data-action="wiki-graph-select" data-id="${item.id}">
            <span>${escapeHtml(item.title || "Sans titre")}</span>
          </button>
          ${contexts}
        </div>
      `
    })
    .join("")

  const settingsMenuClass = `graph-settings-menu${settingsOpen ? " is-open" : ""}`
  const settingsExpanded = settingsOpen ? "true" : "false"


  const graphBody = blockedMessage
    ? `<div class="graph-blocked">${escapeHtml(blockedMessage)}</div>`
    : nodes.length
    ? `
        <div class="knowledge-graph-body">
          <div class="knowledge-graph-canvas">
            <div class="mindmap-canvas wiki-graph-canvas" data-action="mindmap-canvas">
              <div class="mindmap-viewport wiki-graph-viewport" style="transform: translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.scale});">
                <svg class="mindmap-edges graph-edges" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  ${edgesMarkup}
                </svg>
                ${nodesMarkup}
              </div>
            </div>
          </div>
        </div>
      `
    : `<div class="graph-blocked">Aucune note a afficher pour le moment.</div>`

  return `
    <div class="knowledge-graph">
      <div class="graph-settings">
        <button
          type="button"
          class="graph-settings-toggle"
          data-action="wiki-graph-settings-toggle"
          aria-expanded="${settingsExpanded}"
          aria-controls="graph-settings-menu"
        >
          &#x2699;
        </button>
        <div id="graph-settings-menu" class="${settingsMenuClass}" role="menu">
          <label class="graph-settings-field">
            <span>Recherche</span>
            <input
              id="wiki-graph-search"
              class="input"
              type="text"
              placeholder="Recherche"
              aria-label="Recherche"
              value="${escapeHtml(search)}"
            />
          </label>
          <div class="graph-settings-field" aria-label="Min connexions">
            <span>Min connexions</span>
            <div class="graph-settings-thresholds">
              <button type="button" class="graph-threshold${Number(minDegree) === 0 ? " is-active" : ""}" data-action="wiki-graph-min" data-value="0">Tous</button>
              <button type="button" class="graph-threshold${Number(minDegree) === 1 ? " is-active" : ""}" data-action="wiki-graph-min" data-value="1">1+</button>
              <button type="button" class="graph-threshold${Number(minDegree) === 2 ? " is-active" : ""}" data-action="wiki-graph-min" data-value="2">2+</button>
              <button type="button" class="graph-threshold${Number(minDegree) === 3 ? " is-active" : ""}" data-action="wiki-graph-min" data-value="3">3+</button>
              <button type="button" class="graph-threshold${Number(minDegree) === 5 ? " is-active" : ""}" data-action="wiki-graph-min" data-value="5">5+</button>
            </div>
          </div>
          <label class="graph-settings-toggle-field" title="Afficher orphelines">
            <input id="wiki-graph-orphans" type="checkbox" ${showOrphans ? "checked" : ""} />
            <span>Orphelines</span>
          </label>
        </div>
      </div>
      ${graphBody}
      <div id="graph-tooltip" class="graph-tooltip" role="tooltip" aria-hidden="true"></div>
    </div>
  `
}

function renderKnowledgePanel({
  projectTitle = "",
  notes = [],
  activeNote = null,
  backlinks = [],
  hasAnyNotes = false,
  titleDrafts = {},
  titleError = "",
  duplicates = [],
  renameBusy = false,
  search = "",
  sort = "recent",
  previewOpen = false,
  autocomplete = { open: false },
  tab = "notes",
  graph = {},
  graphDetails = {}
} = {}) {
  const activeTab = tab === "graph" ? "graph" : "notes"
  const hasNotes = notes.length > 0
  const activeId = activeNote?.id ?? null
  const noteTitle = activeNote?.title ?? ""
  const noteContent = activeNote?.content ?? ""
  const listItems = notes
    .map((note) => {
      const isActive = note.id === activeId
      const draftTitle = titleDrafts[note.id]
      const displayTitle = draftTitle !== undefined ? draftTitle : note.title
      const updatedLabel = formatIdeaMetaDate(note.updated_at)
      return `
        <button type="button" class="knowledge-note-item${isActive ? " is-active" : ""}" data-action="knowledge-select" data-id="${note.id}">
          <span class="knowledge-note-title">${escapeHtml(displayTitle || "Sans titre")}</span>
          <span class="knowledge-note-meta">${updatedLabel || ""}</span>
        </button>
      `
    })
    .join("")

  const emptyListMessage = search.trim()
    ? "Aucune note ne correspond &agrave; la recherche."
    : "Aucune note pour l&apos;instant."

  const listPanel = hasNotes
    ? listItems
    : hasAnyNotes
    ? `
        <div class="knowledge-empty">
          <p>${emptyListMessage}</p>
        </div>
      `
    : `
        <div class="knowledge-empty">
          <p>${emptyListMessage}</p>
          <button type="button" class="btn btn-secondary" data-action="knowledge-create">Cr&eacute;er la premi&egrave;re note</button>
        </div>
      `

  const titleValue =
    activeId && Object.prototype.hasOwnProperty.call(titleDrafts, activeId)
      ? titleDrafts[activeId]
      : noteTitle

  const editorPanel = activeNote
    ? `
        <div class="knowledge-editor">
          <div class="knowledge-editor-header">
            <label class="field knowledge-title-field">
              <span>Titre</span>
              <input id="knowledge-title" class="input" type="text" value="${escapeHtml(titleValue)}" data-id="${activeNote.id}"${titleError ? ' aria-invalid="true"' : ""} />
              <p id="knowledge-title-error" class="knowledge-title-error${titleError ? " is-visible" : ""}">${escapeHtml(titleError)}</p>
            </label>
            <button type="button" class="btn btn-secondary knowledge-preview-toggle" data-action="knowledge-preview-toggle">
              ${previewOpen ? "Editer" : "Aper&ccedil;u"}
            </button>
          </div>
          <div class="knowledge-editor-body">
            ${
              previewOpen
                ? `<div class="knowledge-preview">${renderKnowledgePreview(noteContent)}</div>`
                : `<textarea id="knowledge-content" class="input knowledge-content" rows="14" data-id="${activeNote.id}" placeholder="&Eacute;cris en Markdown. Utilise [[Titre]] pour lier une note.">${escapeHtml(noteContent)}</textarea>`
            }
            <div id="knowledge-autocomplete" class="knowledge-autocomplete${autocomplete.open ? " is-open" : ""}"></div>
          </div>
          <div class="knowledge-editor-footer">
            <button type="button" class="btn btn-danger danger-hover" data-action="knowledge-delete" data-id="${activeNote.id}">Supprimer</button>
          </div>
        </div>
      `
    : `
        <div class="knowledge-empty knowledge-empty--editor">
          <h3>S&eacute;lectionne une note</h3>
          <p>Ou cr&eacute;e la premi&egrave;re pour d&eacute;marrer ton wiki.</p>
          <button type="button" class="btn btn-primary" data-action="knowledge-create">+ Nouvelle note</button>
        </div>
      `

  const backlinkItems = backlinks
    .map((note) => {
      const contexts = (note.contexts ?? [])
        .map((snippet) => `<p class="knowledge-backlink-context">${escapeHtml(snippet)}</p>`)
        .join("")
      return `
        <div class="knowledge-backlink-item">
          <button type="button" class="knowledge-backlink" data-action="knowledge-select" data-id="${note.id}">
            <span>${escapeHtml(note.title || "Sans titre")}</span>
          </button>
          ${contexts}
        </div>
      `
    })
    .join("")

  const backlinksPanel = backlinkItems
    ? backlinkItems
    : `<p class="knowledge-empty">Aucun lien entrant pour l&apos;instant.</p>`

  const duplicatesPanel = duplicates.length
    ? `
        <div class="knowledge-duplicates">
          <div class="knowledge-duplicates-title">Doublons detectes</div>
          ${duplicates
            .map((group) => {
              const rows = group.notes
                .slice(1)
                .map(
                  (note) => `
                    <div class="knowledge-duplicate-row">
                      <span>${escapeHtml(note.title || "Sans titre")}</span>
                      <button type="button" class="btn btn-secondary btn-compact" data-action="knowledge-duplicate-rename" data-id="${note.id}">Renommer</button>
                    </div>
                  `
                )
                .join("")
              return `
                <div class="knowledge-duplicate-group">
                  <div class="knowledge-duplicate-label">${escapeHtml(group.title || "Sans titre")}</div>
                  ${rows}
                </div>
              `
            })
            .join("")}
        </div>
      `
    : ""

  const tabsMarkup = `
      <div class="knowledge-tabs" role="tablist" aria-label="Connaissance">
        <button type="button" class="knowledge-tab${activeTab === "notes" ? " is-active" : ""}" data-action="knowledge-tab" data-tab="notes" role="tab" aria-selected="${activeTab === "notes" ? "true" : "false"}">Notes</button>
        <button type="button" class="knowledge-tab${activeTab === "graph" ? " is-active" : ""}" data-action="knowledge-tab" data-tab="graph" role="tab" aria-selected="${activeTab === "graph" ? "true" : "false"}">Graphe</button>
      </div>
    `

  const notesLayout = `
      ${duplicatesPanel}
      <div class="knowledge-layout">
        <aside class="knowledge-sidebar">
          <div class="knowledge-sidebar-controls">
            <input id="knowledge-search" class="input" type="text" placeholder="Rechercher..." value="${escapeHtml(search)}" />
            <div class="knowledge-sidebar-actions">
              <button type="button" class="btn btn-primary" data-action="knowledge-create">+ Nouvelle note</button>
              <button type="button" class="btn btn-secondary" data-action="knowledge-sort-toggle">
                ${sort === "alpha" ? "R&eacute;cents" : "A-Z"}
              </button>
            </div>
          </div>
          <div class="knowledge-list">
            ${listPanel}
          </div>
        </aside>
        <section class="knowledge-main">
          ${editorPanel}
        </section>
        <aside class="knowledge-backlinks">
          <h3>Li&eacute; depuis</h3>
          ${backlinksPanel}
        </aside>
      </div>
    `

  const graphLayout =
    activeTab === "graph" ? renderKnowledgeGraphPanel(graph, graphDetails) : ""

  return `
    <section class="panel card knowledge-panel${activeTab === "graph" ? " knowledge-panel--graph" : ""}">
      <header class="knowledge-header">
        <div>
          <h2>Connaissance</h2>
          <p class="knowledge-subtitle">Projet : ${escapeHtml(projectTitle)}</p>
          ${renameBusy ? `<p class="knowledge-busy">Mise a jour des liens...</p>` : ""}
        </div>
        ${tabsMarkup}
      </header>
      ${activeTab === "graph" ? graphLayout : notesLayout}
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
  knowledgeNotes = [],
  knowledgeActiveNote = null,
  knowledgeBacklinks = [],
  knowledgeHasNotes = false,
  knowledgeSearch = "",
  knowledgeSort = "recent",
  knowledgeTab = "notes",
  knowledgePreviewOpen = false,
  knowledgeAutocomplete = { open: false },
  knowledgeTitleDrafts = {},
  knowledgeTitleError = "",
  knowledgeDuplicates = [],
  knowledgeRenameBusy = false,
  wikiGraph = {},
  wikiGraphDetails = { note: null, outgoing: [], backlinks: [] },
  focusActive = false,
  focusButtonLabel = "▶ Démarrer le focus",
  focusIndicatorLabel = "",
  mindmapNodes = [],
  mindmapEdges = [],
  mindmapSelectedNodeId = null,
  mindmapMode = "select",
  mindmapLinkSourceId = null,
  mindmapSearch = "",
  mindmapCreateType = "note",
  mindmapLinkTypeMenu = null,
  mindmapFlashNodeId = null,
  mindmapDeleteConfirmId = null,
  mindmapContextMenu = null,
  mindmapView = { offsetX: 0, offsetY: 0, scale: 1 },
  projectStatsView = null,
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
      ideas: "Idees",
      stats: "Statistiques",
      knowledge: "Connaissance"
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
            <button
              type="button"
              class="focus-toggle${focusActive ? " is-active" : ""}"
              data-action="focus-toggle"
              aria-pressed="${focusActive ? "true" : "false"}"
            >
              <span class="focus-toggle-label">${focusButtonLabel}</span>
            </button>
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
    mindmapDeleteConfirmId,
    mindmapContextMenu,
    view: mindmapView,
    chapters,
    characters
  })
  const knowledgePanel = renderKnowledgePanel({
    projectTitle: projectTitleLabel,
    notes: knowledgeNotes,
    activeNote: knowledgeActiveNote,
    backlinks: knowledgeBacklinks,
    hasAnyNotes: knowledgeHasNotes,
    titleDrafts: knowledgeTitleDrafts,
    titleError: knowledgeTitleError,
    duplicates: knowledgeDuplicates,
    renameBusy: knowledgeRenameBusy,
    search: knowledgeSearch,
    sort: knowledgeSort,
    tab: knowledgeTab,
    previewOpen: knowledgePreviewOpen,
    autocomplete: knowledgeAutocomplete,
    graph: wikiGraph,
    graphDetails: wikiGraphDetails
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

  const statsPanel = (() => {
    const stats = projectStatsView
    if (!stats) {
      return `
        <section class="panel card stats-panel">
          <header class="stats-header">
            <div>
              <h2>Statistiques</h2>
              <p class="muted">Projet : ${projectTitleLabel}</p>
            </div>
          </header>
          <p class="muted">Chargement des statistiques...</p>
        </section>
      `
    }

    const totalWords = stats.totalWords ?? 0
    const totalChapters = stats.totalChapters ?? 0
    const daysActive = stats.daysActive ?? 0
    const hasAnyWriting = totalChapters > 0
    const timeSpentLabel = stats.timeSpentMinutes ? `${stats.timeSpentMinutes} min` : "—"
    const timeSpentNote = stats.timeSpentMinutes
      ? ""
      : "Tes sessions appara&icirc;tront ici d&egrave;s que tu utiliseras le focus."
    const timePerDayLabel = stats.timePerDayMinutes ? `${stats.timePerDayMinutes} min` : "—"
    const wordsPerDayLabel = stats.wordsPerDay ? `${stats.wordsPerDay} mots / jour` : "—"
    const lastActivity = stats.lastActivity
    const lastActivityDate = lastActivity?.timestamp
      ? formatDate(new Date(lastActivity.timestamp).toISOString())
      : "Aucune activit&eacute;"
    const lastActivityWords = lastActivity ? `${lastActivity.words} mots` : ""

    const series = stats.series ?? []
    const chart =
      series.length > 0
        ? (() => {
            const width = 420
            const height = 140
            const max = Math.max(...series.map((item) => item.words), 1)
            const gap = 6
            const barWidth = Math.max(8, (width - gap * (series.length - 1)) / series.length)
            const bars = series
              .map((item, index) => {
                const h = Math.round((item.words / max) * (height - 20))
                const x = Math.round(index * (barWidth + gap))
                const y = height - h
                return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="4"></rect>`
              })
              .join("")
            return `
              <svg class="stats-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolution des mots">
                ${bars}
              </svg>
            `
          })()
        : `
          <div class="stats-evolution-placeholder">
            <div class="stats-evolution-dots">
              <span></span><span></span><span></span><span></span>
            </div>
            <p class="stats-empty">Ton &eacute;volution appara&icirc;tra ici d&egrave;s tes premi&egrave;res sessions d&apos;&eacute;criture.</p>
          </div>
        `

    const maxWords = Math.max(...(stats.chapters ?? []).map((chapter) => chapter.words), 1)
    const chapterRows = (stats.chapters ?? [])
      .map((chapter, index) => {
        const label = chapter.title || `Chapitre ${index + 1}`
        const percent = Math.round((chapter.words / maxWords) * 100)
        return `
          <div class="stats-chapter-row">
            <div class="stats-chapter-meta">
              <span class="stats-chapter-title">${label}</span>
              <span class="stats-chapter-words">${chapter.words} mots</span>
            </div>
            <div class="stats-chapter-bar">
              <span style="width: ${percent}%;"></span>
            </div>
          </div>
        `
      })
      .join("")

    const rhythmBlock = daysActive
      ? `
          <div class="stats-rhythm">
            <div>
              <span class="stats-rhythm-label">Moyenne</span>
              <span class="stats-rhythm-value">${wordsPerDayLabel}</span>
              <span class="stats-rhythm-meta">${timePerDayLabel} / jour</span>
            </div>
            <div class="stats-rhythm-item stats-rhythm-item--last">
              <span class="stats-rhythm-label">Derni&egrave;re activit&eacute;</span>
              <span class="stats-rhythm-value">${lastActivityDate}</span>
              <span class="stats-rhythm-meta">${lastActivityWords}</span>
            </div>
          </div>
        `
      : `<p class="stats-empty">Ton rythme se dessinera naturellement au fil des jours.</p>`

    const chaptersBlock =
      (stats.chapters ?? []).length > 0
        ? `
          <div class="stats-chapters">
            ${chapterRows}
          </div>
        `
        : `<p class="stats-empty">Commence &agrave; &eacute;crire pour voir appara&icirc;tre tes statistiques.</p>`

    return `
      <section class="panel card stats-panel">
        <header class="stats-header">
          <div>
            <h2>Statistiques</h2>
            <p class="stats-subtitle">Projet : ${projectTitleLabel}</p>
            <p class="stats-note">Donn&eacute;es calcul&eacute;es automatiquement &agrave; partir de l&apos;&eacute;criture.</p>
            ${!hasAnyWriting ? `<p class="stats-empty">Commence &agrave; &eacute;crire pour voir appara&icirc;tre tes statistiques.</p>` : ""}
          </div>
        </header>
        <section class="stats-kpis">
          <div class="stats-kpi">
            <span class="stats-kpi__value">${timeSpentLabel}</span>
            <span class="stats-kpi__label">Temps d&apos;&eacute;criture</span>
            ${timeSpentNote ? `<span class="stats-kpi__note">${timeSpentNote}</span>` : ""}
          </div>
          <div class="stats-kpi">
            <span class="stats-kpi__value">${totalWords}</span>
            <span class="stats-kpi__label">Mots &eacute;crits</span>
          </div>
          <div class="stats-kpi">
            <span class="stats-kpi__value">${totalChapters}</span>
            <span class="stats-kpi__label">Chapitres</span>
          </div>
          <div class="stats-kpi">
            <span class="stats-kpi__value">${daysActive}</span>
            <span class="stats-kpi__label">Jours actifs</span>
          </div>
        </section>
        <section class="stats-section">
          <h3>Rythme</h3>
          ${rhythmBlock}
        </section>
        <section class="stats-section">
          <h3>&Eacute;volution dans le temps</h3>
          ${chart}
        </section>
        <section class="stats-section">
          <h3>R&eacute;partition par chapitre</h3>
          ${chaptersBlock}
        </section>
      </section>
    `
  })()

  return `
    <section class="page-shell writing-page${writingNav === "knowledge" && knowledgeTab === "graph" ? " writing-page--graph" : ""}">
      ${renderTopBar({ userEmail, activeRoute: "projects", lastProjectId: selectedProjectId, lastCloudSaveAt, cloudStatus, cloudBusy, accountMenuOpen, backupStatus, backupMenuOpen })}
    <div class="page app-shell">
        <div class="writing-layout${writingNav === "chapter" ? " with-chapter" : ""}${writingNav === "stats" ? " has-stats" : ""}${writingNav === "knowledge" && knowledgeTab === "graph" ? " writing-layout--graph" : ""}">
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
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "knowledge" ? " is-active" : ""}" data-action="writing-nav" data-nav="knowledge" aria-label="Connaissance" title="Connaissance">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M6 4h10a2 2 0 0 1 2 2v12a1 1 0 0 1-1 1H7a2 2 0 0 0-2 2V6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                    <path d="M6 8h8M6 12h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Connaissance</span>
              </button>
              <button type="button" class="writing-nav-item editor-sidebar__item${writingNav === "stats" ? " is-active" : ""}" data-action="writing-nav" data-nav="stats" aria-label="Statistiques" title="Statistiques">
                <span class="writing-nav-icon editor-sidebar__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 18V9m7 9V6m7 12v-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M4 18h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="editor-sidebar__label">Statistiques</span>
              </button>
            </nav>
          </section>
        </aside>

        ${writingNav === "chapter" ? chapterSidebar : ""}

        <main class="writing-editor${writingNav === "inspiration" ? " writing-editor--wide" : ""}${writingNav === "ideas" ? " writing-editor--ideas" : ""}${writingNav === "mindmap" ? " writing-editor--mindmap" : ""}${writingNav === "knowledge" ? " writing-editor--knowledge" : ""}${writingNav === "stats" ? " writing-editor--stats" : ""}${writingNav === "knowledge" && knowledgeTab === "graph" ? " writing-editor--knowledge-graph" : ""}">
        ${
          writingNav === "characters"
            ? characterPanel
            : writingNav === "inspiration"
            ? inspirationPanel
            : writingNav === "ideas"
            ? ideasPanel
            : writingNav === "mindmap"
            ? mindmapPanel
            : writingNav === "knowledge"
            ? knowledgePanel
            : writingNav === "stats"
            ? statsPanel
            : `
            <section class="panel card editor ${hasChapterSelected ? "" : "is-disabled"}">
              <div class="panel-header editor-header">
                <div class="editor-header-left">
                  <span class="chapter-title">${escapeHtml(chapterTitle || "Sans titre")}</span>
                  <span id="focus-indicator" class="focus-indicator${focusActive ? " is-active" : ""}">${focusIndicatorLabel}</span>
                </div>
                <div class="editor-header-right">
                  <span id="status-text" class="status">${statusText}</span>
                  <span id="editor-word-count" class="status"></span>
                </div>
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








