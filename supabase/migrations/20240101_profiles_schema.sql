-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  completed_orders_count INTEGER DEFAULT 0,
  total_order_amount NUMERIC DEFAULT 0,
  positive_rating_count INTEGER DEFAULT 0,
  total_rating_count INTEGER DEFAULT 0
);

-- Helper to handle new user creation automatically (optional, but good practice)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC for atomic rating updates
CREATE OR REPLACE FUNCTION rate_user(
  user_id UUID,
  is_positive BOOLEAN
) RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET
    total_rating_count = total_rating_count + 1,
    positive_rating_count = CASE
      WHEN is_positive THEN positive_rating_count + 1
      ELSE positive_rating_count
    END
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- RPC for atomic order stats updates
CREATE OR REPLACE FUNCTION increment_order_stats(
  user_id UUID,
  order_amount NUMERIC
) RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET
    completed_orders_count = completed_orders_count + 1,
    total_order_amount = total_order_amount + order_amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
