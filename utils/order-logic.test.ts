import { describe, it, expect } from 'vitest';
import { 
    canConfirmReceipt, 
    canDelistOrder, 
    canRaiseDispute, 
    canCancelDispute, 
    canResolveDispute, 
    canAcceptOrder, 
    canConfirmEscrow,
    Order
} from './order-logic';

describe('Order Logic Unit Tests', () => {
    const mockOrder: Order = {
        id: '123',
        buyer_id: 'buyer-001',
        traveler_id: 'traveler-001',
        status: 'SHIPPED',
        previous_status: 'BOUGHT',
        dispute_by_user_id: null,
        payment_type: 'MATCH_ESCROW'
    };

    describe('canConfirmReceipt', () => {
        it('allows the buyer to confirm receipt when status is SHIPPED', () => {
            const result = canConfirmReceipt(mockOrder, 'buyer-001');
            expect(result.can).toBe(true);
        });

        it('denies the buyer to confirm receipt when status is BOUGHT', () => {
            const result = canConfirmReceipt({ ...mockOrder, status: 'BOUGHT' }, 'buyer-001');
            expect(result.can).toBe(false);
            expect(result.reason).toBe("訂單必須在『已出貨』狀態才能確認收貨");
        });

        it('denies non-buyers to confirm receipt', () => {
            const result = canConfirmReceipt(mockOrder, 'traveler-001');
            expect(result.can).toBe(false);
            expect(result.reason).toBe("您不是這筆訂單的買家，無權收貨");
        });
    });

    describe('canDelistOrder', () => {
        const openOrder: Order = { ...mockOrder, status: 'OPEN', traveler_id: null };

        it('allows the buyer to delist an OPEN order', () => {
            const result = canDelistOrder(openOrder, 'buyer-001', 'USER');
            expect(result.can).toBe(true);
        });

        it('allows an admin to delist an OPEN order regardless of owner', () => {
            const result = canDelistOrder(openOrder, 'admin-id', 'ADMIN');
            expect(result.can).toBe(true);
        });

        it('denies delisting if order is MATCHED', () => {
            const result = canDelistOrder({ ...openOrder, status: 'MATCHED' }, 'buyer-001', 'USER');
            expect(result.can).toBe(false);
            expect(result.reason).toBe("只能取消處於『徵求中 (OPEN)』狀態的訂單");
        });

        it('denies non-owners who are not admins', () => {
            const result = canDelistOrder(openOrder, 'someone-else', 'USER');
            expect(result.can).toBe(false);
            expect(result.reason).toBe("您無權取消此訂單");
        });
    });

    describe('canRaiseDispute', () => {
        it('allows the buyer to raise a dispute for ESCROWED orders', () => {
            const result = canRaiseDispute({ ...mockOrder, status: 'ESCROWED' }, 'buyer-001');
            expect(result.can).toBe(true);
        });

        it('allows the traveler to raise a dispute for BOUGHT orders', () => {
            const result = canRaiseDispute({ ...mockOrder, status: 'BOUGHT' }, 'traveler-001');
            expect(result.can).toBe(true);
        });

        it('denies disputes for OPEN orders', () => {
            const result = canRaiseDispute({ ...mockOrder, status: 'OPEN' }, 'buyer-001');
            expect(result.can).toBe(false);
            expect(result.reason).toContain("無法在 OPEN 狀態下提出爭議");
        });

        it('denies non-involved users', () => {
            const result = canRaiseDispute({ ...mockOrder, status: 'ESCROWED' }, 'intruder-id');
            expect(result.can).toBe(false);
            expect(result.reason).toBe("只有買家或旅人可以提出爭議");
        });
    });

    describe('canCancelDispute', () => {
        const disputeOrder: Order = { ...mockOrder, status: 'DISPUTE', previous_status: 'SHIPPED', dispute_by_user_id: 'buyer-001' };

        it('allows the dispute initiator to cancel it', () => {
            const result = canCancelDispute(disputeOrder, 'buyer-001');
            expect(result.can).toBe(true);
        });

        it('denies if order status is not DISPUTE', () => {
            const result = canCancelDispute({ ...disputeOrder, status: 'COMPLETED' }, 'buyer-001');
            expect(result.can).toBe(false);
            expect(result.reason).toBe("此訂單不在爭議中");
        });

        it('denies if user is not the dispute initiator', () => {
            const result = canCancelDispute(disputeOrder, 'traveler-001');
            expect(result.can).toBe(false);
            expect(result.reason).toBe("只有申訴人可以取消申訴");
        });
    });

    describe('canResolveDispute', () => {
        const disputeOrder: Order = { ...mockOrder, status: 'DISPUTE' };

        it('allows admins to resolve a dispute to COMPLETED', () => {
            const result = canResolveDispute(disputeOrder, 'ADMIN', 'COMPLETED');
            expect(result.can).toBe(true);
        });

        it('denies non-admins to resolve a dispute', () => {
            const result = canResolveDispute(disputeOrder, 'USER', 'COMPLETED');
            expect(result.can).toBe(false);
            expect(result.reason).toBe("只有管理員可以裁決爭議");
        });

        it('denies resolution to invalid statuses', () => {
            // OPEN is generally not a resolution for a dispute
            const result = canResolveDispute(disputeOrder, 'ADMIN', 'OPEN');
            expect(result.can).toBe(false);
            expect(result.reason).toContain("不合法的裁決狀態");
        });
    });

    describe('canAcceptOrder', () => {
        const openOrder: Order = { ...mockOrder, status: 'OPEN', traveler_id: null };

        it('allows a traveler to accept an OPEN order', () => {
            const result = canAcceptOrder(openOrder, 'new-traveler');
            expect(result.can).toBe(true);
        });

        it('denies if traveler is the buyer', () => {
            const result = canAcceptOrder(openOrder, 'buyer-001');
            expect(result.can).toBe(false);
            expect(result.reason).toBe("不能接自己的訂單");
        });

        it('denies if order is already matched', () => {
            const result = canAcceptOrder({ ...openOrder, traveler_id: 'other-traveler' }, 'new-traveler');
            expect(result.can).toBe(false);
            expect(result.reason).toBe("此訂單已被其他旅人接取");
        });
    });

    describe('canConfirmEscrow', () => {
        it('allows admin to confirm escrow for MATCHED orders', () => {
            const result = canConfirmEscrow({ ...mockOrder, status: 'MATCHED' }, 'ADMIN');
            expect(result.can).toBe(true);
        });

        it('allows admin to confirm escrow for OPEN PRE_ESCROW orders', () => {
            const result = canConfirmEscrow({ ...mockOrder, status: 'OPEN', payment_type: 'PRE_ESCROW' }, 'ADMIN');
            expect(result.can).toBe(true);
        });

        it('denies admin to confirm escrow for OPEN MATCH_ESCROW orders', () => {
            const result = canConfirmEscrow({ ...mockOrder, status: 'OPEN', payment_type: 'MATCH_ESCROW' }, 'ADMIN');
            expect(result.can).toBe(false);
            expect(result.reason).toContain("此訂單須先由旅人接單");
        });

        it('denies non-admins', () => {
            const result = canConfirmEscrow({ ...mockOrder, status: 'MATCHED' }, 'USER');
            expect(result.can).toBe(false);
            expect(result.reason).toBe("只有管理員可以確認託管款項");
        });
    });
});
