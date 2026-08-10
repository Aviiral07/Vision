// empty string = same origin as the page (works both locally via Vite proxy and after deploy)
export const API_URL = import.meta.env.VITE_API_URL || ""

export async function checkServerHealth() {
  try {
    const res = await fetch(`${API_URL}/`, {
      method: "GET",
    })
    return { online: res.ok || res.status === 200 || res.status === 404 }
  } catch (err) {
    return { online: false, error: err.message }
  }
}

export async function uploadAndInspect(file) {
  const formData = new FormData()
  // updated backend uses 'image' instead of 'file' in upload.single('image')
  formData.append("image", file)

  const res = await fetch(`${API_URL}/api/upload-inspection`, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => "")
    throw new Error(`Inspection failed (HTTP ${res.status}): ${errBody || res.statusText}`)
  }

  return await res.json()
}

export function getFullImageUrl(imagePathOrUrl) {
  if (!imagePathOrUrl) return ""
  if (imagePathOrUrl.startsWith("http://") || imagePathOrUrl.startsWith("https://") || imagePathOrUrl.startsWith("blob:")) {
    return imagePathOrUrl
  }
  return imagePathOrUrl.startsWith("/") ? `${API_URL}${imagePathOrUrl}` : `${API_URL}/${imagePathOrUrl}`
}
