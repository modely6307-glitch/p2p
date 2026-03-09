import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('MISSING SUPABASE ENV VARS: Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export const supabase = (() => {
    if (supabaseInstance) return supabaseInstance

    supabaseInstance = createBrowserClient(supabaseUrl || '', supabaseAnonKey || '', {
        auth: {
            // @ts-ignore: lockSession prevents the 5s hang on rapid refreshes
            lockSession: false,
        }
    })
    return supabaseInstance
})()
