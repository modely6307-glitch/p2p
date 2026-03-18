'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Profile } from '@/types';

const createClient = async () => {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set(name: string, value: string, options: any) { try { cookieStore.set({ name, value, ...options }); } catch (e) {} },
                remove(name: string, options: any) { try { cookieStore.delete({ name, ...options }); } catch (e) {} },
            },
        }
    );
};

export async function fetchProfileAction(userId: string) {
    try {
        const supabase = await createClient();
        
        // Ensure user is fetching their own profile or public data
        // RLS will naturally restrict writes, but for reading we can just query.
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return { success: true, data: data as Profile };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateMyProfileAction(userId: string, updates: Partial<Profile>) {
    try {
        const supabase = await createClient();
        
        // Verify identity
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== userId) throw new Error("無權修改此個人資料");

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as Profile };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
