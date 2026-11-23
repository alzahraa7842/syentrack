import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationItem } from '../types';
import { StorageService } from '../services/storageService';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void;
  dismissToast: (id: string) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => void;
  sendBroadcast: (title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const loadNotifications = () => {
    const list = StorageService.getNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();

    const handleDataChange = () => {
      loadNotifications();
    };

    window.addEventListener('alumnitrack_data_changed', handleDataChange);
    return () => {
      window.removeEventListener('alumnitrack_data_changed', handleDataChange);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, type, message, title };
    setToasts(prev => [...prev, newToast]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const markAsRead = (id: number) => {
    StorageService.markNotificationAsRead(id);
    loadNotifications();
  };

  const markAllAsRead = () => {
    StorageService.markAllNotificationsAsRead();
    loadNotifications();
    showToast('info', 'Semua notifikasi telah ditandai dibaca');
  };

  const sendBroadcast = (title: string, message: string) => {
    StorageService.sendBroadcastNotification(title, message, 'ALL');
    loadNotifications();
    showToast('success', 'Siaran pengumuman berhasil dikirim ke seluruh alumni');
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        showToast,
        dismissToast,
        markAsRead,
        markAllAsRead,
        refreshNotifications: loadNotifications,
        sendBroadcast
      }}
    >
      {children}

      {/* Global Toast Render Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          const bgColors = {
            success: 'bg-emerald-800 text-white border-emerald-700',
            error: 'bg-rose-800 text-white border-rose-700',
            warning: 'bg-amber-800 text-white border-amber-700',
            info: 'bg-slate-900 text-white border-slate-800'
          };
          const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl border shadow-xl flex items-start gap-3 transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${bgColors[toast.type]}`}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                {icons[toast.type]}
              </span>
              <div className="flex-1 text-sm">
                {toast.title && <div className="font-semibold mb-0.5">{toast.title}</div>}
                <div>{toast.message}</div>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-white/70 hover:text-white text-xs px-1"
                aria-label="Tutup notifikasi"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
