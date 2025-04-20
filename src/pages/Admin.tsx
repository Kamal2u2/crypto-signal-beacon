
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';

const Admin = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.role || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
      return;
    }

    setUsers(data || []);
  };

  const handleApproval = async (userId: string, approve: boolean) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_approved: approve })
      .eq('id', userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `User ${approve ? 'approved' : 'rejected'} successfully`,
    });

    fetchUsers();
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className={user.is_approved ? "text-green-500" : "text-yellow-500"}>
                    {user.is_approved ? "Approved" : "Pending"}
                  </span>
                </TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  {!user.is_approved && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApproval(user.id, true)}
                        variant="default"
                        size="sm"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleApproval(user.id, false)}
                        variant="destructive"
                        size="sm"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Admin;
