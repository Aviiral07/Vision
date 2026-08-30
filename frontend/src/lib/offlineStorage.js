// IndexedDB Storage & Sync Engine for Offline Field Inspections

const DB_NAME = "InfraMindOfflineDB"
const DB_VERSION = 1
const STORE_NAME = "offline_inspections"

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true })
        store.createIndex("timestamp", "timestamp", { unique: false })
        store.createIndex("status", "status", { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Convert File / Blob to Data URL for persistence
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Convert Data URL back to Blob / File for upload
export function dataURLtoFile(dataurl, filename = "offline_capture.jpg") {
  const arr = dataurl.split(",")
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

/**
 * Save inspection record to local IndexedDB queue
 */
export async function saveOfflineInspection({ file, dataUrl, hostelId, location, timestamp }) {
  const db = await openDB()
  const imageBase64 = dataUrl || (file ? await fileToDataURL(file) : null)
  const fileName = file ? file.name : `offline_${Date.now()}.jpg`

  const record = {
    fileName,
    imageBase64,
    hostelId: hostelId || "Hostel-A",
    gps_lat: location?.latitude || 28.6139,
    gps_long: location?.longitude || 77.209,
    inspection_time: timestamp || new Date().toISOString(),
    timestamp: Date.now(),
    status: "pending_sync",
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const request = store.add(record)

    request.onsuccess = () => {
      resolve({ id: request.result, ...record })
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Retrieve all pending offline inspections
 */
export async function getOfflineInspections() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result || [])
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete a specific inspection from offline queue after successful sync
 */
export async function deleteOfflineInspection(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Synchronize all queued offline inspections with backend
 */
export async function syncOfflineQueue(uploadFn, onProgress) {
  const items = await getOfflineInspections()
  if (items.length === 0) return { total: 0, successful: 0, failed: 0, results: [] }

  const results = []
  let successful = 0
  let failed = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (onProgress) {
      onProgress({ current: i + 1, total: items.length, item })
    }

    try {
      const fileObj = dataURLtoFile(item.imageBase64, item.fileName)
      const res = await uploadFn(fileObj, {
        hostel_id: item.hostelId,
        gps_lat: item.gps_lat,
        gps_long: item.gps_long,
        inspection_time: item.inspection_time,
      })

      await deleteOfflineInspection(item.id)
      successful++
      results.push({ item, status: "success", res })
    } catch (err) {
      failed++
      results.push({ item, status: "failed", error: err.message })
    }
  }

  return { total: items.length, successful, failed, results }
}
