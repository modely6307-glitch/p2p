import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

// Getter to ensure we always have the freshest ENV variables (important for local dev)
export const getSupabaseAdmin = () => {
    if (!supabaseAdmin) {
        throw new Error('Missing Supabase admin credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
    }
    return supabaseAdmin;
}
