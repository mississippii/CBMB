import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { DataProvider } from './data/DataContext';
import { LanguageProvider } from './shared/contexts/LanguageContext';
import { ToastProvider } from './shared/components/Toast';
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import AdminDashboard from './features/admin/AdminDashboard';
import './index.css';

const getHomePath = (admin) => (admin?.role === 'ADMIN' ? '/admin' : '/dashboard');

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, admin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (role && admin?.role !== role) return <Navigate to={getHomePath(admin)} />;
  return children;
};

function AppContent() {
  const { isAuthenticated, admin } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
      <Route path="/" element={isAuthenticated ? <Navigate to={getHomePath(admin)} /> : <Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <DataProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </DataProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
