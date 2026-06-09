import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/authStore';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import HeatSource from './pages/HeatSource';
import NetworkMonitor from './pages/NetworkMonitor';
import HeatStationPage from './pages/HeatStation';
import UserSidePage from './pages/UserSide';
import Billing from './pages/Billing';
import Installation from './pages/Installation';
import WorkOrder from './pages/WorkOrder';
import Report from './pages/Report';
import SystemSettings from './pages/SystemSettings';
import Login from './pages/Login';
import type { ReactNode } from 'react';

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/': ['user', 'station_admin', 'region_manager', 'company_admin'],
  '/heat-source': ['station_admin', 'region_manager', 'company_admin'],
  '/network': ['station_admin', 'region_manager', 'company_admin'],
  '/heat-station': ['station_admin', 'region_manager', 'company_admin'],
  '/user-side': ['user', 'station_admin', 'region_manager', 'company_admin'],
  '/billing': ['user', 'station_admin', 'region_manager', 'company_admin'],
  '/installation': ['user', 'station_admin', 'region_manager', 'company_admin'],
  '/work-order': ['station_admin', 'region_manager', 'company_admin'],
  '/report': ['region_manager', 'company_admin'],
  '/settings': ['company_admin'],
};

function ForbiddenPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#999' }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🚫</div>
      <h2 style={{ color: '#ff4d4f', marginBottom: 8 }}>无访问权限</h2>
      <p>您没有权限访问此页面，请联系管理员</p>
      <a href="/" style={{ color: '#1890ff', marginTop: 16 }}>返回首页</a>
    </div>
  );
}

function ProtectedRoute({ path, children }: { path: string; children: ReactNode }) {
  const { currentUser, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const allowedRoles = ROUTE_PERMISSIONS[path];
  const userRole = currentUser?.role || 'user';
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <ForbiddenPage />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<ProtectedRoute path="/"><Dashboard /></ProtectedRoute>} />
            <Route path="/heat-source" element={<ProtectedRoute path="/heat-source"><HeatSource /></ProtectedRoute>} />
            <Route path="/network" element={<ProtectedRoute path="/network"><NetworkMonitor /></ProtectedRoute>} />
            <Route path="/heat-station" element={<ProtectedRoute path="/heat-station"><HeatStationPage /></ProtectedRoute>} />
            <Route path="/user-side" element={<ProtectedRoute path="/user-side"><UserSidePage /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute path="/billing"><Billing /></ProtectedRoute>} />
            <Route path="/installation" element={<ProtectedRoute path="/installation"><Installation /></ProtectedRoute>} />
            <Route path="/work-order" element={<ProtectedRoute path="/work-order"><WorkOrder /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute path="/report"><Report /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute path="/settings"><SystemSettings /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
