import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface RoleGuardProps {
  roles: Array<"student" | "instructor" | "admin">;
}

/**
 * Simple guard that redirects to home when the current user isn't
 * authenticated or doesn't have one of the allowed roles.
 *
 * Can be used in App.tsx by wrapping a group of routes:
 *
 * <Route element={<RoleGuard roles={["instructor","admin"]} />}>
 *   <Route path="/tutores" ... />
 * </Route>
 */

const RoleGuard: React.FC<RoleGuardProps> = ({ roles }) => {
  const { profile, loading } = useAuth();

  // while we don't know yet, show a spinner to avoid flicker
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile || !roles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RoleGuard;
