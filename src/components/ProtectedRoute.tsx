
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { Navigate, Outlet } from "react-router-dom";

type ProtectedRouteProps = {
  requireAuth?: boolean; 
  requireAdmin?: boolean;
};

export const ProtectedRoute = ({ requireAuth = true, requireAdmin = false }: ProtectedRouteProps) => {
  const { userId, getToken, sessionId } = useAuth();
  
  // Simple check for admin role - in a real app, you might want to check this from your backend
  // or use Clerk's role management features
  const isAdmin = userId === 'admin_user_id_placeholder'; // Replace with actual admin check logic

  if (requireAuth && !sessionId) {
    return <Navigate to="/sign-in" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

// Component for content that should only be visible to signed-in users
export const AuthenticatedContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <SignedIn>
      {children}
    </SignedIn>
  );
};

// Component for content that should only be visible to signed-out users
export const UnauthenticatedContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <SignedOut>
      {children}
    </SignedOut>
  );
};
