import { OrderStatus } from '@/types';

export interface UserProfile {
  id: string;
  level: 'USER' | 'ADMIN';
}

export interface Order {
  id: string;
  buyer_id: string;
  traveler_id: string | null;
  status: OrderStatus;
  previous_status: OrderStatus | null;
  dispute_by_user_id: string | null;
  payment_type: 'PRE_ESCROW' | 'MATCH_ESCROW';
  max_price?: number | null;
  actual_price?: number | null;
}

/**
 * Validates if a user can confirm receipt of an order.
 */
export function canConfirmReceipt(order: Order, userId: string): { can: boolean; reason?: string } {
  if (order.buyer_id !== userId) return { can: false, reason: "您不是這筆訂單的買家，無權收貨" };
  if (order.status !== 'SHIPPED') return { can: false, reason: "訂單必須在『已出貨』狀態才能確認收貨" };
  return { can: true };
}

/**
 * Validates if a user can delist an order.
 */
export function canDelistOrder(order: Order, userId: string, userLevel: 'USER' | 'ADMIN'): { can: boolean; reason?: string } {
  const isAdmin = userLevel === 'ADMIN';
  if (order.buyer_id !== userId && !isAdmin) return { can: false, reason: "您無權取消此訂單" };
  if (order.status !== 'OPEN') return { can: false, reason: "只能取消處於『徵求中 (OPEN)』狀態的訂單" };
  return { can: true };
}

/**
 * Validates if a user can raise a dispute.
 */
export function canRaiseDispute(order: Order, userId: string): { can: boolean; reason?: string } {
  if (order.buyer_id !== userId && order.traveler_id !== userId) {
    return { can: false, reason: "只有買家或旅人可以提出爭議" };
  }
  const validStatuses: OrderStatus[] = ['ESCROWED', 'BOUGHT', 'SHIPPED'];
  if (!validStatuses.includes(order.status)) {
    return { can: false, reason: `無法在 ${order.status} 狀態下提出爭議` };
  }
  return { can: true };
}

/**
 * Validates if a user can cancel a dispute.
 */
export function canCancelDispute(order: Order, userId: string): { can: boolean; reason?: string } {
  if (order.status !== 'DISPUTE') return { can: false, reason: "此訂單不在爭議中" };
  if (order.dispute_by_user_id !== userId) return { can: false, reason: "只有申訴人可以取消申訴" };
  if (!order.previous_status) return { can: false, reason: "無法取消申訴（缺少先前的狀態記錄）" };
  return { can: true };
}

/**
 * Validates if a user can resolve a dispute (Admin only).
 */
export function canResolveDispute(order: Order, userLevel: 'USER' | 'ADMIN', resolutionStatus: OrderStatus): { can: boolean; reason?: string } {
  if (userLevel !== 'ADMIN') return { can: false, reason: "只有管理員可以裁決爭議" };
  if (order.status !== 'DISPUTE') return { can: false, reason: "此訂單不在爭議中" };
  
  const validResolutions: OrderStatus[] = ['COMPLETED', 'DELISTED', 'MATCHED', 'ESCROWED', 'BOUGHT', 'SHIPPED'];
  if (!validResolutions.includes(resolutionStatus)) {
    return { can: false, reason: `不合法的裁決狀態: ${resolutionStatus}` };
  }
  return { can: true };
}

/**
 * Validates if a traveler can accept an order.
 */
export function canAcceptOrder(order: Order, userId: string): { can: boolean; reason?: string } {
  if (order.buyer_id === userId) return { can: false, reason: "不能接自己的訂單" };
  if (order.status !== 'OPEN' && order.status !== 'ESCROWED') return { can: false, reason: "訂單狀態不允許接單" };
  if (order.traveler_id !== null) return { can: false, reason: "此訂單已被其他旅人接取" };
  return { can: true };
}

/**
 * Validates if an admin can confirm escrow.
 */
export function canConfirmEscrow(order: Order, userLevel: 'USER' | 'ADMIN'): { can: boolean; reason?: string } {
  if (userLevel !== 'ADMIN') return { can: false, reason: "只有管理員可以確認託管款項" };

  // OPEN → ESCROWED is only valid for PRE_ESCROW orders
  if (order.status === 'OPEN' && order.payment_type !== 'PRE_ESCROW') {
    return { can: false, reason: "此訂單須先由旅人接單（進入 MATCHED 狀態）才能確認款項" };
  }

  if (!['MATCHED', 'OPEN', 'PRICE_CONFIRM'].includes(order.status)) {
    return { can: false, reason: "訂單狀態不符合確認託管條件" };
  }

  return { can: true };
}

/**
 * Validates if a traveler can report the actual price (in MATCHED state).
 */
export function canReportActualPrice(order: Order, userId: string): { can: boolean; reason?: string } {
  if (order.traveler_id !== userId) return { can: false, reason: "只有接單旅人可以回報實際價格" };
  if (order.status !== 'MATCHED') return { can: false, reason: "只能在『已媒合』狀態下回報價格" };
  return { can: true };
}

/**
 * Validates if a buyer can confirm or reject the actual price (in PRICE_CONFIRM state).
 */
export function canRespondToPriceConfirm(order: Order, userId: string): { can: boolean; reason?: string } {
  if (order.buyer_id !== userId) return { can: false, reason: "只有許願方可以決定是否接受新價格" };
  if (order.status !== 'PRICE_CONFIRM') return { can: false, reason: "訂單不在價格確認狀態" };
  return { can: true };
}

/**
 * Given a reported actual_price, determine if it needs buyer's explicit confirmation.
 * Returns true if auto-approve (proceed directly to ESCROWED),
 * false if needs explicit buyer approval (enter PRICE_CONFIRM).
 */
export function shouldAutoApprovePriceReport(
  actualPrice: number,
  targetPrice: number,
  maxPrice: number | null | undefined
): boolean {
  // Actual <= target: always auto-approve (buyer gets a discount or exact price)
  if (actualPrice <= targetPrice) return true;
  // Actual > target but within max_price tolerance: auto-approve
  if (maxPrice != null && actualPrice <= maxPrice) return true;
  // Actual exceeds tolerance: require explicit buyer approval
  return false;
}
