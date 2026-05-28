import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
