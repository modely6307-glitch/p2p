-- Function to validate order before insert or update
CREATE OR REPLACE FUNCTION validate_order_date()
RETURNS TRIGGER AS $$
DECLARE
    user_level TEXT;
BEGIN
    -- 1. Check if the date is in the past
    IF NEW.expected_shipping_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Return date cannot be in the past.';
    END IF;

    -- 2. Check 3-day restriction for STANDARD users
    SELECT level INTO user_level FROM public.profiles WHERE id = NEW.buyer_id;
    
    IF user_level = 'STANDARD' AND NEW.expected_shipping_date < (CURRENT_DATE + INTERVAL '3 days') THEN
        RAISE EXCEPTION 'Return dates within 3 days are restricted to verified users.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce validation on insert and update
DROP TRIGGER IF EXISTS trg_validate_order_date ON public.orders;
CREATE TRIGGER trg_validate_order_date
BEFORE INSERT OR UPDATE OF expected_shipping_date ON public.orders
FOR EACH ROW
EXECUTE FUNCTION validate_order_date();
