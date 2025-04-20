
export interface UserProfile {
  id: string;
  email: string;
  is_approved: boolean;
  role: 'user' | 'admin';
  created_at: string;
}
