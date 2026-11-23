import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  FileText, 
  Briefcase, 
  MessageSquare, 
  BarChart3, 
  Upload, 
  Download, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  UserCheck, 
  X,
  Compass
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { StorageService } from '../../services/storageService';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const { user, logout } = useAuth();
  const schoolSettings = StorageService.getSchoolSettings();

  const adminNavItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Data Alumni', path: '/admin/alumni', icon: Users },
    { label: 'Tracer Study', path: '/admin/tracer-study', icon: GraduationCap },
    { label: 'Kuesioner', path: '/admin/tracer-study/builder', icon: FileText },
    { label: 'Pusat Karir', path: '/admin/jobs', icon: Briefcase },
    { label: 'Forum Diskusi', path: '/forum', icon: MessageSquare },
    { label: 'Laporan Analitik', path: '/admin/reports', icon: BarChart3 },
    { label: 'Import Data', path: '/admin/import', icon: Upload },
    { label: 'Export Data', path: '/admin/export', icon: Download },
    { label: 'Audit Log', path: '/admin/audit-logs', icon: ShieldCheck },
    { label: 'Pengaturan', path: '/admin/settings', icon: Settings },
  ];

  const alumniNavItems = [
    { label: 'Dashboard', path: '/alumni/dashboard', icon: LayoutDashboard },
    { label: 'Profil Karir Saya', path: '/alumni/profile', icon: UserCheck },
    { label: 'Tracer Study', path: '/alumni/tracer-study', icon: GraduationCap },
    { label: 'Direktori Alumni', path: '/alumni/directory', icon: Compass },
    { label: 'Pusat Karir & Magang', path: '/alumni/jobs', icon: Briefcase },
    { label: 'Forum Diskusi', path: '/forum', icon: MessageSquare },
  ];

  const navItems = user?.role === 'ADMIN' ? adminNavItems : alumniNavItems;

  const handleItemClick = (path: string) => {
    onNavigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center overflow-hidden shrink-0">
            <img 
              src={schoolSettings.logo} 
              alt="Logo Sekolah" 
              className="w-full h-full object-cover" 
              onError={(e) => {
                // Fallback SVG icon if file path is not rendered
                (e.target as HTMLElement).style.display = 'none';
              }} 
            />
            <GraduationCap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight leading-none block">
              AlumniTrack
            </span>
            <span className="text-[11px] text-emerald-400 font-medium tracking-wide">
              {user?.role === 'ADMIN' ? 'Portal Manajemen BK' : 'Portal Alumni Resmi'}
            </span>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Tutup sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Menu Utama
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <button
              key={item.path}
              onClick={() => handleItemClick(item.path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left group ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Profile Box & Logout */}
      <div className="p-4 border-t border-slate-800/90 bg-slate-950/40">
        <div className="flex items-center justify-between gap-3 px-2 py-1">
          <div className="flex items-center gap-2.5 truncate">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name || "User"}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-slate-800 text-white text-xs font-bold flex items-center justify-center shrink-0 border border-slate-700 uppercase">
                {(user?.name || 'U').substring(0, 2)}
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.role === 'ADMIN' ? 'Operator / Guru' : 'Alumni'}</p>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              onNavigate('/login');
            }}
            title="Keluar dari sistem"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 z-40 border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-xs h-full z-10 animate-in slide-in-from-left duration-200 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
