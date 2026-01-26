const DB_NAME = "writer_db"
const DB_VERSION = 8

let dbPromise = null
let dbInstance = null

function openDb() {
  if (dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("chapters")) {
        db.createObjectStore("chapters", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", { keyPath: "opId" })
      }
      if (!db.objectStoreNames.contains("characters")) {
        db.createObjectStore("characters", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("inspiration")) {
        db.createObjectStore("inspiration", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("mindmap_nodes")) {
        db.createObjectStore("mindmap_nodes", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("mindmap_edges")) {
        db.createObjectStore("mindmap_edges", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("ideas")) {
        db.createObjectStore("ideas", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("knowledge_notes")) {
        db.createObjectStore("knowledge_notes", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("knowledge_links")) {
        db.createObjectStore("knowledge_links", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("writing_sessions")) {
        db.createObjectStore("writing_sessions", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("focus_sessions")) {
        db.createObjectStore("focus_sessions", { keyPath: "id" })
      }
    }

    request.onsuccess = () => {
      dbInstance = request.result
      dbInstance.onversionchange = () => {
        try {
          dbInstance.close()
        } catch (error) {
          // Ignore close errors; reopening will recreate the connection.
        }
        dbInstance = null
        dbPromise = null
      }
      resolve(dbInstance)
    }
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
    request.onblocked = () => {
      // Another tab is upgrading; keep the promise pending until unblocked.
    }
  })

  return dbPromise
}

const isRetryableError = (error) =>
  error &&
  ["InvalidStateError", "TransactionInactiveError", "AbortError"].includes(
    error.name
  )

async function withDb(action, retries = 1) {
  try {
    const db = await openDb()
    return await action(db)
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      if (dbInstance) {
        try {
          dbInstance.close()
        } catch (closeError) {
          // Ignore close errors; retry will reopen.
        }
      }
      dbInstance = null
      dbPromise = null
      return withDb(action, retries - 1)
    }
    throw error
  }
}

export async function idbPut(store, value) {
  return withDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite")
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.objectStore(store).put(value)
      })
  )
}

export async function idbGet(store, key) {
  return withDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly")
        const request = tx.objectStore(store).get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
  )
}

export async function idbGetAll(store) {
  return withDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly")
        const request = tx.objectStore(store).getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
  )
}

export async function idbDel(store, key) {
  return withDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite")
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.objectStore(store).delete(key)
      })
  )
}
