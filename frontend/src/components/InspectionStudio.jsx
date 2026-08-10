import React, { useRef, useEffect, useState } from "react"
import { Upload, Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function InspectionStudio({
  previewSrc,
  selectedFile,
  currentResult,
  isProcessing,
  onSelectFile,
  onRunInspection,
  errorMessage,
}) {
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    if (!previewSrc) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = previewSrc

    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")

      canvas.width = img.naturalWidth || 800
      canvas.height = img.naturalHeight || 600

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      if (!currentResult || !currentResult.detections) return

      const cracks = currentResult.detections.cracks?.predictions || []
      const rust = currentResult.detections.rust?.predictions || []

      cracks.forEach((pred) => drawBox(ctx, pred, "#ef4444", "Crack"))
      rust.forEach((pred) => drawBox(ctx, pred, "#f59e0b", "Corrosion"))
    }
  }, [previewSrc, currentResult])

  const drawBox = (ctx, pred, color, label) => {
    const x = Math.max(0, pred.x - pred.width / 2)
    const y = Math.max(0, pred.y - pred.height / 2)
    const w = pred.width
    const h = pred.height

    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(3, Math.round(ctx.canvas.width / 300))
    ctx.strokeRect(x, y, w, h)
    ctx.fillStyle = color + "20"
    ctx.fillRect(x, y, w, h)

    const conf = Math.round(
      pred.confidence > 1 ? pred.confidence : (pred.confidence || 0) * 100
    )
    const text = `${label} (${conf}%)`
    const fontSize = Math.max(13, Math.round(ctx.canvas.width / 50))
    ctx.font = `600 ${fontSize}px sans-serif`

    const padX = 8
    const padY = 4
    const badgeH = fontSize + padY * 2
    const badgeW = ctx.measureText(text).width + padX * 2
    const badgeY = Math.max(0, y - badgeH - 4)

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x, badgeY, badgeW, badgeH, 4)
    ctx.fill()

    ctx.fillStyle = "#ffffff"
    ctx.fillText(text, x + padX, badgeY + fontSize + 1)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onSelectFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 flex flex-col">
      {/* Viewport */}
      {previewSrc ? (
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950 flex items-center justify-center p-2 min-h-[320px] max-h-[440px] overflow-hidden">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[420px] object-contain rounded"
          />
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 min-h-[300px] ${
            isDragOver
              ? "border-zinc-500 bg-zinc-800/40"
              : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/40"
          }`}
        >
          <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">
              Upload structure image
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              JPG or PNG (Bridge, Concrete, Steel, Road)
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onSelectFile(e.target.files[0])
          }
        }}
      />

      {errorMessage && (
        <div className="mt-3 p-2.5 rounded bg-red-950/40 border border-red-900 text-red-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
        <span className="text-xs text-zinc-400 truncate max-w-[200px]">
          {selectedFile ? selectedFile.name : "Select an image to inspect"}
        </span>

        <div className="flex items-center gap-2">
          {previewSrc && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="text-xs h-8 border-zinc-800 text-zinc-300"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Change
            </Button>
          )}

          <Button
            size="sm"
            onClick={onRunInspection}
            disabled={!selectedFile || isProcessing}
            className="text-xs h-8 bg-zinc-100 text-zinc-950 hover:bg-white font-medium"
          >
            <Play className={`h-3.5 w-3.5 mr-1.5 ${isProcessing ? "animate-spin" : ""}`} />
            {isProcessing ? "Analyzing..." : "Inspect"}
          </Button>
        </div>
      </div>
    </div>
  )
}
