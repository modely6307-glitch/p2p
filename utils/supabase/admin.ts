import { createClient } from '@supabase/supabase-js'

// Getter to ensure we always have the freshest ENV variables (important for local dev)
export const getSupabaseAdmin = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('MISSING ADMIN ENV VARS: Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    }

    return createClient(supabaseUrl || '', supabaseServiceKey || '')
}
