-- Price Negotiation System
-- Adds support for price flexibility: buyers set a max acceptable price,
-- travelers report the actual price found at the store, and the system
-- routes to PRICE_CONFIRM state when the actual price exceeds the buyer's tolerance.

-- 1. Add new status to the order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PRICE_CONFIRM';

-- 2. Add price negotiation columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS max_price DECIMAL(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_price DECIMAL(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_price_note TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_confirmed_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Comments for documentation
COMMENT ON COLUMN orders.max_price IS '許願方設定的最高可接受價格（外幣，與 target_price 同幣別）。NULL 表示不接受超出 target_price 的漲價。';
COMMENT ON COLUMN orders.actual_price IS '代購方在現場回報的實際購買價格（外幣）。NULL 表示尚未回報。';
COMMENT ON COLUMN orders.actual_price_note IS '代購方回報實際價格時附加的說明（如：現場售完換別款、遇限時折扣等）。';
COMMENT ON COLUMN orders.price_confirmed_at IS '許願方確認實際價格的時間戳記。';
