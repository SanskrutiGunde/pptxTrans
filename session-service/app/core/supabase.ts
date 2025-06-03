import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);

// Helper function to handle Supabase responses
export const handleSupabaseResponse = <T>(
  data: T | null,
  error: Error | null
) => {
  if (error) {
    console.error('Supabase error:', error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}; 