'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { OrderMessage } from '@/types';

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

export async function fetchOrderMessagesAction(orderId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('order_messages')
            .select('*, user:profiles(id, display_name, email)')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { success: true, data: data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function sendOrderMessageAction(orderId: string, content: string | null, imageUrl: string | null = null) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const { data, error } = await supabase
            .from('order_messages')
            .insert({
                order_id: orderId,
                user_id: user.id,
                content,
                image_url: imageUrl
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as OrderMessage };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateOrderLastReadAtAction(orderId: string, role: 'buyer' | 'traveler' | 'admin') {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const column = role === 'buyer' ? 'buyer_last_read_at' : (role === 'traveler' ? 'traveler_last_read_at' : 'admin_last_read_at');
        const { error } = await supabase
            .from('orders')
            .update({ [column]: new Date().toISOString() })
            .eq('id', orderId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function fetchUnreadMessagesCountAction(orderId: string, lastReadAt: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const { count, error } = await supabase
            .from('order_messages')
            .select('id', { count: 'exact', head: true })
            .eq('order_id', orderId)
            .neq('user_id', user.id)
            .gt('created_at', lastReadAt);

        if (error) throw error;
        return { success: true, count: count || 0 };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
