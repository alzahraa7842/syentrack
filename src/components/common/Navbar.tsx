import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  Menu, 
  LogOut, 
  User as UserIcon, 
  ExternalLink, 
  Check, 
  Search,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { StorageService } from '../../services/storageService';

interface NavbarProps {
  onToggleSidebar?: () => void;
  pageTitle?: string;
  breadcrumbs?: string[];
  onNavigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onToggleSidebar, 
  pageTitle, 
  breadcrumbs = [],
  onNavigate
}) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const schoolSettings = StorageService.getSchoolSettings();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + Breadcrumbs / Title */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div>
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    <span>{crumb}</span>
                    {idx < breadcrumbs.length - 1 && <span className="text-slate-300">/</span>}
                  </React.Fragment>
                ))}
              </div>
            )}
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
              {pageTitle || 'AlumniTrack'}
            </h1>
          </div>
        </div>

        {/* Right Zone: Notification Bell & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Lihat notifikasi"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">Notifikasi</span>
                    {unreadCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        {unreadCount} baru
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Tandai semua dibaca
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Tidak ada notifikasi baru
                    </div>
                  ) : (
                    notifications.slice(0, 6).map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markAsRead(notif.id);
                          if (notif.link && onNavigate) {
                            onNavigate(notif.link);
                            setShowNotifDropdown(false);
                          }
                        }}
                        className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.is_read ? 'bg-emerald-50/40' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900 line-clamp-1">{notif.title}</p>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{notif.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1.5 block tabular-nums">{notif.created_at}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 px-4 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      setShowNotifDropdown(false);
                      onNavigate?.('/notifications');
                    }}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                  >
                    Buka pusat notifikasi lengkap <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Menu profil pengguna"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || "User"}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-600/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-slate-800 text-white text-xs font-bold flex items-center justify-center ring-2 ring-emerald-600/20 uppercase">
                  {(user?.name || 'U').substring(0, 2)}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[130px]">
                  {user?.name || 'Pengguna'}
                </div>
                <div className="text-[10px] font-medium text-emerald-700 tracking-wide uppercase">
                  {user?.role === 'ADMIN' ? 'Admin / Guru BK' : 'Alumni'}
                </div>
              </div>
            </button>

            {/* User Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>

                <div className="py-1">
                  {user?.role === 'ALUMNI' ? (
                    <button
                      onClick={() => { setShowUserDropdown(false); onNavigate?.('/alumni/profile'); }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" /> Profil Karir Saya
                    </button>
                  ) : (
                    <button
                      onClick={() => { setShowUserDropdown(false); onNavigate?.('/admin/settings'); }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" /> Pengaturan Sekolah
                    </button>
                  )}

                  <button
                    onClick={() => { setShowUserDropdown(false); onNavigate?.('/forum'); }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-slate-400" /> Forum Diskusi Alumni
                  </button>

                  <a
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" /> Halaman Depan Publik
                  </a>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                      onNavigate?.('/login');
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Keluar (Logout)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
