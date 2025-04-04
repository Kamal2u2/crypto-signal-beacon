
import { Link } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";

export const Navigation = () => {
  const { user, isSignedIn } = useUser();
  const { signOut } = useAuth();
  
  // Simple check for admin role - in a real app, you would check this from your backend
  // or use Clerk's role management features
  const isAdmin = user?.id === 'admin_user_id_placeholder'; // Replace with actual admin check
  
  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-primary">
                Signal App
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            {isSignedIn ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Admin Panel
                  </Link>
                )}
                
                <Link 
                  to="/profile" 
                  className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                >
                  My Profile
                </Link>
                
                <div className="relative ml-3">
                  <button
                    onClick={() => signOut()}
                    className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {/* Sign-in and sign-up buttons removed */}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
