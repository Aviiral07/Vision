export async function checkServerHealth() {
  try {
    const res = await fetch("/docs", {
      method: "GET",
    })
    return { online: res.ok || res.status === 200 || res.status === 404 }
  } catch (err) {
    return { online: false, error: err.message }
  }
}

export async function uploadAndInspect(file) {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("/api/inspect", {
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
  if (imagePathOrUrl.startsWith("http://") || imagePathOrUrl.startsWith("https://")) {
    return imagePathOrUrl
  }
  return imagePathOrUrl.startsWith("/") ? imagePathOrUrl : `/${imagePathOrUrl}`
}
