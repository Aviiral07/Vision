import React, { useEffect, useState } from "react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { fetchAuthenticatedImage } from "@/lib/api"
import { formatDateTime } from "@/lib/utils"

export function InspectionDataTable({ logs = [], onLoadLog }) {
  const [isOpen, setIsOpen] = useState(true)
  const [imageUrls, setImageUrls] = useState({})

  useEffect(() => {
    let active = true
    const objectUrls = []
    Promise.all(logs.map(async (log) => {
      const path = log.image_url || log.image_path
      if (!path) return null
      try {
        const url = await fetchAuthenticatedImage(path)
        objectUrls.push(url)
        return [log.id, url]
      } catch {
        return null
      }
    })).then((entries) => {
      if (active) setImageUrls(Object.fromEntries(entries.filter(Boolean)))
    })
    return () => {
      active = false
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [logs])

  if (logs.length === 0) return null

  return (
    <div className="rounded-xl bg-white border border-zinc-200 p-5 shadow-sm">
      <div 
        className="flex items-center justify-between cursor-pointer group select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-blue-900 group-hover:text-blue-700 transition-colors mb-0">
            Recent Audit Logs
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-900 rounded-full border border-blue-200">
            {logs.length} records
          </span>
        </div>
        <button 
          className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 group-hover:text-zinc-800 transition-colors"
          aria-label="Toggle history"
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="overflow-x-auto mt-4 rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow className="border-b border-zinc-200 text-zinc-600 text-xs font-bold uppercase tracking-wider">
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Hygiene Status</TableHead>
              <TableHead>Damage Index</TableHead>
              <TableHead>Required Protocol</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.slice(0, 15).map((log) => {
              const imgUrl = imageUrls[log.id]
              const score = Number(log.damage_score ?? log.risk_score) || 0
              const severity = log.severity || (score > 75 ? "CRITICAL" : score > 40 ? "MEDIUM" : "LOW")
              const isCritical = severity === "CRITICAL" || score > 75
              const hygiene = log.hygiene_status || "Clean"
              const isGarbage = hygiene.toLowerCase().includes("garbage")
              
              return (
                <TableRow key={log.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 text-sm">
                  <TableCell className="text-zinc-500 font-mono text-xs">#{log.id}</TableCell>
                  <TableCell className="font-bold text-zinc-800 text-xs">
                    <div>{log.hostel_id || "Hostel-A"}</div>
                    {log.gps_lat != null && log.gps_long != null && (
                      <div className="text-[10px] text-zinc-500 font-mono font-normal">
                        📍 {Number(log.gps_lat).toFixed(3)}, {Number(log.gps_long).toFixed(3)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt=""
                        className="h-9 w-12 object-cover rounded border border-zinc-200 bg-zinc-100"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-black ${
                      isCritical ? 'bg-red-100 text-red-800' : 
                      severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {severity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-bold ${
                      isGarbage ? 'text-orange-700 font-extrabold' : 
                      hygiene === 'Dirty' ? 'text-amber-700 font-bold' : 
                      'text-emerald-700'
                    }`}>
                      {hygiene}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-bold text-zinc-800 text-xs">
                      {score}%
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-700 max-w-[180px] truncate text-xs font-medium">
                    {log.recommendation || "—"}
                  </TableCell>
                  <TableCell className="text-zinc-500 text-xs">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onLoadLog && onLoadLog(log)}
                      className="h-7 text-xs font-bold border-blue-200 text-blue-800 hover:bg-blue-50"
                    >
                      View Report
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  )
}
