import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import TaskList from './pages/TaskList';
import DataLabsReports from './pages/DataLabsReports';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import OpportunityPipeline from './pages/OpportunityPipeline';
import ComingSoon from './pages/ComingSoon';
import Layout from './components/EnhancedLayout';
import { Toaster } from './components/ui/sonner';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
export const API = `${BACKEND_URL}/api`;

// Axios interceptor for auth
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Setup axios response interceptor for 401 handling
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - logout user
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const perms = localStorage.getItem('permissions');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    if (perms) {
      try {
        setPermissions(JSON.parse(perms));
      } catch {
        // ignore
      }
    }
    setLoading(false);
  }, []);

  const hasModule = (key) => {
    if (!permissions) return true; // optimistic until loaded
    return !!permissions?.modules?.[key]?.enabled;
  };

  const fetchPermissions = useCallback(async () => {
    try {
      setPermissionsLoading(true);
      const res = await axios.get(`${API}/auth/permissions`);
      setPermissions(res.data);
      localStorage.setItem('permissions', JSON.stringify(res.data));
    } catch (e) {
      // If this fails, keep app usable but don't gate routes.
      console.error('Failed to load permissions', e);
      setPermissions(null);
      localStorage.removeItem('permissions');
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    // Load permissions for the logged-in user
    fetchPermissions();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    setUser(null);
    setPermissions(null);
  };

  // Refresh permissions when user session exists
  useEffect(() => {
    if (user) {
      fetchPermissions();
    }
  }, [user?.id, fetchPermissions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (user && permissionsLoading && !permissions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading permissions…</div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
            }
          />
          <Route
            path="/"
            element={
              user ? (
                <Layout user={user} permissions={permissions} onLogout={handleLogout}>
                  <Dashboard />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/customers"
            element={
              user ? (
                hasModule('customers') ? (
                  <Layout user={user} permissions={permissions} onLogout={handleLogout}>
                    <CustomerList />
                  </Layout>
                ) : (
                  <Navigate to="/" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/customers/:customerId"
            element={
              user ? (
                hasModule('customers') ? (
                  <Layout user={user} permissions={permissions} onLogout={handleLogout}>
                    <CustomerDetail />
                  </Layout>
                ) : (
                  <Navigate to="/" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/tasks"
            element={
              user ? (
                hasModule('tasks') ? (
                  <Layout user={user} permissions={permissions} onLogout={handleLogout}>
                    <TaskList />
                  </Layout>
                ) : (
                  <Navigate to="/" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/data-labs-reports"
            element={
              user ? (
                hasModule('datalabs_reports') ? (
                  <Layout user={user} permissions={permissions} onLogout={handleLogout}>
                    <DataLabsReports />
                  </Layout>
                ) : (
                  <Navigate to="/" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              user ? (
                hasModule('settings') ? (
                  <Layout user={user} permissions={permissions} onLogout={handleLogout}>
                    <Settings />
                  </Layout>
                ) : (
                  <Navigate to="/" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/reports"
            element={
              user ? (
                hasModule('dashboard') ? (
                  <Layout user={user} permissions={permissions} onLogout={handleLogout}>
                    <Reports />
                  </Layout>
                ) : (
                  <Navigate to="/" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/opportunities"
            element={
              user ? (
                hasModule('opportunities') ? (
                  <Layout user={user} permissions={permissions} onLogout={handleLogout}>
                    <OpportunityPipeline />
                  </Layout>
                ) : (
                  <Navigate to="/" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="*"
            element={
              user ? (
                <Layout user={user} permissions={permissions} onLogout={handleLogout}>
                  <ComingSoon />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
