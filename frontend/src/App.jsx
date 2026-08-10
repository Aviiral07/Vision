import React from "react"
import { Header } from "@/components/Header"
import { InspectionStudio } from "@/components/InspectionStudio"
import { RiskAssessmentCard } from "@/components/RiskAssessmentCard"
import { InspectionDataTable } from "@/components/InspectionDataTable"
import { useInspection } from "@/hooks/useInspection"

export default function App() {
  const {
    serverOnline,
    previewSrc,
    selectedFile,
    currentResult,
    isProcessing,
    historyLogs,
    errorMessage,
    handleSelectFile,
    runInspection,
    loadHistoricalLog,
  } = useInspection()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Header serverOnline={serverOnline} />

      <main className="max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* Main Inspection Section: Upload & Result */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          <div className="md:col-span-8">
            <InspectionStudio
              previewSrc={previewSrc}
              selectedFile={selectedFile}
              currentResult={currentResult}
              isProcessing={isProcessing}
              onSelectFile={handleSelectFile}
              onRunInspection={runInspection}
              errorMessage={errorMessage}
            />
          </div>

          <div className="md:col-span-4">
            <RiskAssessmentCard result={currentResult} />
          </div>
        </div>

        {/* History */}
        <InspectionDataTable
          logs={historyLogs}
          onLoadLog={loadHistoricalLog}
        />
      </main>
    </div>
  )
}
