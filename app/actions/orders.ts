'use server';

import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { OrderStatus } from '@/types';
import { canConfirmReceipt } from '@/utils/order-logic';

// Helper to create a Supabase client for the current requesting user
const createClient = async () => {
    const cookieStore = await cookies();
    const hasSession = cookieStore.getAll().some(c => c.name.includes('supabase-auth-token') || c.name.includes('sb-'));
    console.log(`[createClient] hasSession cookies: ${hasSession}`);

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: any) {
                    try {
                        cookieStore.delete({ name, ...options });
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
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
        
        // Use the new logic utility
        const validation = canConfirmReceipt(order as any, user.id);
        if (!validation.can) throw new Error(validation.reason);

        const amountTwd = Math.round((order.target_price * (order.exchange_rate || 1)) + order.reward_fee);

        // 1. Update status to COMPLETED
        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ status: 'COMPLETED' })
            .eq('id', orderId);

        if (updateError) throw updateError;

        // 2. Increment stats non-blocking — do NOT await, so the button
        //    doesn't hang if the RPC is slow. Stats update in the background.
        if (order.traveler_id) {
            supabaseAdmin.rpc('increment_order_stats', {
                user_id: order.traveler_id,
                order_amount: amountTwd
            }).then(({ error }) => {
                if (error) console.error("Error incrementing traveler stats:", error);
            });
        }
        supabaseAdmin.rpc('increment_order_stats', {
            user_id: order.buyer_id,
            order_amount: amountTwd
        }).then(({ error }) => {
            if (error) console.error("Error incrementing buyer stats:", error);
        });

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
            previous_status: order.status,
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

export async function cancelDispute(orderId: string) {
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

        if (order.status !== 'DISPUTE') throw new Error("此訂單不在爭議中");
        if (order.dispute_by_user_id !== user.id) {
            throw new Error("只有申訴人可以取消申訴");
        }

        if (!order.previous_status) {
            throw new Error("無法取消申訴（缺少先前的狀態記錄）");
        }

        const updates: Partial<any> = {
            status: order.previous_status,
            previous_status: null,
            dispute_resolution: '申訴已由發起人自行取消',
            dispute_resolved_at: new Date().toISOString()
        };

        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update(updates)
            .eq('id', orderId);

        if (updateError) throw updateError;
        return { success: true };
    } catch (error: any) {
        console.error("Server Action cancelDispute Error:", error);
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
        const validResolutions = ['COMPLETED', 'DELISTED', 'MATCHED', 'ESCROWED', 'BOUGHT', 'SHIPPED'];
        if (!validResolutions.includes(resolutionStatus)) {
            throw new Error(`不合法的裁決狀態: ${resolutionStatus}`);
        }

        const updates: Partial<any> = {
            status: resolutionStatus,
            previous_status: null, // Clear after resolution
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
            if (statsError) console.error("Error incrementing traveler stats on resolution:", statsError);

            // Increment buyer stats as well
            const { error: buyerStatsError } = await supabaseAdmin.rpc('increment_order_stats', {
                user_id: order.buyer_id,
                order_amount: amountTwd
            });
            if (buyerStatsError) console.error("Error incrementing buyer stats on resolution:", buyerStatsError);
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

        const { data: openOrders } = await supabaseAdmin
            .from('orders')
            .select('buyer_id, status')
            .in('id', orderIds);

        if (openOrders && openOrders.some((o: any) => o.buyer_id === user.id)) {
            throw new Error("不能接自己的訂單");
        }

        if (openOrders && openOrders.some((o: any) => o.status === 'DELISTED')) {
            throw new Error("其中包含已下架的訂單，無法接單");
        }

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

        const { data: orderToConfirm } = await supabaseAdmin.from('orders').select('status, traveler_id, payment_type').eq('id', orderId).single();
        if (!orderToConfirm) throw new Error("找不到訂單");

        // OPEN → ESCROWED is only valid for PRE_ESCROW orders (buyer pays before traveler accepts).
        // MATCH_ESCROW orders must go through MATCHED first (traveler accepts → buyer pays → admin confirms).
        if (orderToConfirm.status === 'OPEN' && orderToConfirm.payment_type !== 'PRE_ESCROW') {
            throw new Error("此訂單須先由旅人接單（進入 MATCHED 狀態）才能確認款項");
        }

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

        const { error } = await supabaseAdmin.from('orders').update({
            status: 'OPEN',
            traveler_id: null,
            receipt_url: null,
            purchase_photo_url: null,
            tracking_number: null,
            model_number: null,
            payment_notification_sent: false,
            dispute_reason: null,
            dispute_by_user_id: null,
            dispute_evidence_url: null,
            dispute_resolution: null,
            dispute_created_at: null,
            dispute_resolved_at: null,
            previous_status: null
        }).eq('id', orderId);
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
        const { data: order } = await supabaseAdmin.from('orders').select('buyer_id, traveler_id, rated_by_buyer, rated_by_traveler, status').eq('id', orderId).single();
        if (!order) throw new Error("找不到訂單");
        if (order.status !== 'COMPLETED') throw new Error("訂單必須在『已完成』狀態才能給予評價");

        if (user.id === order.buyer_id) {
            if (order.rated_by_buyer) return { success: true };
            await supabaseAdmin.from('orders').update({ rated_by_buyer: true }).eq('id', orderId);
        } else if (user.id === order.traveler_id) {
            if (order.rated_by_traveler) return { success: true };
            await supabaseAdmin.from('orders').update({ rated_by_traveler: true }).eq('id', orderId);
        } else {
            throw new Error("您無權對此訂單進行評價");
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
            if (statsError) console.error("Error incrementing traveler stats on admin release:", statsError);
        }

        // Increment buyer stats as well
        const { error: buyerStatsError } = await supabaseAdmin.rpc('increment_order_stats', {
            user_id: order.buyer_id,
            order_amount: amountTwd
        });
        if (buyerStatsError) console.error("Error incrementing buyer stats on admin release:", buyerStatsError);

        return { success: true };
    } catch (error: any) {
        console.error("Server Action adminReleaseFunds Error:", error);
        return { success: false, error: error.message };
    }
}

export async function followOrderAction(
    parentOrderId: string,
    shippingDetails: {
        shipping_method: 'HOME' | '711';
        shipping_address?: string | null;
        cvs_store_info?: any;
        recipient_name: string;
        recipient_phone: string;
        shipping_fee: number;
    }
) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("您尚未登入");

        const supabaseAdmin = getSupabaseAdmin();

        const { data: parentOrder, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', parentOrderId)
            .single();
        if (fetchError || !parentOrder) throw new Error("訂單不存在");

        if (parentOrder.status === 'DELISTED') {
            throw new Error("此願望已下架，無法跟單");
        }

        // Determine root buyer_id (if this is already a follow order, check the root)
        let rootBuyerId = parentOrder.buyer_id;
        if (parentOrder.parent_order_id) {
            const { data: rootOrder } = await supabaseAdmin
                .from('orders')
                .select('buyer_id')
                .eq('id', parentOrder.parent_order_id)
                .single();
            if (rootOrder) rootBuyerId = rootOrder.buyer_id;
        }

        // Self-order guard: cannot follow own order
        if (user.id === parentOrder.buyer_id || user.id === rootBuyerId) {
            throw new Error("不能跟單自己的訂單");
        }

        // Build new order mirroring the parent
        const is_partial = typeof parentOrder.is_partial_payment === 'boolean' ? parentOrder.is_partial_payment : false;
        const dep_pct = parentOrder.deposit_percentage || 100;

        // Recalculate totals using follower's shipping fee
        const followerShippingFee = shippingDetails.shipping_fee || 0;
        const base_twd = (parentOrder.target_price * parentOrder.exchange_rate) + parentOrder.reward_fee;
        const follower_total_twd = base_twd + (parentOrder.buyer_platform_fee || 0) + followerShippingFee;
        const follower_deposit_amount = is_partial
            ? Math.round(follower_total_twd * (dep_pct / 100))
            : follower_total_twd;

        const newOrder: any = {
            buyer_id: user.id,
            item_name: parentOrder.item_name,
            target_price: parentOrder.target_price,
            reward_fee: parentOrder.reward_fee,
            total_amount: follower_total_twd,
            total_amount_twd: follower_total_twd,
            exchange_rate: parentOrder.exchange_rate,
            currency: parentOrder.currency,
            country: parentOrder.country,
            description: parentOrder.description,
            require_receipt: parentOrder.require_receipt,
            require_model_number: parentOrder.require_model_number,
            photo_url: parentOrder.photo_url,
            buyer_platform_fee: parentOrder.buyer_platform_fee,
            traveler_platform_fee: parentOrder.traveler_platform_fee,
            expected_shipping_date: parentOrder.expected_shipping_date,
            auto_extend: parentOrder.auto_extend,
            payment_type: parentOrder.payment_type,
            is_partial_payment: is_partial,
            deposit_percentage: dep_pct,
            deposit_amount: follower_deposit_amount,
            parent_order_id: parentOrder.parent_order_id || parentOrderId,
            ...shippingDetails,
            payment_notification_sent: false,
        };

        const { data: created, error: insertError } = await supabaseAdmin
            .from('orders')
            .insert(newOrder)
            .select()
            .single();
        if (insertError) throw insertError;

        return { success: true, orderId: created.id };
    } catch (error: any) {
        console.error('followOrderAction error:', error);
        return { success: false, error: error.message };
    }
}

export async function createOrderAction(orderData: {
    item_name: string;
    target_price: number;
    reward_fee: number;
    exchange_rate: number;
    currency: string;
    country: string;
    description: string;
    shipping_address?: string | null;
    require_receipt: boolean;
    require_model_number: boolean;
    photo_url?: string | null;
    buyer_platform_fee: number;
    traveler_platform_fee: number;
    expected_shipping_date: string;
    auto_extend: boolean;
    payment_type: 'PRE_ESCROW' | 'MATCH_ESCROW';
    shipping_method?: 'HOME' | '711';
    cvs_store_info?: any;
    recipient_name?: string | null;
    recipient_phone?: string | null;
    shipping_fee: number;
    is_partial_payment: boolean;
    deposit_percentage: number;
    deposit_amount: number;
    payment_notification_sent: boolean;
    ai_search_status?: string | null;
}) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('您尚未登入');

        const supabaseAdmin = getSupabaseAdmin();

        const base_amount_twd = (orderData.target_price * orderData.exchange_rate) + orderData.reward_fee;
        const total_amount_twd = base_amount_twd + (orderData.buyer_platform_fee || 0) + (orderData.shipping_fee || 0);

        const { data, error } = await supabaseAdmin
            .from('orders')
            .insert({
                ...orderData,
                buyer_id: user.id,
                status: 'OPEN',
                total_amount: total_amount_twd,
                total_amount_twd,
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true as const, orderId: data.id };
    } catch (error: any) {
        console.error('createOrderAction error:', error);
        return { success: false as const, error: error.message || '建立訂單失敗' };
    }
}
