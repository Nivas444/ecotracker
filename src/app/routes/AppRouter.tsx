import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../providers/AuthContext';
import { AppStateProvider } from '../providers/AppStateContext';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../../components/layout/AppLayout';
import { LoginPage } from '../../features/auth/LoginPage';
import { DashboardPage } from '../../features/dashboard/DashboardPage';
import { BinsPage } from '../../features/bins/BinsPage';
import { BatchOperationsPage } from '../../features/batches/BatchOperationsPage';
import { RouteManagementPage } from '../../features/routes/RouteManagementPage';
import { LogisticsPage } from '../../features/logistics/LogisticsPage';
import { ReportsPage } from '../../features/reports/ReportsPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppStateProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/bins" element={<BinsPage />} />
                <Route path="/batches" element={<BatchOperationsPage />} />
                <Route path="/verified" element={<Navigate to="/batches" replace />} />
                <Route path="/recyclers" element={<Navigate to="/dashboard" replace />} />
                <Route path="/routes" element={<RouteManagementPage />} />
                <Route path="/logistics" element={<LogisticsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AppStateProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
