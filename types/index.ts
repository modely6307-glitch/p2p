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
  status: OrderStatus;
  receipt_url?: string | null;
  photo_url?: string | null;
  description: string;
  tracking_number?: string | null;
}

export interface Profile {
  id: string;
  display_name?: string | null;
  completed_orders_count: number;
  total_order_amount: number;
  positive_rating_count: number;
  total_rating_count: number;
}
