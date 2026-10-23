import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ListingsPage } from './pages/ListingsPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { ListingFormPage } from './pages/ListingFormPage';
import { ReviewWorkspacePage } from './pages/ReviewWorkspacePage';
import { PolicyLibraryPage } from './pages/PolicyLibraryPage';
import { BatchReviewPage } from './pages/BatchReviewPage';
import { AuditHistoryPage } from './pages/AuditHistoryPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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

          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/listings/new" element={<ListingFormPage />} />
            <Route path="/listings/:id" element={<ListingDetailPage />} />
            <Route path="/listings/:id/edit" element={<ListingFormPage />} />
            <Route path="/listings/:id/review" element={<ReviewWorkspacePage />} />
            <Route path="/policies" element={<PolicyLibraryPage />} />
            <Route path="/batch" element={<BatchReviewPage />} />
            <Route path="/audit" element={<AuditHistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
