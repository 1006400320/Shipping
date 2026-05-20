const DB_NAME = 'logistics-local-store'
const DB_VERSION = 1
const STORE_NAME = 'records'

let dbPromise

function getIndexedDb() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('IndexedDB is not available in this browser.')
  }

  return window.indexedDB
}

function openDatabase() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = getIndexedDb().open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB.'))
    request.onblocked = () => reject(new Error('IndexedDB is blocked by another open tab.'))
  }).catch((error) => {
    dbPromise = null
    throw error
  })

  return dbPromise
}

export async function idbGet(key) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(key)

    request.onsuccess = () => resolve(request.result?.value ?? null)
    request.onerror = () => reject(request.error || new Error(`Failed to read IndexedDB key: ${key}`))
    transaction.onerror = () => reject(transaction.error || new Error(`IndexedDB read failed: ${key}`))
  })
}

export async function idbSet(key, value) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const record = {
      key,
      value,
      updatedAt: new Date().toISOString()
    }

    transaction.objectStore(STORE_NAME).put(record)
    transaction.oncomplete = () => resolve(record)
    transaction.onerror = () => reject(transaction.error || new Error(`IndexedDB write failed: ${key}`))
    transaction.onabort = () => reject(transaction.error || new Error(`IndexedDB write aborted: ${key}`))
  })
}

export async function idbDelete(key) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')

    transaction.objectStore(STORE_NAME).delete(key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error(`IndexedDB delete failed: ${key}`))
    transaction.onabort = () => reject(transaction.error || new Error(`IndexedDB delete aborted: ${key}`))
  })
}
