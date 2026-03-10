export type OrderStatus =
  | 'OPEN'
  | 'MATCHED'
  | 'ESCROWED'
  | 'BOUGHT'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'DISPUTE'
  | 'DELISTED';

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
  shipping_address?: string | null;
  tracking_number?: string | null;
  require_receipt: boolean;
  require_model_number: boolean;
  purchase_photo_url?: string | null;
  model_number?: string | null;
  buyer_platform_fee: number;
  traveler_platform_fee: number;
  expected_shipping_date: string;
  auto_extend: boolean;
  payment_notification_sent?: boolean;
  payment_type: 'PRE_ESCROW' | 'MATCH_ESCROW';
  shipping_method?: 'HOME' | '711';
  parent_order_id?: string | null;
  cvs_store_info?: {
    store_id: string;
    store_name: string;
    store_address: string;
    store_phone?: string;
  } | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  is_partial_payment?: boolean;
  deposit_amount?: number | null;
  deposit_percentage?: number | null;
  shipping_fee: number;
  buyer?: Profile;
  traveler?: Profile;
  dispute_reason?: string | null;
  dispute_by_user_id?: string | null;
  dispute_evidence_url?: string | null;
  dispute_resolution?: string | null;
  dispute_created_at?: string | null;
  dispute_resolved_at?: string | null;
  rated_by_buyer?: boolean;
  rated_by_traveler?: boolean;
  previous_status?: OrderStatus | null;
  buyer_last_read_at?: string;
  traveler_last_read_at?: string;
  admin_last_read_at?: string;
}

export interface SystemSettings {
  id: string;
  buyer_fee_threshold: number;
  buyer_fee_fixed_amount: number;
  buyer_fee_percentage: number;
  traveler_fee_threshold: number;
  traveler_fee_fixed_amount: number;
  traveler_fee_percentage: number;
  deposit_threshold_days: number;
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
  address?: string | null;
  phone?: string | null;
  favorite_stores?: Array<{
    store_id: string;
    store_name: string;
    store_address: string;
  }>;
}

export interface OrderMessage {
  id: string;
  order_id: string;
  user_id: string;
  content?: string | null;
  image_url?: string | null;
  created_at: string;
  user?: Profile; // Populated via join if needed
}
