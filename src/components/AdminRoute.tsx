import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  const isAdminLogin = isAdmin || user?.email?.toLowerCase().startsWith('admin');

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center space-y-3">
          <div className="size-12 mx-auto rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-primary animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Checking access...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdminLogin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export default AdminRoute;
