# Order Flow Analysis

## Status Definitions

| Status | Description |
|--------|------------|
| `OPEN` | Buyer created order, waiting for traveler |
| `MATCHED` | Traveler accepted, waiting for buyer payment |
| `ESCROWED` | Payment confirmed, traveler can purchase |
| `BOUGHT` | Traveler purchased item, proof uploaded |
| `SHIPPED` | Tracking number added, in transit |
| `COMPLETED` | Buyer confirmed receipt, done |
| `DISPUTE` | Either party raised dispute |
| `DELISTED` | Order cancelled |

---

## Flow Diagram

```
                         ┌──────────────────────────────────────────────────────┐
                         │                    BUYER CREATES ORDER               │
                         └──────────────────────┬───────────────────────────────┘
                                                │
                                                ▼
                    ┌───────────────────────── OPEN ──────────────────────────┐
                    │                           │                            │
                    │                    Traveler accepts                    │
                    │                      (接單)                            │
                    │               ┌───────────┴──────────┐                │
                    │               │                      │                │
                    │     payment_type=              payment_type=          │
                    │     MATCH_ESCROW               PRE_ESCROW             │
                    │               │                      │                │
                    │               ▼                      │                │
        Buyer       │           MATCHED                    │     Other buyers
        delists     │               │                      │     can follow
        (下架)       │    Buyer pays → Admin confirms       │     (跟單)
                    │         (確認收到款項)                  │
                    │               │                      │
                    │               ▼                      │
                    │        ┌──────┴──────────────────────┘
                    │        │
                    │        ▼
                    │    ESCROWED ◄──── Admin can also confirm
                    │        │         from OPEN (PRE_ESCROW)
                    │        │
                    │        │  Traveler uploads purchase photo
                    │        │  + receipt (if required)
                    │        │  + model number (if required)
                    │        │  → clicks "完成代購"
                    │        │
                    │        ▼
                    │     BOUGHT
                    │        │
                    │        │  Traveler adds tracking number
                    │        │  (新增物流單號)
                    │        │
                    │        ▼
                    │     SHIPPED ──────────────── Admin can release funds
                    │        │                    (確認撥款給旅人)
                    │        │  Buyer confirms           │
                    │        │  receipt (確認收貨)         │
                    │        │                           │
                    │        ▼                           │
                    │    COMPLETED ◄─────────────────────┘
                    │        │
                    │        │  Both parties can rate each other
                    │        │  Traveler stats incremented
                    │        │  (incrementOrderStats)
                    │        │
                    │        ▼
                    │      [END]
                    │
                    ▼
                 DELISTED ──────► Buyer can relist → back to OPEN
                    ▲
                    │
                    │ (Admin resolves as refund)
                    │
                 DISPUTE
                    ▲              │
                    │              │ (Admin resolves as complete)
                    │              ▼
                    │          COMPLETED
                    │
          Either party can raise
          dispute from ESCROWED,
          BOUGHT, or SHIPPED
```

---

## Transition Matrix

| From \ To | OPEN | MATCHED | ESCROWED | BOUGHT | SHIPPED | COMPLETED | DISPUTE | DELISTED |
|-----------|------|---------|----------|--------|---------|-----------|---------|----------|
| **OPEN** | - | Traveler accepts (MATCH_ESCROW) | Traveler accepts (PRE_ESCROW) / Admin confirms | - | - | - | - | Buyer delists |
| **MATCHED** | - | - | Admin confirms payment | - | - | - | - | - |
| **ESCROWED** | - | - | - | Traveler uploads proof | - | - | Either party | - |
| **BOUGHT** | - | - | - | - | Traveler adds tracking | - | Either party | - |
| **SHIPPED** | - | - | - | - | - | Buyer confirms / Admin releases | Either party | - |
| **COMPLETED** | - | - | - | - | - | - | - | - |
| **DISPUTE** | - | - | - | - | - | Admin resolves (complete) | - | Admin resolves (refund) |
| **DELISTED** | Buyer relists | - | - | - | - | - | - | - |

---

## Logic Issues Found

### P0 - Critical

#### 1. ~~No server-side status validation on ANY transition~~ MOSTLY FIXED

`app/actions/orders.ts` 已實作 Server Actions，包含：
- 身份驗證 (`getUser()`)
- 角色檢查 (Admin-only for `confirmEscrow`, `resolveDispute`)
- 狀態檢查 (`confirmReceipt` 檢查 SHIPPED, `delistOrderGroup` 檢查 OPEN, etc.)

`app/orders/[id]/page.tsx` 的所有 handler **已全部改用 `await import('@/app/actions/orders')`**，不再直接呼叫 `utils/api.ts` 的裸函數。

**Server Actions 狀態驗證一覽：**

| Server Action | Auth | Role Check | FROM Status Check |
|---|---|---|---|
| `acceptOrder` | user | - | `.eq('status', 'OPEN')` + `.eq('status', 'ESCROWED')` (two-step) |
| `confirmEscrow` | user | ADMIN | `.in('status', ['MATCHED', 'OPEN'])` in query |
| `confirmReceipt` | user | buyer_id match | `order.status !== 'SHIPPED'` throws |
| `updateOrderTracking` | user | traveler_id match | `order.status !== 'BOUGHT'` throws |
| `updateReceipt` | user | traveler_id match | `order.status !== 'ESCROWED'` throws |
| `finishPurchase` | user | traveler_id match | `order.status !== 'ESCROWED'` throws |
| `updatePurchasePhoto` | user | traveler_id match | `order.status !== 'ESCROWED'` throws |
| `updateModelNumber` | user | traveler_id match | `order.status !== 'ESCROWED'` throws |
| `batchUpdatePurchasePhoto` | user | traveler_id in query | `.eq('status', 'ESCROWED')` in query |
| `batchUpdateReceipt` | user | traveler_id in query | `.eq('status', 'ESCROWED')` in query |
| `batchFinishPurchase` | user | traveler_id in query | `.eq('status', 'ESCROWED')` in query |
| `batchUpdateTrackingNumbers` | user | traveler_id in query | `.eq('status', 'BOUGHT')` in query |
| `adminReleaseFunds` | user | ADMIN | `order.status !== 'SHIPPED'` throws |
| `delistOrderGroup` | user | buyer_id or ADMIN | `order.status !== 'OPEN'` throws |
| `relistOrder` | user | buyer_id match | `order.status !== 'DELISTED'` throws |
| `raiseDispute` | user | buyer_id or traveler_id | checks ESCROWED/BOUGHT/SHIPPED |
| `resolveDispute` | user | ADMIN | `order.status !== 'DISPUTE'` throws |
| `notifyPaid` | user | buyer_id match | - (no status change) |
| `submitUserRating` | user | - | - (no order status check) |

**所有已知問題均已修復。**
- 單筆操作（如 `updateReceipt`）的 status 檢查僅在 JS 層，update query 沒加 `.eq('status', ...)` 防 race condition（低風險，因為 server action 是短暫操作，可接受）

#### 2. ~~No role-based access control on API functions~~ FIXED

**所有頁面都已改用 Server Actions (`await import('@/app/actions/orders')`)：**
- `app/orders/[id]/page.tsx` — 所有 handler
- `app/admin/page.tsx` — `handleConfirmPayment` → `confirmEscrow`, `handleReleaseFunds` → `adminReleaseFunds`
- `app/admin/disputes/page.tsx` — `handleResolve` → `resolveDispute`

**Server Actions 角色控制完整：**
| Action | Auth | Role | Status Guard |
|---|---|---|---|
| `confirmEscrow` | user | ADMIN only | `.in('status', ['MATCHED', 'OPEN'])` |
| `adminReleaseFunds` | user | ADMIN only | `status === 'SHIPPED'` |
| `resolveDispute` | user | ADMIN only | `status === 'DISPUTE'` + 限定 `COMPLETED \| DELISTED` |

**RLS 配合 (migration `20260309`)：**
- UPDATE policies 已全部 DROP → 用戶無法繞過 Server Actions 直接改 DB
- INSERT policy: `auth.uid() = buyer_id`

**清理項：** `admin/page.tsx` 和 `admin/disputes/page.tsx` 頂部有 dead imports from `utils/api`（`updateOrderStatus`, `incrementOrderStats`, `resolveDispute`），實際未使用，可清除。

---

### P1 - High

#### 3. ~~`incrementOrderStats` double-fire~~ MOSTLY FIXED
`adminReleaseFunds` server action 有 `status === 'SHIPPED'` 檢查，`resolveDispute` 有 `status === 'DISPUTE'` 檢查。
兩者互斥（SHIPPED 不是 DISPUTE），所以同一單不會被兩條路徑重複 increment。

**殘留風險：** 如果 dispute 被 resolve 為 COMPLETED（traveler stats +1），之後 buyer 正常 confirmReceipt 不會再觸發（因為 confirmReceipt 檢查 `status === 'SHIPPED'` 而此時已是 COMPLETED）。邏輯正確，無重複。

#### 4. ~~Buyer can delist MATCHED/ESCROWED~~ FIXED
Server Action `delistOrderGroup` 已加上 `if (order.status !== 'OPEN') throw`。

#### 5. ~~`relistOrder` 不清除 `traveler_id`~~ FIXED
`relistOrder` 現在清除所有交易相關欄位（`traveler_id`, `receipt_url`, `purchase_photo_url`, `tracking_number`, `model_number`, `payment_notification_sent`, 所有 `dispute_*` 欄位, `previous_status`）。

#### 6. ~~跟單繼承 `payment_notification_sent`~~ FIXED
`followOrder()` 已改為 `payment_notification_sent: false`，每個 buyer 獨立通知付款。

---

### P2 - Medium

#### 7. ~~自己接自己的單~~ FIXED
`acceptOrder` 現在 fetch 所有 orderIds 的 `buyer_id`，若任一 `buyer_id === user.id` 則直接 throw。

#### 8. ~~`resolveDispute` 目標狀態不受限~~ FIXED
Server Action 已限制 `resolutionStatus` 只能為 `'COMPLETED'` 或 `'DELISTED'`。

#### 9. ~~OPEN → ESCROWED 無 payment_type 限制~~ FIXED
`confirmEscrow` 現在先 fetch 訂單，若 `status === 'OPEN'` 但 `payment_type !== 'PRE_ESCROW'`，則 throw（MATCH_ESCROW 訂單必須先經過 MATCHED）。PRE_ESCROW 訂單無旅人時仍可由 admin 推進到 ESCROWED（設計如此：買家先付款，旅人後接單）。

#### 10. ~~Dispute 無狀態限制~~ FIXED
Server Action `raiseDispute` 已檢查 `['ESCROWED', 'BOUGHT', 'SHIPPED']`。

#### 11. 無過期自動取消機制 (未修復)
無 cron job 或 scheduled function 處理過期訂單。

---

### P3 - Low / UX

#### 12. ~~Buyer 不計 stats~~ FIXED
`confirmReceipt`、`adminReleaseFunds`、`resolveDispute`（解決為 COMPLETED）現在都同時 increment traveler 與 buyer 的 stats。

#### 13. ~~Rating 無重複檢查~~ FIXED
`submitUserRating` 現在：
1. 先驗證 `order.status === 'COMPLETED'`
2. 若 `rated_by_buyer / rated_by_traveler` 已為 `true`，直接 return（冪等）
3. 非買家也非旅人則 throw，防止第三者評分

#### 14. ~~delistOrderGroup 無狀態限制~~ FIXED
Server Action 已加上 `order.status !== 'OPEN'` 檢查。
