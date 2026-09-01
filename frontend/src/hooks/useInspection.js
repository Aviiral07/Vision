import { useState, useEffect, useCallback } from "react"
import {
  API_URL,
  checkServerHealth,
  uploadAndInspect,
  fetchAuthenticatedImage,
  getToken,
} from "@/lib/api"
import {
  saveOfflineInspection,
  getOfflineInspections,
  deleteOfflineInspection,
  syncOfflineQueue,
} from "@/lib/offlineStorage"

const LOCAL_STORAGE_KEY = "inframind_inspection_logs"

export function useInspection() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)
  const [serverOnline, setServerOnline] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewSrc, setPreviewSrc] = useState(null)
  const [hostelId, setHostelId] = useState("Hostel-A")
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [stepTimeline, setStepTimeline] = useState([])
  const [currentResult, setCurrentResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [location, setLocation] = useState(null)

  // Offline Queue State
  const [offlineQueue, setOfflineQueue] = useState([])
  const [isSyncingOffline, setIsSyncingOffline] = useState(false)

  const refreshOfflineQueue = useCallback(async () => {
    try {
      const items = await getOfflineInspections()
      setOfflineQueue(items)
    } catch (e) {
      console.warn("Could not load offline queue:", e)
    }
  }, [])

  // Request location immediately on component mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.warn("Could not fetch location automatically:", error)
          if (error.code === 1) { // PERMISSION_DENIED
            // Don't alert aggressively, just silently fall back
          }
          // Default to New Delhi coordinates if unavailable
          setLocation({ latitude: 28.6139, longitude: 77.209 })
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
    }
  }, [])

  // Overlay filter toggles
  const [overlays, setOverlays] = useState({
    showCracks: true,
    showRust: true,
    showLabels: true,
  })

  // History and Stats state managed from real inspection responses
  const [historyLogs, setHistoryLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Compute KPI metrics dynamically from audit logs
  const computeStatsFromLogs = useCallback((logs) => {
    const total = logs.length
    if (total === 0) {
      return {
        total_inspections: 0,
        average_risk_score: 0,
        critical_count: 0,
        maintenance_count: 0,
        healthy_count: 0,
        garbage_count: 0,
        broken_assets_count: 0,
      }
    }
    const sumRisk = logs.reduce((acc, log) => acc + (Number(log.damage_score ?? log.risk_score) || 0), 0)
    const avgRisk = Math.round((sumRisk / total) * 10) / 10
    const critical = logs.filter((l) => l.severity === "CRITICAL" || (Number(l.damage_score ?? l.risk_score) || 0) > 75).length
    const maintenance = logs.filter((l) => {
      const s = Number(l.damage_score ?? l.risk_score) || 0
      return (l.severity === "MEDIUM" || (s > 40 && s <= 75)) && l.severity !== "CRITICAL"
    }).length
    const healthy = logs.filter((l) => (l.severity === "LOW" || (Number(l.damage_score ?? l.risk_score) || 0) <= 40) && l.severity !== "CRITICAL" && l.severity !== "MEDIUM").length
    const garbage = logs.filter((l) => (l.hygiene_status || "").toLowerCase().includes("garbage") || (l.damage_type || "").toLowerCase().includes("garbage")).length
    const brokenAssets = logs.filter((l) => l.broken_assets).length

    return {
      total_inspections: total,
      average_risk_score: avgRisk,
      critical_count: critical,
      maintenance_count: maintenance,
      healthy_count: healthy,
      garbage_count: garbage,
      broken_assets_count: brokenAssets,
    }
  }, [])

  const [kpiStats, setKpiStats] = useState(() => computeStatsFromLogs(historyLogs))
  const [loadingStats, setLoadingStats] = useState(false)

  const fetchHistory = useCallback(async () => {
    try {
      const token = getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`${API_URL}/api/history`, { cache: "no-store", headers })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const mappedData = data.map(log => ({
            ...log,
            severity: log.risk_level || log.severity
          }))
          setHistoryLogs(mappedData)
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mappedData))
          } catch {}
          setKpiStats(computeStatsFromLogs(mappedData))
        }
      }
    } catch {
      // Fallback already in historyLogs state
    }
  }, [computeStatsFromLogs])

  const pingServer = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setServerOnline(false)
      return
    }
    const res = await checkServerHealth()
    setServerOnline(res.online)
  }, [])

  // Auto-sync offline queue when connection is restored
  const syncAllOffline = useCallback(async () => {
    if (isSyncingOffline || !serverOnline) return null
    setIsSyncingOffline(true)
    try {
      const syncResult = await syncOfflineQueue(uploadAndInspect)
      await refreshOfflineQueue()
      await fetchHistory()
      
      if (syncResult && syncResult.successful > 0) {
        setCurrentResult(prev => {
          if (prev && prev.status === "queued_offline") {
            const synced = syncResult.results.find(r => r.status === "success" && r.item.id === prev.offlineId)
            if (synced) {
              const log = synced.res;
              const damageScore = Number(log.damage_score ?? log.risk_score) || 0
              const severity = log.severity || log.risk_level || (damageScore > 75 ? "CRITICAL" : damageScore > 40 ? "MEDIUM" : "LOW")
              const hygieneStatus = log.hygiene_status || "Clean"
              const brokenAssets = !!log.broken_assets
              const damageType = log.damage_type || (severity === "CRITICAL" ? "Critical Structural Defect" : "Facility Inspection")
              return {
                status: "success",
                inspection_id: log.id,
                hostel_id: log.hostel_id,
                damage_type: damageType,
                damage_score: damageScore,
                risk_score: damageScore,
                hygiene_status: hygieneStatus,
                broken_assets: brokenAssets,
                severity,
                recommendation: log.recommendation || (severity === "CRITICAL" ? "Immediate Repair Required" : "Schedule Maintenance"),
                image_url: log.image_url,
                detections: {
                  cracks: { predictions: damageScore > 60 ? [{ x: 260, y: 190, width: 140, height: 85, confidence: damageScore / 100, class: "Structural Defect" }] : [] },
                  rust: { predictions: (hygieneStatus === "Garbage Detected" || brokenAssets) ? [{ x: 420, y: 310, width: 180, height: 120, confidence: 0.85, class: "Defect Area" }] : [] },
                },
              }
            }
          }
          return prev;
        });

        setStepTimeline(prev => {
          if (prev.length > 0 && prev[prev.length - 1].label.includes("Queued Record")) {
             return [
               { step: 1, label: "Asset Captured & Encoded Locally", status: "completed" },
               { step: 2, label: "Offline Mode: Stored to Device IndexedDB", status: "completed" },
               { step: 3, label: "Synced and Analyzed by InfraMind AI", status: "completed", time: new Date().toLocaleTimeString() },
             ]
          }
          return prev;
        });
      }

      return syncResult
    } catch (e) {
      console.error("Offline sync error:", e)
      return null
    } finally {
      setIsSyncingOffline(false)
    }
  }, [isSyncingOffline, serverOnline, refreshOfflineQueue, fetchHistory])

  // Network and server listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      pingServer()
    }
    const handleOffline = () => {
      setIsOnline(false)
      setServerOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    pingServer()
    fetchHistory()
    refreshOfflineQueue()

    const interval = setInterval(pingServer, 8000)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(interval)
    }
  }, [pingServer, fetchHistory, refreshOfflineQueue])

  // Trigger sync automatically when coming back online
  useEffect(() => {
    if (isOnline && serverOnline && offlineQueue.length > 0 && !isSyncingOffline) {
      syncAllOffline()
    }
  }, [isOnline, serverOnline, offlineQueue.length, isSyncingOffline, syncAllOffline])

  // Select file handler with automatic EXIF / Geolocation capture
  const handleSelectFile = (file) => {
    if (!file) return
    setSelectedFile(file)
    setPreviewSrc(URL.createObjectURL(file))
    setCurrentResult(null)
    setErrorMessage("")
    setStepTimeline([])
    setActiveStep(0)
    // We intentionally do NOT clear the location here so it preserves the pre-fetched GPS coordinates
  }

  // Toggle overlay filters
  const toggleOverlay = (key) => {
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Run Inspection pipeline on backend (POST /api/upload-inspection)
  const runInspection = async () => {
    if (!selectedFile || isProcessing) return

    setIsProcessing(true)
    setErrorMessage("")
    setActiveStep(1)

    const initialTimeline = [
      { step: 1, label: "Asset Image Ingestion & Multimodal Encoding", status: "processing", time: new Date().toLocaleTimeString() },
      { step: 2, label: "Groq Vision Inference (qwen/qwen3.6-27b)", status: "pending" },
      { step: 3, label: "MoSJE Damage & Hygiene Assessment", status: "pending" },
      { step: 4, label: "Threshold Risk & Alert Evaluation", status: "pending" },
      { step: 5, label: "Database Persistence (InspectionLogs)", status: "pending" },
    ]
    setStepTimeline(initialTimeline)

    // If offline or server is offline, save to IndexedDB offline queue
    if (!isOnline || !serverOnline) {
      try {
        await new Promise((r) => setTimeout(r, 250))
        const savedItem = await saveOfflineInspection({
          file: selectedFile,
          hostelId: hostelId || "Hostel-A",
          location: location || { latitude: 28.6139, longitude: 77.209 },
          timestamp: new Date().toISOString(),
        })

        await refreshOfflineQueue()

        setStepTimeline([
          { step: 1, label: "Asset Captured & Encoded Locally", status: "completed", time: new Date().toLocaleTimeString() },
          { step: 2, label: "Offline Mode: Stored to Device IndexedDB", status: "completed" },
          { step: 3, label: `Queued Record #${savedItem.id} for InfraMind AI Sync`, status: "completed" },
        ])
        setActiveStep(5)

        setCurrentResult({
          status: "queued_offline",
          hostel_id: hostelId || "Hostel-A",
          damage_type: "Stored in Offline Queue",
          damage_score: 0,
          risk_score: 0,
          hygiene_status: "Pending Sync",
          broken_assets: false,
          severity: "SAVED OFFLINE",
          recommendation: "Record saved safely to local device storage. It will automatically upload and run through Groq Vision AI as soon as internet connectivity is restored.",
          offlineId: savedItem.id,
        })
      } catch (err) {
        setErrorMessage("Failed to save inspection locally: " + err.message)
      } finally {
        setIsProcessing(false)
      }
      return
    }

    try {
      // Step 1: Preprocessing
      await new Promise((r) => setTimeout(r, 200))
      setActiveStep(2)
      setStepTimeline((prev) =>
        prev.map((s) =>
          s.step === 1
            ? { ...s, status: "completed" }
            : s.step === 2
              ? { ...s, status: "processing", time: new Date().toLocaleTimeString() }
              : s
        )
      )

      // Step 2: Groq Vision Model Execution via Backend
      const backendResponse = await uploadAndInspect(selectedFile, {
        hostel_id: hostelId || "Hostel-A",
        gps_lat: location?.latitude || 28.6139,
        gps_long: location?.longitude || 77.209,
        inspection_time: new Date().toISOString(),
      })

      // Strictly validate if the backend AI inference succeeded
      const isAiFailure = 
        backendResponse.hygiene_status === "Error" ||
        (backendResponse.recommendation && backendResponse.recommendation.toLowerCase().includes("failed")) ||
        backendResponse.status === "failed" ||
        backendResponse.error;

      if (isAiFailure) {
        const failureReason = backendResponse.recommendation || backendResponse.error || "The AI model encountered an error analyzing this image.";
        throw new Error(`AI Analysis Failed: ${failureReason}`);
      }

      // Step 3: Parse AI outputs
      setActiveStep(3)
      setStepTimeline((prev) =>
        prev.map((s) =>
          s.step === 2
            ? { ...s, status: "completed" }
            : s.step === 3
              ? { ...s, status: "processing", time: new Date().toLocaleTimeString() }
              : s
        )
      )
      await new Promise((r) => setTimeout(r, 150))

      // Step 4: Risk scoring & Automated Alerts
      setActiveStep(4)
      setStepTimeline((prev) =>
        prev.map((s) =>
          s.step === 3
            ? { ...s, status: "completed" }
            : s.step === 4
              ? { ...s, status: "processing", time: new Date().toLocaleTimeString() }
              : s
        )
      )
      await new Promise((r) => setTimeout(r, 150))

      // Step 5: Database Persistence
      setActiveStep(5)
      setStepTimeline((prev) =>
        prev.map((s) =>
          s.step === 4
            ? { ...s, status: "completed" }
            : s.step === 5
              ? { ...s, status: "completed", time: new Date().toLocaleTimeString() }
              : s
        )
      )

      // Normalize data directly from backend Groq VLM response
      const damageScore = Number(backendResponse.damage_score ?? backendResponse.risk_score) || 0
      const hygieneStatus = backendResponse.hygiene_status || "Clean"
      const brokenAssets = !!backendResponse.broken_assets
      const severity = (backendResponse.severity || (damageScore > 75 ? "CRITICAL" : damageScore > 40 ? "MEDIUM" : "LOW")).toUpperCase()
      const recommendation =
        backendResponse.recommendation ||
        (severity === "CRITICAL" ? "Immediate Repair Required" : severity === "MEDIUM" ? "Schedule Maintenance" : "Monitor Asset")

      // Descriptive defect title for UI
      let damageType = "Healthy Facility"
      if (hygieneStatus === "Garbage Detected") {
        damageType = "Garbage & Hygiene Violation"
      } else if (brokenAssets && severity === "CRITICAL") {
        damageType = "Critical Asset & Structural Breakdown"
      } else if (brokenAssets) {
        damageType = "Broken Assets Detected"
      } else if (severity === "CRITICAL") {
        damageType = "Severe Structural Damage"
      } else if (severity === "MEDIUM" || hygieneStatus === "Dirty") {
        damageType = "Moderate Wear / Needs Cleaning"
      }

      const normalizedResult = {
        ...backendResponse,
        hostel_id: hostelId || "Hostel-A",
        damage_type: damageType,
        damage_score: damageScore,
        risk_score: damageScore,
        hygiene_status: hygieneStatus,
        broken_assets: brokenAssets,
        severity,
        recommendation,
        detections: backendResponse.detections || null,
      }

      setCurrentResult(normalizedResult)

      // Append to audit trail & LocalStorage ONLY if inspection was genuinely successful
      const newLog = {
        id: backendResponse.id || Date.now(),
        hostel_id: hostelId || "Hostel-A",
        image_path: backendResponse.image_url || backendResponse.image_path || previewSrc,
        image_url: backendResponse.image_url || backendResponse.image_path || previewSrc,
        damage_type: damageType,
        damage_score: damageScore,
        risk_score: damageScore,
        hygiene_status: hygieneStatus,
        broken_assets: brokenAssets,
        severity,
        recommendation,
        gps_lat: location?.latitude || 28.6139,
        gps_long: location?.longitude || 77.209,
        created_at: new Date().toISOString(),
      }

      setHistoryLogs((prev) => {
        const updated = [newLog, ...prev.filter((l) => l.id !== newLog.id)]
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
        } catch {}
        setKpiStats(computeStatsFromLogs(updated))
        return updated
      })
    } catch (err) {
      setCurrentResult(null)
      setErrorMessage(err.message || "Failed to execute inspection with backend AI.")
      setStepTimeline((prev) =>
        prev.map((s) => (s.status === "processing" ? { ...s, status: "failed" } : s))
      )
    } finally {
      setIsProcessing(false)
    }
  }

  // Load historical record into studio
  const loadHistoricalLog = async (log) => {
    if (!log) return
    let fullUrl = ""
    try {
      fullUrl = await fetchAuthenticatedImage(log.image_url || log.image_path)
    } catch {
      setErrorMessage("Unable to load the historical inspection image.")
      return
    }
    setPreviewSrc(fullUrl)
    setSelectedFile(null)

    const damageScore = Number(log.damage_score ?? log.risk_score) || 0
    const severity = log.severity || (damageScore > 75 ? "CRITICAL" : damageScore > 40 ? "MEDIUM" : "LOW")
    const hygieneStatus = log.hygiene_status || "Clean"
    const brokenAssets = !!log.broken_assets
    const damageType = log.damage_type || (severity === "CRITICAL" ? "Critical Structural Defect" : "Facility Inspection")

    setCurrentResult({
      status: "success",
      inspection_id: log.id,
      hostel_id: log.hostel_id,
      damage_type: damageType,
      damage_score: damageScore,
      risk_score: damageScore,
      hygiene_status: hygieneStatus,
      broken_assets: brokenAssets,
      severity,
      recommendation: log.recommendation || (severity === "CRITICAL" ? "Immediate Repair Required" : "Schedule Maintenance"),
      image_url: log.image_url,
      detections: {
        cracks: {
          predictions: damageScore > 60
            ? [{ x: 260, y: 190, width: 140, height: 85, confidence: damageScore / 100, class: "Structural Defect" }]
            : [],
        },
        rust: {
          predictions: (hygieneStatus === "Garbage Detected" || brokenAssets)
            ? [{ x: 420, y: 310, width: 180, height: 120, confidence: 0.85, class: "Defect Area" }]
            : [],
        },
      },
    })

    setStepTimeline([
      { step: 1, label: `Loaded Historical Record #${log.id}`, status: "completed", time: new Date(log.created_at || Date.now()).toLocaleTimeString() },
      { step: 2, label: `Facility: ${log.hostel_id || 'Hostel-A'} (Severity: ${severity})`, status: "completed" },
    ])
    setActiveStep(5)
  }

  const deleteOfflineItem = async (id) => {
    await deleteOfflineInspection(id)
    await refreshOfflineQueue()
  }

  return {
    isOnline,
    serverOnline,
    selectedFile,
    previewSrc,
    hostelId,
    setHostelId,
    location,
    isProcessing,
    activeStep,
    stepTimeline,
    currentResult,
    errorMessage,
    overlays,
    toggleOverlay,
    historyLogs,
    loadingHistory,
    kpiStats,
    loadingStats,
    offlineQueue,
    isSyncingOffline,
    syncAllOffline,
    deleteOfflineItem,
    refreshOfflineQueue,
    handleSelectFile,
    runInspection,
    loadHistoricalLog,
    clearError: () => setErrorMessage(""),
    refreshAll: () => {
      pingServer()
      fetchHistory()
      refreshOfflineQueue()
    },
  }
}
