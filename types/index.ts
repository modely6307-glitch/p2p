export type OrderStatus =
  | 'OPEN'
  | 'MATCHED'
  | 'ESCROWED'
  | 'BOUGHT'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'DISPUTE';

export interface Order {
  id: string;
  created_at?: string;
  buyer_id: string;
  traveler_id?: string | null;
  item_name: string;
  target_price: number;
  reward_fee: number;
  total_amount: number;
  total_amount_twd: number;
  exchange_rate: number;
  currency: string;
  country: string;
  status: OrderStatus;
  receipt_url?: string | null;
  photo_url?: string | null;
  description: string;
  tracking_number?: string | null;
  buyer?: Profile;
  traveler?: Profile;
}

export interface Profile {
  id: string;
  display_name?: string | null;
  email?: string | null;
  level: 'STANDARD' | 'VERIFIED' | 'ADMIN';
  is_verified: boolean;
  completed_orders_count: number;
  total_order_amount: number;
  positive_rating_count: number;
  total_rating_count: number;
}
