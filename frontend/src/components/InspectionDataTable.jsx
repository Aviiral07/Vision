import React, { useState } from "react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { getFullImageUrl } from "@/lib/api"
import { formatDateTime } from "@/lib/utils"

export function InspectionDataTable({ logs = [], onLoadLog }) {
  const [isOpen, setIsOpen] = useState(true)

  if (logs.length === 0) return null

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
      <div 
        className="flex items-center justify-between cursor-pointer group select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors mb-0">
          Recent Inspections
        </h3>
        <button 
          className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 group-hover:text-zinc-200 transition-colors"
          aria-label="Toggle history"
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="overflow-x-auto mt-4">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-zinc-800 text-zinc-400 text-xs">
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Damage Type</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Recommendation</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.slice(0, 10).map((log) => {
              const imgUrl = getFullImageUrl(log.image_url || log.image_path)
              return (
                <TableRow key={log.id} className="border-b border-zinc-800/40 text-xs">
                  <TableCell className="text-zinc-400 font-mono">#{log.id}</TableCell>
                  <TableCell>
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt=""
                        className="h-7 w-10 object-cover rounded bg-zinc-950 border border-zinc-800"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-zinc-200">
                    {log.damage_type || "Healthy"}
                  </TableCell>
                  <TableCell className="font-semibold text-zinc-200">
                    {log.risk_score || 0}%
                  </TableCell>
                  <TableCell className="text-zinc-300 max-w-[200px] truncate">
                    {log.recommendation || "—"}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLoadLog(log)}
                      className="h-7 px-2.5 text-xs text-zinc-300 hover:text-white"
                    >
                      View
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
