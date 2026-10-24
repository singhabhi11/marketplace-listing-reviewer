import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ListingsPage } from './pages/ListingsPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { ListingFormPage } from './pages/ListingFormPage';
import { ReviewWorkspacePage } from './pages/ReviewWorkspacePage';
import { PolicyLibraryPage } from './pages/PolicyLibraryPage';
import { BatchReviewPage } from './pages/BatchReviewPage';
import { AuditHistoryPage } from './pages/AuditHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { UserManagementPage } from './pages/UserManagementPage';
import { ReportsPage } from './pages/ReportsPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const ReviewerOrAdminRoute = ({ children }) => {
  const { user, loading, isSeller } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isSeller) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Common Routes */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/listings/new" element={<ListingFormPage />} />
            <Route path="/listings/:id" element={<ListingDetailPage />} />
            <Route path="/listings/:id/edit" element={<ListingFormPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Reviewer & Admin Only Routes */}
            <Route
              path="/listings/:id/review"
              element={
                <ReviewerOrAdminRoute>
                  <ReviewWorkspacePage />
                </ReviewerOrAdminRoute>
              }
            />
            <Route
              path="/batch"
              element={
                <ReviewerOrAdminRoute>
                  <BatchReviewPage />
                </ReviewerOrAdminRoute>
              }
            />
            <Route
              path="/policies"
              element={
                <ReviewerOrAdminRoute>
                  <PolicyLibraryPage />
                </ReviewerOrAdminRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <ReviewerOrAdminRoute>
                  <AuditHistoryPage />
                </ReviewerOrAdminRoute>
              }
            />

            {/* Admin Only Routes */}
            <Route
              path="/reports"
              element={
                <AdminRoute>
                  <ReportsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/users"
              element={
                <AdminRoute>
                  <UserManagementPage />
                </AdminRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <AdminRoute>
                  <SettingsPage />
                </AdminRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
