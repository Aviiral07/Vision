// empty string = same origin as the page (works both locally via Vite proxy and after deploy)
export const API_URL = import.meta.env.VITE_API_URL || ""
let authToken = null

export function getToken() {
  if (authToken) return authToken
  try {
    const saved = localStorage.getItem("token")
    if (saved) {
      authToken = saved
      return saved
    }
  } catch {
    // Fallback if localStorage is inaccessible
  }
  return null
}

export function getUser() {
  try {
    const saved = localStorage.getItem("user")
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export async function signup(username, password) {
  const res = await fetch(`${API_URL}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || "Registration failed")
  }
  return data
}

export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || "Invalid username or password")
  }
  
  if (data.token) {
    authToken = data.token
    try {
      localStorage.setItem("token", data.token)
    } catch (e) {
      console.warn("Failed to persist token to localStorage:", e)
    }
  }
  if (data.user) {
    try {
      localStorage.setItem("user", JSON.stringify(data.user))
    } catch (e) {
      console.warn("Failed to persist user to localStorage:", e)
    }
  }
  return data
}

export function logout() {
  authToken = null
  try {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  } catch {}
}

export async function checkServerHealth() {
  try {
    const res = await fetch(`${API_URL}/api/health`, {
      method: "GET",
      cache: "no-store",
    })
    return { online: res.ok || res.status === 200 }
  } catch (err) {
    return { online: false, error: err.message }
  }
}

export async function uploadAndInspect(file, options = {}) {
  const formData = new FormData()
  // backend server.js expects upload.single('image')
  formData.append("image", file)
  
  const hostel_id = options.hostel_id || options.hostelId || "HOSTEL-MAIN"
  formData.append("hostel_id", hostel_id)

  const inspection_time = options.inspection_time || new Date().toISOString()
  formData.append("inspection_time", inspection_time)

  if (options.gps_lat !== undefined && options.gps_lat !== null) {
    formData.append("gps_lat", options.gps_lat.toString())
  } else if (options.latitude !== undefined && options.latitude !== null) {
    formData.append("gps_lat", options.latitude.toString())
  }

  if (options.gps_long !== undefined && options.gps_long !== null) {
    formData.append("gps_long", options.gps_long.toString())
  } else if (options.longitude !== undefined && options.longitude !== null) {
    formData.append("gps_long", options.longitude.toString())
  }

  const token = options.token || getToken() || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null)
  const headers = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}/api/upload-inspection`, {
    method: "POST",
    headers,
    body: formData,
  })

  if (!res.ok) {
    const errBody = await res.json().catch(async () => ({ error: await res.text().catch(() => "") }))
    if (res.status === 401) {
      throw new Error(errBody.error || "Authentication required. Please log in again to upload inspections.")
    }
    const errorMsg = errBody.error || `Inspection failed (HTTP ${res.status}): ${res.statusText}`
    throw new Error(errorMsg)
  }

  return await res.json()
}

export async function fetchHistoryLogs() {
  const token = getToken()
  const headers = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  try {
    const res = await fetch(`${API_URL}/api/history`, { 
      cache: 'no-store',
      headers
    })
    if (!res.ok) throw new Error("Failed to fetch history")
    return await res.json()
  } catch {
    // If backend does not implement /api/history endpoint, fallback to localStorage
    const saved = localStorage.getItem("inframind_inspection_logs")
    return saved ? JSON.parse(saved) : []
  }
}

export async function fetchReports() {
  const token = getToken()
  const headers = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  try {
    const res = await fetch(`${API_URL}/api/reports`, { 
      cache: 'no-store',
      headers
    })
    if (!res.ok) throw new Error("Failed to fetch reports")
    return await res.json()
  } catch {
    return null
  }
}

export function getFullImageUrl(imagePathOrUrl) {
  if (!imagePathOrUrl) return ""
  if (imagePathOrUrl.startsWith("http://") || imagePathOrUrl.startsWith("https://") || imagePathOrUrl.startsWith("blob:") || imagePathOrUrl.startsWith("data:")) {
    return imagePathOrUrl
  }
  return imagePathOrUrl.startsWith("/") ? `${API_URL}${imagePathOrUrl}` : `${API_URL}/${imagePathOrUrl}`
}

export async function fetchAuthenticatedImage(imagePathOrUrl) {
  const token = getToken()
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(getFullImageUrl(imagePathOrUrl), { headers })
  if (!res.ok) throw new Error("Unable to load inspection image")
  return URL.createObjectURL(await res.blob())
}
