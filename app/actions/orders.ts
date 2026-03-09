'use server';

import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { OrderStatus } from '@/types';

// Helper to create a Supabase client for the current requesting user
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
            },
        }
    );
};

export async function confirmReceipt(orderId: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();

        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) throw new Error("找不到訂單");
        if (order.buyer_id !== user.id) throw new Error("您不是這筆訂單的買家，無權收貨");
        if (order.status !== 'SHIPPED') throw new Error("訂單必須在『已出貨』狀態才能確認收貨");

        const amountTwd = Math.round((order.target_price * (order.exchange_rate || 1)) + order.reward_fee);

        // 1. Update status to COMPLETED
        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ status: 'COMPLETED' })
            .eq('id', orderId);

        if (updateError) throw updateError;

        // 2. Increment stats securely via Server Action
        if (order.traveler_id) {
            const { error: statsError } = await supabaseAdmin.rpc('increment_order_stats', {
                user_id: order.traveler_id,
                order_amount: amountTwd
            });
            if (statsError) console.error("Error incrementing stats:", statsError);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Server Action confirmReceipt Error:", error);
        return { success: false, error: error.message };
    }
}

export async function delistOrderGroup(orderId: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();

        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) throw new Error("找不到訂單");

        // allow admin or buyer to delist
        const { data: profile } = await supabaseAdmin.from('profiles').select('level').eq('id', user.id).single();
        const isAdmin = profile?.level === 'ADMIN';

        if (order.buyer_id !== user.id && !isAdmin) {
            throw new Error("您無權取消此訂單");
        }

        if (order.status !== 'OPEN') {
            throw new Error("只能取消處於『徵求中 (OPEN)』狀態的訂單");
        }

        // Delist itself
        const { error: delistError } = await supabaseAdmin
            .from('orders')
            .update({ status: 'DELISTED' })
            .eq('id', orderId);

        if (delistError) throw delistError;

        // If it's a parent order group, delist child orders too
        const { error: childError } = await supabaseAdmin
            .from('orders')
            .update({ status: 'DELISTED' })
            .eq('parent_order_id', orderId)
            .eq('status', 'OPEN');

        if (childError) throw childError;

        return { success: true };
    } catch (error: any) {
        console.error("Server Action delistOrder Error:", error);
        return { success: false, error: error.message };
    }
}

export async function raiseDispute(orderId: string, reason: string, evidenceUrl?: string | null) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();

        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) throw new Error("找不到訂單");

        if (order.buyer_id !== user.id && order.traveler_id !== user.id) {
            throw new Error("只有買家或旅人可以提出爭議");
        }

        const validStatuses = ['ESCROWED', 'BOUGHT', 'SHIPPED'];
        if (!validStatuses.includes(order.status)) {
            throw new Error(`無法在 ${order.status} 狀態下提出爭議`);
        }

        const updates: Partial<any> = {
            status: 'DISPUTE',
            dispute_reason: reason,
            dispute_by_user_id: user.id,
            dispute_evidence_url: evidenceUrl,
            dispute_created_at: new Date().toISOString()
        };

        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update(updates)
            .eq('id', orderId);

        if (updateError) throw updateError;
        return { success: true };
    } catch (error: any) {
        console.error("Server Action raiseDispute Error:", error);
        return { success: false, error: error.message };
    }
}

export async function resolveDispute(orderId: string, resolutionStatus: OrderStatus, notes: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { data: profile } = await supabaseAdmin.from('profiles').select('level').eq('id', user.id).single();
        if (profile?.level !== 'ADMIN') {
            throw new Error("只有管理員可以裁決爭議");
        }

        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) throw new Error("找不到訂單");
        if (order.status !== 'DISPUTE') throw new Error("此訂單不在爭議中");
        if (resolutionStatus !== 'COMPLETED' && resolutionStatus !== 'DELISTED') {
            throw new Error("爭議只能裁決為『完成訂單 (COMPLETED)』或『取消退款 (DELISTED)』");
        }

        const updates: Partial<any> = {
            status: resolutionStatus,
            dispute_resolution: notes,
            dispute_resolved_at: new Date().toISOString()
        };

        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update(updates)
            .eq('id', orderId);
        if (updateError) throw updateError;

        // If resolving into COMPLETED, securely increment the stats
        if (resolutionStatus === 'COMPLETED' && order.traveler_id) {
            const amountTwd = Math.round((order.target_price * (order.exchange_rate || 1)) + order.reward_fee);
            const { error: statsError } = await supabaseAdmin.rpc('increment_order_stats', {
                user_id: order.traveler_id,
                order_amount: amountTwd
            });
            if (statsError) console.error("Error incrementing stats on resolution:", statsError);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Server Action resolveDispute Error:", error);
        return { success: false, error: error.message };
    }
}

export async function acceptOrder(orderIds: string[]) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();

        // 1. Assign traveler and change OPEN -> MATCHED
        const { error: openError } = await supabaseAdmin
            .from('orders')
            .update({
                traveler_id: user.id,
                status: 'MATCHED'
            })
            .in('id', orderIds)
            .eq('status', 'OPEN')
            .is('traveler_id', null);

        if (openError) throw openError;

        // 2. Assign traveler and keep ESCROWED -> ESCROWED
        // (For PRE_ESCROW orders that were already paid and confirmed by admin)
        const { error: escrowError } = await supabaseAdmin
            .from('orders')
            .update({
                traveler_id: user.id
            })
            .in('id', orderIds)
            .eq('status', 'ESCROWED')
            .is('traveler_id', null);

        if (escrowError) throw escrowError;

        return { success: true };
    } catch (error: any) {
        console.error("Server Action acceptOrder Error:", error);
        return { success: false, error: error.message };
    }
}

export async function confirmEscrow(orderId: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { data: profile } = await supabaseAdmin.from('profiles').select('level').eq('id', user.id).single();
        if (profile?.level !== 'ADMIN') throw new Error("只有管理員可以確認託管款項");

        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ status: 'ESCROWED' })
            .eq('id', orderId)
            .in('status', ['MATCHED', 'OPEN']);

        if (updateError) throw updateError;
        return { success: true };
    } catch (error: any) {
        console.error("Server Action confirmEscrow Error:", error);
        return { success: false, error: error.message };
    }
}

export async function updateOrderTracking(orderId: string, trackingNumber: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { data: order } = await supabaseAdmin.from('orders').select('traveler_id, status').eq('id', orderId).single();
        if (!order || order.traveler_id !== user.id) throw new Error("無權操作");
        if (order.status !== 'BOUGHT') throw new Error("狀態錯誤");

        const { error } = await supabaseAdmin
            .from('orders')
            .update({ tracking_number: trackingNumber, status: 'SHIPPED' })
            .eq('id', orderId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function batchUpdateTrackingNumbers(updates: { orderId: string, trackingNumber: string }[]) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const orderIds = updates.map(u => u.orderId);

        // Fetch to ensure authentication/authorization
        const { data: orders } = await supabaseAdmin
            .from('orders')
            .select('id, traveler_id, status')
            .in('id', orderIds)
            .eq('traveler_id', user.id)
            .eq('status', 'BOUGHT');

        if (!orders || orders.length !== updates.length) throw new Error("無權操作或狀態錯誤");

        // Loop array and update each. We use promise.all.
        const promises = updates.map(update =>
            supabaseAdmin
                .from('orders')
                .update({ tracking_number: update.trackingNumber, status: 'SHIPPED' })
                .eq('id', update.orderId)
                .eq('traveler_id', user.id)
        );

        await Promise.all(promises);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateReceipt(orderId: string, url: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { data: order } = await supabaseAdmin.from('orders').select('traveler_id, status').eq('id', orderId).single();
        if (!order || order.traveler_id !== user.id) throw new Error("無權操作");
        if (order.status !== 'ESCROWED') throw new Error("必須在託管狀態才能上傳收據");

        const { error } = await supabaseAdmin
            .from('orders')
            .update({ receipt_url: url, status: 'BOUGHT' })
            .eq('id', orderId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function finishPurchase(orderId: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { data: order } = await supabaseAdmin.from('orders').select('traveler_id, status').eq('id', orderId).single();
        if (!order || order.traveler_id !== user.id) throw new Error("無權操作");
        if (order.status !== 'ESCROWED') throw new Error("必須在託管狀態才能完成購買");

        const { error } = await supabaseAdmin
            .from('orders')
            .update({ status: 'BOUGHT' })
            .eq('id', orderId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updatePurchasePhoto(orderId: string, url: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { data: order } = await supabaseAdmin.from('orders').select('traveler_id, status').eq('id', orderId).single();
        if (!order || order.traveler_id !== user.id) throw new Error("無權操作");
        if (order.status !== 'ESCROWED') throw new Error("必須在託管狀態才能上傳購買證明");

        const { error } = await supabaseAdmin.from('orders').update({ purchase_photo_url: url }).eq('id', orderId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function batchUpdatePurchasePhoto(orderIds: string[], url: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { error } = await supabaseAdmin
            .from('orders')
            .update({ purchase_photo_url: url })
            .in('id', orderIds)
            .eq('traveler_id', user.id)
            .eq('status', 'ESCROWED');

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function batchUpdateReceipt(orderIds: string[], url: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { error } = await supabaseAdmin
            .from('orders')
            .update({ receipt_url: url })
            .in('id', orderIds)
            .eq('traveler_id', user.id)
            .eq('status', 'ESCROWED');

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function batchFinishPurchase(orderIds: string[]) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { error } = await supabaseAdmin
            .from('orders')
            .update({ status: 'BOUGHT' })
            .in('id', orderIds)
            .eq('traveler_id', user.id)
            .eq('status', 'ESCROWED');

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateModelNumber(orderId: string, modelNumber: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { data: order } = await supabaseAdmin.from('orders').select('traveler_id, status').eq('id', orderId).single();
        if (!order || order.traveler_id !== user.id) throw new Error("無權操作");
        if (order.status !== 'ESCROWED') throw new Error("必須在託管狀態才能更新型號");

        const { error } = await supabaseAdmin.from('orders').update({ model_number: modelNumber }).eq('id', orderId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function notifyPaid(orderId: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { data: order } = await supabaseAdmin.from('orders').select('buyer_id').eq('id', orderId).single();
        if (!order || order.buyer_id !== user.id) throw new Error("無權操作");

        const { error } = await supabaseAdmin.from('orders').update({ payment_notification_sent: true }).eq('id', orderId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function relistOrder(orderId: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { data: order } = await supabaseAdmin.from('orders').select('buyer_id, status').eq('id', orderId).single();
        if (!order || order.buyer_id !== user.id) throw new Error("無權操作");
        if (order.status !== 'DELISTED') throw new Error("只能將已取消的訂單重新上架");

        const { error } = await supabaseAdmin.from('orders').update({ status: 'OPEN' }).eq('id', orderId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function submitUserRating(orderId: string, targetUserId: string, isPositive: boolean) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();

        // 1. Update the order record to mark as rated
        const { data: order } = await supabaseAdmin.from('orders').select('buyer_id, traveler_id').eq('id', orderId).single();
        if (!order) throw new Error("找不到訂單");

        if (user.id === order.buyer_id) {
            await supabaseAdmin.from('orders').update({ rated_by_buyer: true }).eq('id', orderId);
        } else if (user.id === order.traveler_id) {
            await supabaseAdmin.from('orders').update({ rated_by_traveler: true }).eq('id', orderId);
        }

        // 2. Perform the actual rating update on the profile
        const { error } = await supabaseAdmin.rpc('rate_user', {
            user_id: targetUserId,
            is_positive: isPositive
        });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function adminReleaseFunds(orderId: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();
        const { data: profile } = await supabaseAdmin.from('profiles').select('level').eq('id', user.id).single();
        if (profile?.level !== 'ADMIN') {
            throw new Error("只有管理員可以撥款");
        }

        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) throw new Error("找不到訂單");
        if (order.status !== 'SHIPPED') throw new Error("只能撥款給已出貨的訂單");

        const amountTwd = Math.round((order.target_price * (order.exchange_rate || 1)) + order.reward_fee);

        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ status: 'COMPLETED' })
            .eq('id', orderId);

        if (updateError) throw updateError;

        if (order.traveler_id) {
            const { error: statsError } = await supabaseAdmin.rpc('increment_order_stats', {
                user_id: order.traveler_id,
                order_amount: amountTwd
            });
            if (statsError) console.error("Error incrementing stats on admin release:", statsError);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Server Action adminReleaseFunds Error:", error);
        return { success: false, error: error.message };
    }
}
