import { supabase } from './supabase/client';
import { Order, OrderStatus, Profile, SystemSettings } from '@/types';

export const fetchOrders = async (status?: OrderStatus) => {
  let query = supabase
    .from('orders')
    .select('*, buyer:profiles!buyer_id(*), traveler:profiles!traveler_id(*)')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Order[];
};

export const fetchMyWishes = async (userId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, buyer:profiles!buyer_id(*), traveler:profiles!traveler_id(*)')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
};

export const fetchMyTasks = async (userId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, buyer:profiles!buyer_id(*), traveler:profiles!traveler_id(*)')
    .eq('traveler_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
};

export const fetchOrderById = async (id: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, buyer:profiles!buyer_id(*), traveler:profiles!traveler_id(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Order;
};

export const createOrder = async (order: Omit<Order, 'id' | 'status' | 'created_at' | 'total_amount' | 'total_amount_twd'>) => {
  const base_amount_twd = (order.target_price * order.exchange_rate) + order.reward_fee;
  const total_amount_twd = base_amount_twd + (order.buyer_platform_fee || 0);
  const total_amount = total_amount_twd;

  const { data, error } = await supabase
    .from('orders')
    .insert([
      {
        ...order,
        total_amount,
        total_amount_twd,
        status: 'OPEN',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as Order;
};

// --- Admin & Settings APIs ---

export const fetchSystemSettings = async () => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 'global')
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  // Default fallback if no settings record yet
  if (!data) {
    return {
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
  return data as SystemSettings;
};

export const updateSystemSettings = async (settings: Partial<SystemSettings>) => {
  const { data, error } = await supabase
    .from('settings')
    .upsert({ id: 'global', ...settings })
    .select()
    .single();
  if (error) throw error;
  return data as SystemSettings;
};

export const fetchAllOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
};

export const fetchAllProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Profile[];
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
};

export const updateOrderStatus = async (id: string, status: OrderStatus) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Order;
};

export const assignTraveler = async (id: string, travelerId: string, status: OrderStatus = 'MATCHED') => {
  const { data, error } = await supabase
    .from('orders')
    .update({
      traveler_id: travelerId,
      status: status
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Order;
};

export const updateOrderDetails = async (id: string, updates: Partial<Order>) => {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Order;
}

export const raiseDispute = async (
  orderId: string,
  userId: string,
  reason: string,
  evidenceUrl?: string | null
) => {
  const updates: Partial<Order> = {
    status: 'DISPUTE',
    dispute_reason: reason,
    dispute_by_user_id: userId,
    dispute_evidence_url: evidenceUrl,
    dispute_created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data as Order;
};

export const resolveDispute = async (
  orderId: string,
  resolutionStatus: OrderStatus,
  resolutionNotes: string
) => {
  const updates: Partial<Order> = {
    status: resolutionStatus,
    dispute_resolution: resolutionNotes,
    dispute_resolved_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data as Order;
};

export const uploadFile = async (file: File, bucket: string, path: string) => {
  // Sanitize path: replace problematic characters but keep /
  const sanitizedPath = path.split('/').map(part =>
    part.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  ).join('/');

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(sanitizedPath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(sanitizedPath);
  return publicUrl;
};

// --- Profile & Ratings ---

export const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as Profile;
};

export const rateUser = async (userId: string, isPositive: boolean) => {
  const { error } = await supabase.rpc('rate_user', {
    user_id: userId,
    is_positive: isPositive
  });

  if (error) throw error;
};

export const incrementOrderStats = async (userId: string, amount: number) => {
  const { error } = await supabase.rpc('increment_order_stats', {
    user_id: userId,
    order_amount: amount
  });

  if (error) throw error;
};

// --- Order Chat APIs ---

export const fetchOrderMessages = async (orderId: string) => {
  const { data, error } = await supabase
    .from('order_messages')
    .select(`*, user:profiles(id, display_name, email)`)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

export const sendOrderMessage = async (orderId: string, userId: string, content: string | null, imageUrl: string | null = null) => {
  const { data, error } = await supabase
    .from('order_messages')
    .insert({
      order_id: orderId,
      user_id: userId,
      content,
      image_url: imageUrl
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
