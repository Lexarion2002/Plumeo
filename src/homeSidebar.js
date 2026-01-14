export function renderHomeSidebar({
  userEmail = "",
  lastCloudSaveLabel = "—",
  cloudStatus = "",
  cloudBusy = false,
  backupStatus = ""
} = {}) {
  const isAuthed = Boolean(userEmail)
  const statusLabel = isAuthed ? "Connecte" : "Deconnecte"
  const disabledAttr = !isAuthed || cloudBusy ? "disabled" : ""
  const busyText = cloudBusy ? "true" : "false"
  const signOutButton = isAuthed
    ? `
        <button
          class="danger compact"
          type="button"
          data-action="home-sign-out"
        >
          <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 12H4m0 0l3-3m-3 3l3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Deconnexion
        </button>
      `
    : ""
  const cloudStatusLine = cloudStatus
    ? `<p class="home-cloud-status">${cloudStatus}</p>`
    : ""
  const backupStatusLine = backupStatus
    ? `<p class="home-backup-status">${backupStatus}</p>`
    : ""
  return `
    <aside class="home-sidebar" aria-label="Sidebar accueil">
      <section class="panel panel-card">
        <div class="panel-header">
          <h2>CONNEXION</h2>
        </div>
        <div class="home-auth-status">
          <span class="home-auth-dot${isAuthed ? " is-online" : ""}"></span>
          <span>${statusLabel}</span>
        </div>
        <p class="home-auth-email" title="${userEmail || "Non connecte"}">
          ${userEmail || "Non connecte"}
        </p>
        <div class="home-auth-divider" role="presentation"></div>
        <div class="home-cloud-actions" aria-live="polite">
          <button
            class="compact"
            type="button"
            data-action="home-cloud-save"
            ${disabledAttr}
            aria-disabled="${!isAuthed || cloudBusy}"
            aria-busy="${busyText}"
          >
            <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 18a4 4 0 0 1 .7-7.95A5.5 5.5 0 0 1 19 10a3.5 3.5 0 0 1 0 7H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 15V9m0 0l-3 3m3-3l3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Sauver cloud
          </button>
          <button
            class="secondary compact"
            type="button"
            data-action="home-cloud-load"
            ${disabledAttr}
            aria-disabled="${!isAuthed || cloudBusy}"
            aria-busy="${busyText}"
          >
            <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 18a4 4 0 0 1 .7-7.95A5.5 5.5 0 0 1 19 10a3.5 3.5 0 0 1 0 7H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 9v6m0 0l-3-3m3 3l3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Charger cloud
          </button>
          <p class="home-cloud-meta">Sauvegarde : ${lastCloudSaveLabel}</p>
          ${cloudStatusLine}
        </div>
        ${signOutButton}
      </section>
      <section class="panel panel-card">
        <div class="panel-header">
          <h2>BACKUP</h2>
        </div>
        <div class="home-backup-actions">
          <button
            class="secondary compact"
            type="button"
            data-action="home-backup-export"
          >
            Exporter
          </button>
          <button
            class="secondary compact"
            type="button"
            data-action="home-backup-import"
          >
            Importer
          </button>
          <input id="home-backup-file" type="file" accept=".json" hidden />
          ${backupStatusLine}
        </div>
      </section>
    </aside>
  `
}
