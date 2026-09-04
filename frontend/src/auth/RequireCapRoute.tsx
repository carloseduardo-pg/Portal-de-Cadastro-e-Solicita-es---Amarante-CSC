import { Navigate, Outlet } from 'react-router-dom';
import { hasAnyCap, type Capability } from '../lib/capabilities';
import { useAuth } from './AuthContext';

/** Bloqueia a rota se o usuário não tiver ao menos uma das capacidades. */
export function RequireCapRoute({ cap }: { cap: Capability | Capability[] }) {
  const { user } = useAuth();
  const caps = Array.isArray(cap) ? cap : [cap];
  if (!hasAnyCap(user, caps)) {
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
}
