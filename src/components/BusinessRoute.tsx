import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

/** Guards the business area: requires a signed-in barber/admin account. */
export default function BusinessRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/business/signup" replace />;
  if (user.role !== 'barber' && user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}
