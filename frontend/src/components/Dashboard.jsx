import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchHistoryLogs, fetchReports } from "@/lib/api";
import { InspectionDataTable } from "./InspectionDataTable";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { AlertCircle, Trash2, Wrench, Building2, CheckCircle2 } from "lucide-react";

export function Dashboard({ onLoadLog }) {
  const [logs, setLogs] = useState([]);
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const [data, reportData] = await Promise.all([
          fetchHistoryLogs(),
          fetchReports()
        ]);
        setLogs(Array.isArray(data) ? data : []);
        setReports(reportData);
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleViewReport = (log) => {
    if (onLoadLog) {
      onLoadLog(log);
    }
    navigate("/");
  };

  // Compute statistics from logs and reports
  const totalInspections = reports?.total_inspections ?? logs.length;
  const criticalRiskCount = reports?.critical_count ?? logs.filter(l => l.severity === "CRITICAL" || (Number(l.damage_score ?? l.risk_score) || 0) > 75).length;
  const garbageCount = logs.filter(l => (l.hygiene_status || "").toLowerCase().includes("garbage") || (l.damage_type || "").toLowerCase().includes("garbage")).length;
  const brokenAssetsCount = logs.filter(l => l.broken_assets).length;
  const moderateRiskCount = logs.filter(l => {
    const s = Number(l.damage_score ?? l.risk_score) || 0;
    return (l.severity === "MEDIUM" || (s > 40 && s <= 75)) && l.severity !== "CRITICAL";
  }).length;
  const healthyCount = Math.max(0, totalInspections - criticalRiskCount - moderateRiskCount);

  // Exact severity color mapping
  const SEVERITY_COLORS = {
    'Critical Severity': '#dc2626', // Red
    'Medium Risk': '#f59e0b',        // Yellow / Orange (Amber)
    'Low Risk / Healthy': '#16a34a', // Green
  };

  // Chart Data Preparation
  const pieData = [
    { name: 'Critical Severity', value: criticalRiskCount, color: SEVERITY_COLORS['Critical Severity'] },
    { name: 'Medium Risk', value: moderateRiskCount, color: SEVERITY_COLORS['Medium Risk'] },
    { name: 'Low Risk / Healthy', value: healthyCount, color: SEVERITY_COLORS['Low Risk / Healthy'] },
  ].filter(d => d.value > 0);

  const recentTrends = logs.slice(0, 8).reverse().map((l, i) => {
    const score = Number(l.damage_score ?? l.risk_score) || 0;
    const barColor = score > 75 ? '#dc2626' : score > 40 ? '#f59e0b' : '#16a34a';
    return {
      name: l.hostel_id ? `${l.hostel_id} (#${l.id})` : `Insp #${l.id}`,
      score,
      fill: barColor,
    };
  });

  if (isLoading) {
    return <div className="p-12 text-center text-zinc-500 font-medium">Loading Dashboard Metrics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inspections */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Audits</span>
            <Building2 className="w-4 h-4 text-blue-900" />
          </div>
          <p className="text-3xl font-black text-blue-900 mt-2">{totalInspections}</p>
          <span className="text-xs text-zinc-500 mt-1 block">
            {reports?.avg_damage_score !== undefined 
              ? `Avg Damage Score: ${Math.round(reports.avg_damage_score)}%`
              : 'Government Hostels & Facilities'}
          </span>
        </div>
        
        {/* Critical Risks */}
        <div className="bg-red-50/70 border border-red-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-red-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Critical Escalations
            </span>
          </div>
          <p className="text-3xl font-black text-red-700 mt-2">{criticalRiskCount}</p>
          <span className="text-xs text-red-600 font-medium mt-1 block">Automated Email Alerts Dispatched</span>
        </div>
        
        {/* Garbage Issues */}
        <div className="bg-orange-50/70 border border-orange-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-orange-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-orange-600" />
              Hygiene Violations
            </span>
          </div>
          <p className="text-3xl font-black text-orange-700 mt-2">{garbageCount}</p>
          <span className="text-xs text-orange-600 font-medium mt-1 block">Garbage & Sanitation Alerts</span>
        </div>

        {/* Broken Assets */}
        <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-amber-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-amber-700" />
              Broken Assets
            </span>
          </div>
          <p className="text-3xl font-black text-amber-800 mt-2">{brokenAssetsCount}</p>
          <span className="text-xs text-amber-700 font-medium mt-1 block">Hardware & Infrastructure</span>
        </div>
      </div>

      {/* Analytics Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <h3 className="font-bold text-blue-900 text-base mb-2">Severity Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color || '#16a34a'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-zinc-400 text-sm">No audit data recorded yet</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <h3 className="font-bold text-blue-900 text-base mb-2">Facility Damage Risk Indices (%)</h3>
          <div className="h-64 flex items-center justify-center">
            {recentTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentTrends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-20} textAnchor="end" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} 
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} name="Damage Score %">
                    {recentTrends.map((entry, index) => (
                      <Cell key={`cell-bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-zinc-400 text-sm">No inspections available</div>
            )}
          </div>
        </div>
      </div>

      <InspectionDataTable logs={logs} onLoadLog={handleViewReport} />
    </div>
  );
}
