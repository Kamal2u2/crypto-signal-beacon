
import React from 'react';
import { useUser, useAuth } from "@clerk/clerk-react";
import { toast } from "@/components/ui/use-toast";

const UserProfile = () => {
  const { user } = useUser();
  const { signOut } = useAuth();
  
  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "An error occurred while signing out",
        variant: "destructive",
      });
    }
  };
  
  if (!user) {
    return <div>Loading user profile...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden">
            {user.imageUrl ? (
              <img 
                src={user.imageUrl} 
                alt="Profile" 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-500 text-xl font-semibold bg-gray-300">
                {user.firstName?.charAt(0) || user.username?.charAt(0) || '?'}
              </div>
            )}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">{user.fullName || user.username}</h1>
            <p className="text-gray-600">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
        
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Profile Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
              <p className="text-gray-800">{user.firstName || 'Not set'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
              <p className="text-gray-800">{user.lastName || 'Not set'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <p className="text-gray-800">{user.primaryEmailAddress?.emailAddress || 'No email'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Account Created</label>
              <p className="text-gray-800">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <button 
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
