import React, { useRef, useEffect, useState } from "react"
import { Upload, Play, RotateCcw, MapPin, Building2, HardDriveDownload, Camera, Sparkles, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function InspectionStudio({
  previewSrc,
  selectedFile,
  hostelId = "Hostel-A",
  setHostelId,
  location,
  currentResult,
  isProcessing,
  onSelectFile,
  onRunInspection,
  errorMessage,
  serverOnline,
  isOnline,
}) {
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isWebcamMode, setIsWebcamMode] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  const handleTakePhoto = async () => {
    if (isMobile) {
      cameraInputRef.current?.click()
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        streamRef.current = stream
        setIsWebcamMode(true)
      } catch (err) {
        alert("Camera access denied or no camera found on this device.")
      }
    }
  }

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsWebcamMode(false)
  }

  const captureWebcam = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext("2d")
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `webcam_${Date.now()}.jpg`, { type: "image/jpeg" })
        onSelectFile(file)
        stopWebcam()
      }
    }, "image/jpeg", 0.9)
  }

  useEffect(() => {
    if (isWebcamMode && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(e => console.error("Video play error:", e))
    }
  }, [isWebcamMode])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onSelectFile(e.dataTransfer.files[0])
    }
  }

  const isViewingReport = Boolean(
    currentResult && currentResult.status !== "failed" && currentResult.status !== "queued_offline"
  )

  // If viewing an active or historical audit report, show its recorded GPS coordinates.
  // Otherwise, show the inspector device's live GPS coordinates for the next capture.
  const activeLocation = (isViewingReport && currentResult?.gps_lat != null && currentResult?.gps_long != null)
    ? { latitude: Number(currentResult.gps_lat), longitude: Number(currentResult.gps_long) }
    : location

  const activeHostelId = isViewingReport ? (currentResult.hostel_id || hostelId) : hostelId

  return (
    <div className="rounded-xl bg-white border border-zinc-200 p-5 shadow-sm space-y-4">
      {/* Header & Meta Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
        <div>
          <h2 className="text-lg font-bold text-blue-900">Inspection Studio</h2>
          <p className="text-xs text-zinc-500">Capture or upload facility infrastructure image for AI auditing</p>
        </div>

        {/* Facility & GPS Meta controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5">
            <Building2 className="w-4 h-4 text-blue-900" />
            <span className="text-xs font-semibold text-zinc-600">Hostel/Facility:</span>
            <input
              type="text"
              value={activeHostelId}
              onChange={(e) => setHostelId && setHostelId(e.target.value)}
              placeholder="e.g. Hostel-A"
              disabled={isViewingReport}
              className="text-xs font-bold text-zinc-900 bg-white border border-zinc-300 rounded px-2 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-zinc-100 disabled:text-zinc-700"
            />
          </div>

          <div
            className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs ${
              isViewingReport
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-zinc-50 border-zinc-200 text-zinc-600"
            }`}
            title={isViewingReport ? "Recorded GPS of this audit" : "Live Device GPS"}
          >
            <MapPin className={`w-3.5 h-3.5 ${isViewingReport ? "text-emerald-700" : "text-emerald-600"}`} />
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
              {isViewingReport ? "Audit GPS:" : "Device GPS:"}
            </span>
            <span className="font-mono font-bold">
              {activeLocation
                ? `${activeLocation.latitude.toFixed(4)}, ${activeLocation.longitude.toFixed(4)}`
                : "28.6139, 77.2090 (Delhi)"}
            </span>
          </div>
        </div>
      </div>
      
      {/* Viewport: Clean Image Display (no fake hardcoded bounding boxes) */}
      {previewSrc ? (
        <div className="relative rounded-xl border border-zinc-200 bg-zinc-950/5 flex items-center justify-center p-3 min-h-[300px] max-h-[440px] overflow-hidden group shadow-inner">
          <img
            src={previewSrc}
            alt="Facility Asset Under Inspection"
            className="max-w-full max-h-[410px] w-auto h-auto object-contain rounded-lg shadow-sm"
          />
          {/* Asset Overlay Tags */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="bg-zinc-900/85 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-blue-300" />
              {activeHostelId || "Hostel-A"}
            </span>
            <span className="bg-zinc-900/85 backdrop-blur-xs text-emerald-300 text-[11px] font-medium px-2.5 py-1 rounded-md shadow flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              {activeLocation ? `${activeLocation.latitude.toFixed(3)}, ${activeLocation.longitude.toFixed(3)}` : "GPS Encoded"}
            </span>
          </div>

          <div className="absolute top-3 right-3">
            {currentResult && currentResult.status !== "failed" && currentResult.status !== "queued_offline" ? (
              <span className="bg-blue-900/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-300" />
                Groq VLM Analyzed
              </span>
            ) : isProcessing ? (
              <span className="bg-amber-600/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow animate-pulse flex items-center gap-1">
                Evaluating with Groq VLM...
              </span>
            ) : (
              <span className="bg-zinc-800/80 backdrop-blur-xs text-zinc-300 text-[11px] font-medium px-2.5 py-1 rounded-md shadow">
                Source Evidence Frame
              </span>
            )}
          </div>
        </div>
      ) : isWebcamMode ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-900 flex flex-col items-center justify-center p-4 min-h-[320px] max-h-[440px] overflow-hidden relative">
          <video 
            ref={videoRef} 
            className="max-w-full max-h-[380px] object-contain rounded" 
            playsInline 
            autoPlay 
            muted 
          />
          <div className="absolute bottom-6 flex gap-3">
            <Button onClick={captureWebcam} className="bg-white text-blue-900 hover:bg-zinc-100 font-bold px-6 rounded-full shadow-lg h-11">
              <Camera className="w-5 h-5 mr-2" />
              Snap Photo
            </Button>
            <Button onClick={stopWebcam} variant="outline" className="bg-zinc-900/50 text-white border-zinc-500 hover:bg-zinc-800 font-bold px-6 rounded-full h-11">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center justify-center gap-4 min-h-[300px] ${
            isDragOver
              ? "border-blue-400 bg-blue-50"
              : "border-zinc-300 bg-zinc-50"
          }`}
        >
          <div>
            <p className="text-lg font-semibold text-zinc-800">
              Submit Site Image
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              JPG or PNG (Hostel, Washroom, Kitchen, Structural Wall)
            </p>
            <p className="text-xs font-medium text-emerald-700 mt-2 bg-emerald-50 px-3 py-1 rounded-full inline-block border border-emerald-200">
              GPS Location & Inspector Tag will be attached automatically
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 w-full max-w-sm">
            <Button 
              onClick={handleTakePhoto} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
            <Button 
              variant="outline"
              onClick={() => fileInputRef.current?.click()} 
              className="w-full border-blue-200 text-blue-800 hover:bg-blue-50 font-bold h-11"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Gallery
            </Button>
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
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onSelectFile(e.target.files[0])
          }
        }}
      />

      {errorMessage && (
        <div className="mt-2 p-3.5 rounded-lg bg-red-50 border border-red-300 text-red-800 text-sm font-semibold shadow-sm">
          {errorMessage}
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-200">
        <span className="text-sm font-bold text-zinc-700 truncate max-w-[250px] md:max-w-md">
          {selectedFile ? selectedFile.name : "Select an image to analyze"}
        </span>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {previewSrc && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold text-sm text-amber-950 bg-amber-100 hover:bg-amber-200 border-2 border-amber-400 py-2.5 px-5 rounded-lg shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4 text-amber-800" />
              Retake / Change Photo
            </button>
          )}

          <Button
            size="default"
            onClick={onRunInspection}
            disabled={!selectedFile || isProcessing}
            className={`w-full sm:w-auto font-bold text-sm py-2.5 px-6 rounded-lg shadow-md ${
              !serverOnline
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-blue-900 hover:bg-blue-800 text-white"
            }`}
          >
            {!serverOnline ? (
              <>
                <HardDriveDownload className={`h-4 w-4 mr-2 ${isProcessing ? "animate-bounce" : ""}`} />
                {isProcessing ? "Saving to Offline Queue..." : "Queue Offline Audit"}
              </>
            ) : (
              <>
                <Play className={`h-4 w-4 mr-2 ${isProcessing ? "animate-spin" : ""}`} />
                {isProcessing ? "Analyzing with Groq VLM..." : "Run Inspection AI"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
