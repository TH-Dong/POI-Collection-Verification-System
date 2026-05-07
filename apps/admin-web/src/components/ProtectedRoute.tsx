import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasRole } from '../utils/role';

interface ProtectedRouteProps {
  requiredRoles?: string[];
}

export function ProtectedRoute({ requiredRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const { token, user } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiredRoles?.length && !hasRole(user?.roles, requiredRoles)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
