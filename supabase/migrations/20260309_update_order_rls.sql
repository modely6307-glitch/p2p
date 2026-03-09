-- Drop unsafe UPDATE and INSERT policies for orders table
DROP POLICY IF EXISTS "Enable update for all" ON "public"."orders";
DROP POLICY IF EXISTS "Users can update their own orders." ON "public"."orders";
DROP POLICY IF EXISTS "Travelers can match orders." ON "public"."orders";

-- Ensure SELECT and specific INSERT policies remain
-- (Assuming "Enable read access for all" or "Orders are viewable by the buyer and traveler" exists)
-- (Assuming "Enable insert for all" or "Users can create orders" exists, we will define a stricter one below if needed)

-- Update the insert policy to strictly enforce that the buyer_id matches the authenticated user creating it
DROP POLICY IF EXISTS "Enable insert for all" ON "public"."orders";
DROP POLICY IF EXISTS "Users can create orders." ON "public"."orders";

CREATE POLICY "Users can create their own orders" 
ON "public"."orders" 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

-- Note: We do NOT create any UPDATE policies. 
-- All updates MUST go through Server Actions (using Service Role Key) which bypass RLS.
