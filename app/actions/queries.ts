'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Order, OrderStatus } from '@/types';
import { z } from 'zod';

const createClient = async () => {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    try { cookieStore.set({ name, value, ...options }); } catch (e) {}
                },
                remove(name: string, options: any) {
                    try { cookieStore.delete({ name, ...options }); } catch (e) {}
                },
            },
        }
    );
};

export async function fetchMarketOrders(statuses: OrderStatus[] = ['OPEN', 'ESCROWED']) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('orders')
            .select('*, buyer:profiles!buyer_id(*), traveler:profiles!traveler_id(*)')
            .in('status', statuses)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data as Order[] };
    } catch (error: any) {
        console.error('fetchMarketOrders error:', error);
        return { success: false, error: error.message };
    }
}

export async function fetchUserOrders(userId: string, role: 'buyer' | 'traveler') {
    try {
        const supabase = await createClient();
        // Option to verify if user matches, but RLS will also protect this
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const column = role === 'buyer' ? 'buyer_id' : 'traveler_id';
        const { data, error } = await supabase
            .from('orders')
            .select('*, buyer:profiles!buyer_id(*), traveler:profiles!traveler_id(*)')
            .eq(column, userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data as Order[] };
    } catch (error: any) {
        console.error('fetchUserOrders error:', error);
        return { success: false, error: error.message };
    }
}

export async function fetchOrderDetails(orderId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('orders')
            .select('*, buyer:profiles!buyer_id(*), traveler:profiles!traveler_id(*)')
            .eq('id', orderId)
            .single();

        if (error) throw error;
        return { success: true, data: data as Order };
    } catch (error: any) {
        console.error('fetchOrderDetails error:', error);
        return { success: false, error: error.message };
    }
}

export async function fetchWishGroupAction(parentOrderId: string | null, orderId: string) {
    try {
        const rootId = parentOrderId || orderId;
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('orders')
            .select('*, buyer:profiles!buyer_id(*), traveler:profiles!traveler_id(*)')
            .or(`id.eq.${rootId},parent_order_id.eq.${rootId}`)
            .in('status', ['OPEN', 'ESCROWED'])
            .is('traveler_id', null)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { success: true, data: data as Order[] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function fetchTravelerGroupOrdersAction(parentOrderId: string | null, orderId: string, travelerId: string) {
    try {
        const rootId = parentOrderId || orderId;
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('orders')
            .select('*, buyer:profiles!buyer_id(*), traveler:profiles!traveler_id(*)')
            .or(`id.eq.${rootId},parent_order_id.eq.${rootId}`)
            .eq('traveler_id', travelerId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { success: true, data: data as Order[] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
