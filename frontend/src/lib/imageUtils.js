// Shrinks big phone/gallery photos before upload.
// Why: Vercel rejects request bodies over ~4.5MB with an empty 502 before the
// request ever reaches the backend, and a 5-8 MB photo also becomes ~7-10 MB
// after base64 at the AI provider. A 1600px JPEG is ~200-500 KB — more than
// enough detail for damage / hygiene analysis, and it uploads faster on weak
// mobile networks. If anything fails we just return the original file.
async function decodeImage(file) {
  // 1. Try createImageBitmap with EXIF orientation
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" })
    } catch {
      try {
        return await createImageBitmap(file)
      } catch {
        // Fall back to Image element
      }
    }
  }

  // 2. Fall back to standard HTMLImageElement
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

export async function compressImage(file, { maxSize = 1600, quality = 0.8 } = {}) {
  try {
    if (!file || !file.type || !file.type.startsWith("image/") || file.type === "image/gif") return file

    const imgSource = await decodeImage(file)
    const srcWidth = imgSource.naturalWidth || imgSource.width
    const srcHeight = imgSource.naturalHeight || imgSource.height

    if (!srcWidth || !srcHeight) {
      if (imgSource.close) imgSource.close()
      return file
    }

    const scale = Math.min(1, maxSize / Math.max(srcWidth, srcHeight))
    const width = Math.max(1, Math.round(srcWidth * scale))
    const height = Math.max(1, Math.round(srcHeight * scale))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      if (imgSource.close) imgSource.close()
      return file
    }

    ctx.drawImage(imgSource, 0, 0, width, height)
    if (imgSource.close) imgSource.close()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
    if (!blob) return file
    // Already small and not resized? keep the original bytes.
    if (scale === 1 && blob.size >= file.size) return file

    const baseName = (file.name || "inspection").replace(/\.[^.]+$/, "")
    try {
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() })
    } catch {
      // In environments where File constructor fails, attach filename to Blob
      blob.name = `${baseName}.jpg`
      blob.lastModified = Date.now()
      return blob
    }
  } catch (err) {
    console.warn("Image compression fallback to original file:", err)
    return file
  }
}
