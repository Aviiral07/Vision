import React, { useState } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom"
import { Header } from "@/components/Header"
import { InspectionStudio } from "@/components/InspectionStudio"
import { RiskAssessmentCard } from "@/components/RiskAssessmentCard"
import { InspectionDataTable } from "@/components/InspectionDataTable"
import { Dashboard } from "@/components/Dashboard"
import { Login } from "@/components/Login"
import { OfflineQueueModal } from "@/components/OfflineQueueModal"
import { useInspection } from "@/hooks/useInspection"
import { AuthProvider, useAuth } from "@/components/AuthContext"
import { AlertCircle, AlertTriangle, X, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function MainLayout() {
  const navigate = useNavigate();
  const locationObj = useLocation();
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 75;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && locationObj.pathname === '/') {
      navigate('/dashboard');
    }
    if (isRightSwipe && locationObj.pathname === '/dashboard') {
      navigate('/');
    }
  };

  const {
    isOnline,
    serverOnline,
    previewSrc,
    selectedFile,
    hostelId,
    setHostelId,
    location,
    currentResult,
    isProcessing,
    errorMessage,
    clearError,
    historyLogs,
    offlineQueue,
    isSyncingOffline,
    syncAllOffline,
    deleteOfflineItem,
    handleSelectFile,
    runInspection,
    loadHistoricalLog,
  } = useInspection()

  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false)

  return (
    <div 
      className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Header
        serverOnline={serverOnline}
        offlineQueueCount={offlineQueue.length}
        onOpenOfflineQueue={() => setIsOfflineModalOpen(true)}
      />

      <main className="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <PrivateRoute>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  <div className="md:col-span-8">
                    <InspectionStudio
                      previewSrc={previewSrc}
                      selectedFile={selectedFile}
                      hostelId={hostelId}
                      setHostelId={setHostelId}
                      location={location}
                      currentResult={currentResult}
                      isProcessing={isProcessing}
                      onSelectFile={handleSelectFile}
                      onRunInspection={runInspection}
                      errorMessage={errorMessage}
                      serverOnline={serverOnline}
                      isOnline={isOnline}
                    />
                  </div>

                  <div className="md:col-span-4">
                    <RiskAssessmentCard result={currentResult} />
                  </div>
                </div>

                {historyLogs.length > 0 && (
                  <InspectionDataTable 
                    logs={historyLogs} 
                    onLoadLog={loadHistoricalLog} 
                  />
                )}
              </div>
            </PrivateRoute>
          } />
          
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard onLoadLog={loadHistoricalLog} />
            </PrivateRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Offline Queue Modal */}
      <OfflineQueueModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        queue={offlineQueue}
        onSyncAll={syncAllOffline}
        onDeleteItem={deleteOfflineItem}
        isSyncing={isSyncingOffline}
        serverOnline={serverOnline}
      />

      {/* Error Popup Modal */}
      {errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border-2 border-red-400 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-900">AI Inspection Failed</h3>
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    Analysis Halted
                  </span>
                </div>
              </div>
              <button
                onClick={clearError}
                className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                aria-label="Close error modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-red-50/80 rounded-xl border border-red-200 space-y-2">
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider block">
                Error Details:
              </span>
              <p className="text-sm font-semibold text-red-900 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="text-xs text-zinc-600 space-y-1">
              <p>• The system stopped the analysis and did not record this as a valid inspection.</p>
              <p>• Check that your backend Groq API credentials or model connection are active, then retry.</p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <Button
                variant="outline"
                onClick={clearError}
                className="border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold"
              >
                Dismiss
              </Button>
              <Button
                onClick={() => {
                  clearError();
                  runInspection();
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Inspection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout />
      </Router>
    </AuthProvider>
  )
}
