// Shrinks big phone/gallery photos before upload.
// Why: Vercel rejects request bodies over ~4.5MB with an empty 502 before the
// request ever reaches the backend, and a 5-8 MB photo also becomes ~7-10 MB
// after base64 at the AI provider. A 1600px JPEG is ~200-500 KB — more than
// enough detail for damage / hygiene analysis, and it uploads faster on weak
// mobile networks. If anything fails we just return the original file.
export async function compressImage(file, { maxSize = 1600, quality = 0.8 } = {}) {
  try {
    if (!file || !file.type || !file.type.startsWith("image/") || file.type === "image/gif") return file

    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height)
    if (bitmap.close) bitmap.close()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
    if (!blob) return file
    // Already small and not resized? keep the original bytes.
    if (scale === 1 && blob.size >= file.size) return file

    const baseName = (file.name || "inspection").replace(/\.[^.]+$/, "")
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() })
  } catch (err) {
    console.warn("Image compression skipped:", err)
    return file
  }
}
