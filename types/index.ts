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
  tracking_number?: string | null;
}
