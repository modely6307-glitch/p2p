-- Add payment_notification_sent to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_notification_sent BOOLEAN DEFAULT FALSE;
