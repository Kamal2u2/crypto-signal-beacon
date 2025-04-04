
import React, { useState } from 'react';
import { useUser } from "@clerk/clerk-react";

type User = {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'pending' | 'blocked';
  lastLogin: string;
};

// Mock user data - in a real app, you would fetch this from your backend
const mockUsers: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active', lastLogin: '2023-04-01T10:30:00' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'active', lastLogin: '2023-04-02T14:20:00' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', status: 'pending', lastLogin: '2023-03-28T09:15:00' },
  { id: '4', name: 'Sarah Williams', email: 'sarah@example.com', status: 'blocked', lastLogin: '2023-03-15T16:45:00' },
];

const AdminPanel = () => {
  const { user } = useUser();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleStatusChange = (userId: string, newStatus: 'active' | 'pending' | 'blocked') => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
      <p className="text-gray-600 mb-8">Manage user access and permissions</p>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
            Add User
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4 whitespace-nowrap">{user.name}</td>
                  <td className="py-4 px-4 whitespace-nowrap">{user.email}</td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    {new Date(user.lastLogin).toLocaleString()}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap space-x-2">
                    <select 
                      value={user.status}
                      onChange={(e) => handleStatusChange(user.id, e.target.value as 'active' | 'pending' | 'blocked')}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No users found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
