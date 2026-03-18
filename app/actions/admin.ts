'use server';

import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Order, Profile, SystemSettings } from '@/types';

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

const enforceAdmin = async (bypassKey?: string | null) => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("您尚未登入");

    const supabaseAdmin = getSupabaseAdmin();
    if (process.env.NODE_ENV === 'development' && bypassKey === 'true') {
        return supabaseAdmin;
    }

    const { data: profile } = await supabaseAdmin.from('profiles').select('level').eq('id', user.id).single();
    if (profile?.level !== 'ADMIN') throw new Error("權限不足");
    return supabaseAdmin;
};

export async function fetchAllOrdersAction(bypassKey?: string | null) {
    try {
        const supabaseAdmin = await enforceAdmin(bypassKey);
        const { data, error } = await supabaseAdmin
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return { success: true, data: data as Order[] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function fetchAllProfilesAction(bypassKey?: string | null) {
    try {
        const supabaseAdmin = await enforceAdmin(bypassKey);
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return { success: true, data: data as Profile[] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function fetchSystemSettingsAction(bypassKey?: string | null) {
    try {
        const supabaseAdmin = await enforceAdmin(bypassKey);
        const { data, error } = await supabaseAdmin
            .from('settings')
            .select('*')
            .eq('id', 'global')
            .single();
            
        if (error && error.code !== 'PGRST116') throw error;
        
        let settings = data as SystemSettings | null;
        if (!settings) {
            settings = {
                id: 'global',
                buyer_fee_threshold: 1000,
                buyer_fee_fixed_amount: 20,
                buyer_fee_percentage: 2,
                traveler_fee_threshold: 1000,
                traveler_fee_fixed_amount: 20,
                traveler_fee_percentage: 2,
                deposit_threshold_days: 30
            };
        }
        return { success: true, data: settings };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateSystemSettingsAction(settings: Partial<SystemSettings>, bypassKey?: string | null) {
    try {
        const supabaseAdmin = await enforceAdmin(bypassKey);
        const { data, error } = await supabaseAdmin
            .from('settings')
            .upsert({ id: 'global', ...settings })
            .select()
            .single();
        if (error) throw error;
        return { success: true, data: data as SystemSettings };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateProfileAction(userId: string, updates: Partial<Profile>, bypassKey?: string | null) {
    try {
        const supabaseAdmin = await enforceAdmin(bypassKey);
        const { data, error } = await supabaseAdmin
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
