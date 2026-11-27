import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Terminal,
  RotateCcw
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Badge } from '../../components/common/Badge';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState(StorageService.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');

  useEffect(() => {
    const sync = () => setLogs(StorageService.getAuditLogs());
    window.addEventListener('alumnitrack_data_changed', sync);
    return () => window.removeEventListener('alumnitrack_data_changed', sync);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchSearch = log.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        log.activity.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        log.ip.includes(searchQuery);
    const matchRole = filterRole === 'ALL' || log.user_role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Audit Log Aktivitas Sistem
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Catatan riwayat aktivitas penting pengguna, perubahan data alumni, dan log keamanan untuk akuntabilitas
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aktivitas, nama pengguna, IP..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium text-slate-700"
          >
            <option value="ALL">Semua Role</option>
            <option value="ADMIN">Hanya Admin</option>
            <option value="ALUMNI">Hanya Alumni</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Aktivitas / Tindakan</th>
                <th className="py-3 px-4">Alamat IP Host</th>
                <th className="py-3 px-4 text-right">Waktu (Timestamp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{log.user_name}</span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={log.user_role === 'ADMIN' ? 'success' : 'info'}>
                      {log.user_role}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {log.activity}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                    {log.ip}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500 tabular-nums">
                    {log.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
