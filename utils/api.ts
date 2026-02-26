import { supabase } from './supabase/client';
import { Order, OrderStatus } from '@/types';

export const fetchOrders = async (status?: OrderStatus) => {
  let query = supabase
    .from('orders')
    .select('*')
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
    .select('*')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
};

export const fetchMyTasks = async (userId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('traveler_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
};

export const fetchOrderById = async (id: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Order;
};

export const createOrder = async (order: Omit<Order, 'id' | 'status' | 'created_at' | 'total_amount'>) => {
  const { data, error } = await supabase
    .from('orders')
    .insert([
      {
        ...order,
        total_amount: order.target_price + order.reward_fee,
        status: 'OPEN',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as Order;
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

export const assignTraveler = async (id: string, travelerId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .update({
      traveler_id: travelerId,
      status: 'MATCHED'
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

export const uploadFile = async (file: File, bucket: string, path: string) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
};
