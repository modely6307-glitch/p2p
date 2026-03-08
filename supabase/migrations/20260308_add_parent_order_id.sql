ALTER TABLE orders
ADD COLUMN parent_order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_parent_order_id ON orders(parent_order_id);
