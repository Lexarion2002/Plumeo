const DB_NAME = "writer_db"
const DB_VERSION = 1

let dbPromise = null

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
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

export async function idbPut(store, value) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite")
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(store).put(value)
  })
}

export async function idbGet(store, key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly")
    const request = tx.objectStore(store).get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function idbGetAll(store) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly")
    const request = tx.objectStore(store).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function idbDel(store, key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite")
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(store).delete(key)
  })
}
