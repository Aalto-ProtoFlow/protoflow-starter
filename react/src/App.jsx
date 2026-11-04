import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DevicesPage from './pages/DevicesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/dashboard/:deviceId" element={<DashboardPage />} />
          <Route path="/history/:deviceId" element={<HistoryPage />} />
          <Route path="/settings/:deviceId" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/devices" replace />} />
    </Routes>
  );
}
