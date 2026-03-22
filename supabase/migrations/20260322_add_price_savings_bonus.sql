-- Price Savings Bonus (差價分分樂)
-- When actual_price < target_price in MATCH_ESCROW orders,
-- the savings are split 50/50: buyer pays less, traveler earns a bonus.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS price_savings_twd INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS traveler_price_bonus INTEGER DEFAULT NULL;

COMMENT ON COLUMN orders.price_savings_twd IS '差價分分樂：實際省下的金額（台幣整數）= (target_price - actual_price) × exchange_rate。僅在 actual_price < target_price 時有值。';
COMMENT ON COLUMN orders.traveler_price_bonus IS '差價分分樂：旅人應得的比價獎勵（台幣整數）= price_savings_twd × 50%。管理員放款時需將此金額一併計入旅人收益。';
