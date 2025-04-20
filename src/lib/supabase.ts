
import { createClient } from '@supabase/supabase-js';

// Use the values from src/integrations/supabase/client.ts
const supabaseUrl = "https://xpdcvekfpjgzjiletqek.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwZGN2ZWtmcGpnemppbGV0cWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNjE2MDIsImV4cCI6MjA2MDczNzYwMn0.-8qW_8rQuk_gYmAm6pwBuvLiCeNsqqFiUehAjun05sM";

// Create the supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
