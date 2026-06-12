import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { DataProvider } from './data/DataContext';
import { ToastProvider } from './shared/components/Toast';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { Loader } from './shared/components/Loader';
import Login from './features/auth/Login';
import SupplierLogin from './features/auth/SupplierLogin';
import './index.css';

// Code-split the role dashboards so each login only downloads its own bundle.
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'));
const SupplierPortal = lazy(() => import('./features/supplier/SupplierPortal'));

const getHomePath = (admin) => {
  if (admin?.role === 'ADMIN') return '/admin';
  if (admin?.role === 'SUPPLIER') return '/supplier';
  return '/dashboard';
};

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, admin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (role && admin?.role !== role) return <Navigate to={getHomePath(admin)} />;
  return children;
};

function AppContent() {
  const { isAuthenticated, admin } = useAuth();

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader label="Loading…" /></div>}>
      <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={getHomePath(admin)} replace /> : <Login />} />
      <Route path="/supplier-login" element={isAuthenticated ? <Navigate to={getHomePath(admin)} replace /> : <SupplierLogin />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role="WHOLESALER">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supplier"
        element={
          <ProtectedRoute role="SUPPLIER">
            <SupplierPortal />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={isAuthenticated ? <Navigate to={getHomePath(admin)} /> : <Navigate to="/login" />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <DataProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </DataProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
