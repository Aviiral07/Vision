import React, { useState } from "react"
import { CloudUpload, Trash2, X, AlertCircle, CheckCircle, RefreshCw, HardDriveDownload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/utils"

export function OfflineQueueModal({
  isOpen,
  onClose,
  queue = [],
  onSyncAll,
  onDeleteItem,
  isSyncing,
  serverOnline,
}) {
  const [syncFeedback, setSyncFeedback] = useState(null)

  if (!isOpen) return null

  const handleSync = async () => {
    setSyncFeedback(null)
    const res = await onSyncAll()
    if (res) {
      setSyncFeedback(res)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900 shrink-0">
              <HardDriveDownload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-blue-900">Offline Field Queue</h3>
              <p className="text-xs text-zinc-500 font-medium">
                {queue.length} inspection{queue.length === 1 ? "" : "s"} stored locally in IndexedDB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Banner */}
        {!serverOnline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            Server currently unreachable. Queued audits will sync automatically once online.
          </div>
        )}

        {syncFeedback && (
          <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            syncFeedback.successful > 0
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            <CheckCircle className="w-4 h-4 shrink-0" />
            Synced {syncFeedback.successful} of {syncFeedback.total} audits to cloud server.
          </div>
        )}

        {/* Queue Items List */}
        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 max-h-[360px]">
          {queue.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm font-medium">
              No offline inspections pending. All field records are synchronized!
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-3 hover:bg-zinc-100/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.imageBase64 && (
                    <img
                      src={item.imageBase64}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover border border-zinc-200 bg-zinc-200 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-black text-blue-900 block truncate">
                      {item.hostelId || "Hostel Facility"}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono block">
                      📍 {item.gps_lat?.toFixed(3)}, {item.gps_long?.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium block">
                      Captured: {formatDateTime(item.inspection_time || item.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    Pending Sync
                  </span>
                  {onDeleteItem && (
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      disabled={isSyncing}
                      className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                      title="Discard local record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zinc-300 text-zinc-700 font-bold text-xs"
          >
            Close
          </Button>

          {queue.length > 0 && (
            <Button
              onClick={handleSync}
              disabled={isSyncing || !serverOnline}
              className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing to InfraMind AI..." : "Sync All Now"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
