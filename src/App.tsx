import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Layouts
import { AdminLayout } from './layouts/AdminLayout';
import { AlumniLayout } from './layouts/AlumniLayout';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Admin Pages
import { DashboardPage as AdminDashboardPage } from './pages/admin/DashboardPage';
import { AlumniManagementPage } from './pages/admin/AlumniManagementPage';
import { AlumniDetailPage } from './pages/admin/AlumniDetailPage';
import { ImportAlumniPage } from './pages/admin/ImportAlumniPage';
import { ExportDataPage } from './pages/admin/ExportDataPage';
import { TracerStudyPage } from './pages/admin/TracerStudyPage';
import { QuestionnaireBuilderPage } from './pages/admin/QuestionnaireBuilderPage';
import { JobManagementPage } from './pages/admin/JobManagementPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';

// Alumni Pages
import { AlumniDashboardPage } from './pages/alumni/DashboardPage';
import { AlumniProfilePage } from './pages/alumni/ProfilePage';
import { TracerStudyWizardPage } from './pages/alumni/TracerStudyWizardPage';
import { AlumniDirectoryPage } from './pages/alumni/DirectoryPage';
import { AlumniCareerCenterPage } from './pages/alumni/CareerCenterPage';

// Shared Pages
import { ForumPage } from './pages/forum/ForumPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname && window.location.pathname !== '/' ? window.location.pathname : '/';
  });

  // Track path and support browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Memuat AlumniTrack...</p>
        </div>
      </div>
    );
  }

  // --- ROUTING DISPATCHER ---

  // 1. Landing Page
  if (currentPath === '/') {
    return <LandingPage onNavigate={navigate} />;
  }

  // 2. Login & Register Pages
  if (currentPath === '/register') {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/alumni/dashboard');
      }
      return null;
    }
    return <RegisterPage onNavigate={navigate} />;
  }

  if (currentPath === '/login') {
    // If already logged in, redirect by role
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/alumni/dashboard');
      }
      return null;
    }
    return <LoginPage onNavigate={navigate} />;
  }

  // 3. Protected Route Fallback: If not logged in and accessing internal paths
  if (!isAuthenticated || !user) {
    return <LoginPage onNavigate={navigate} />;
  }

  // Parse detail paths (e.g. /admin/alumni/:id)
  if (currentPath.startsWith('/admin/alumni/') && currentPath !== '/admin/alumni') {
    const id = parseInt(currentPath.replace('/admin/alumni/', ''));
    return (
      <AdminLayout
        currentPath="/admin/alumni"
        onNavigate={navigate}
        pageTitle="Detail Profil Alumni"
        breadcrumbs={['Admin', 'Data Alumni', 'Detail']}
      >
        <AlumniDetailPage alumniId={isNaN(id) ? 1 : id} onNavigate={navigate} />
      </AdminLayout>
    );
  }

  // 4. Admin Routing
  if (user.role === 'ADMIN') {
    switch (currentPath) {
      case '/admin/dashboard':
        return (
          <AdminLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Dashboard Utama" breadcrumbs={['Admin', 'Dashboard']}>
            <AdminDashboardPage onNavigate={navigate} />
          </AdminLayout>
        );
      case '/admin/alumni':
        return (
          <AdminLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Manajemen Data Alumni" breadcrumbs={['Admin', 'Data Alumni']}>
            <AlumniManagementPage onNavigate={navigate} />
          </AdminLayout>
        );
      case '/admin/import':
        return (
          <AdminLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Import Data Alumni" breadcrumbs={['Admin', 'Import Data']}>
            <ImportAlumniPage onNavigate={navigate} />
          </AdminLayout>
        );
      case '/admin/export':
        return (
          <AdminLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Export Laporan" breadcrumbs={['Admin', 'Export Data']}>
            <ExportDataPage onNavigate={navigate} />
          </AdminLayout>
        );
      case '/admin/tracer-study':
        return (
          <AdminLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Tracer Study & Monitoring" breadcrumbs={['Admin', 'Tracer Study']}>
            <TracerStudyPage onNavigate={navigate} />
          </AdminLayout>
        );
      case '/admin/tracer-study/builder':
        return (
          <AdminLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Desain Kuesioner" breadcrumbs={['Admin', 'Tracer Study', 'Kuesioner']}>
            <QuestionnaireBuilderPage onNavigate={navigate} />
          </AdminLayout>
        );
      case '/admin/jobs':
        return (
          <AdminLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Pusat Karir & Magang" breadcrumbs={['Admin', 'Pusat Karir']}>
            <JobManagementPage />
          </AdminLayout>
        );
      case '/admin/reports':
        return (
          <AdminLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Laporan Analitik" breadcrumbs={['Admin', 'Laporan Analitik']}>
            <ReportsPage />
          </AdminLayout>
        );
      case '/admin/settings':
        return (
          <AdminLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Pengaturan Sekolah" breadcrumbs={['Admin', 'Pengaturan']}>
            <SettingsPage />
          </AdminLayout>
        );
      case '/admin/audit-logs':
        return (
          <AdminLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Audit Log Sistem" breadcrumbs={['Admin', 'Audit Log']}>
            <AuditLogPage />
          </AdminLayout>
        );
      case '/forum':
        return (
          <AdminLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Forum Diskusi" breadcrumbs={['Portal', 'Forum Diskusi']}>
            <ForumPage />
          </AdminLayout>
        );
      case '/notifications':
        return (
          <AdminLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Pusat Notifikasi" breadcrumbs={['Portal', 'Notifikasi']}>
            <NotificationsPage onNavigate={navigate} />
          </AdminLayout>
        );
      default:
        return (
          <AdminLayout currentPath="/admin/dashboard" onNavigate={navigate} pageTitle="Dashboard Utama" breadcrumbs={['Admin', 'Dashboard']}>
            <AdminDashboardPage onNavigate={navigate} />
          </AdminLayout>
        );
    }
  }

  // 5. Alumni Routing
  if (user.role === 'ALUMNI') {
    switch (currentPath) {
      case '/alumni/dashboard':
        return (
          <AlumniLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Dashboard Alumni" breadcrumbs={['Alumni', 'Dashboard']}>
            <AlumniDashboardPage onNavigate={navigate} />
          </AlumniLayout>
        );
      case '/alumni/profile':
        return (
          <AlumniLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Profil Karir Saya" breadcrumbs={['Alumni', 'Profil Saya']}>
            <AlumniProfilePage />
          </AlumniLayout>
        );
      case '/alumni/tracer-study':
        return (
          <AlumniLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Pengisian Tracer Study" breadcrumbs={['Alumni', 'Tracer Study']}>
            <TracerStudyWizardPage onNavigate={navigate} />
          </AlumniLayout>
        );
      case '/alumni/directory':
        return (
          <AlumniLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Direktori Alumni" breadcrumbs={['Alumni', 'Direktori']}>
            <AlumniDirectoryPage />
          </AlumniLayout>
        );
      case '/alumni/jobs':
        return (
          <AlumniLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Pusat Karir & Magang" breadcrumbs={['Alumni', 'Pusat Karir']}>
            <AlumniCareerCenterPage />
          </AlumniLayout>
        );
      case '/forum':
        return (
          <AlumniLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Forum Diskusi" breadcrumbs={['Portal', 'Forum Diskusi']}>
            <ForumPage />
          </AlumniLayout>
        );
      case '/notifications':
        return (
          <AlumniLayout currentPath={currentPath} onNavigate={navigate} pageTitle="Pusat Notifikasi" breadcrumbs={['Portal', 'Notifikasi']}>
            <NotificationsPage onNavigate={navigate} />
          </AlumniLayout>
        );
      default:
        return (
          <AlumniLayout currentPath="/alumni/dashboard" onNavigate={navigate} pageTitle="Dashboard Alumni" breadcrumbs={['Alumni', 'Dashboard']}>
            <AlumniDashboardPage onNavigate={navigate} />
          </AlumniLayout>
        );
    }
  }

  return <LandingPage onNavigate={navigate} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
