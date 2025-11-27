-- =============================================
-- COMPLETE MIGRATION SCRIPT
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- STEP 1: CREATE ENUMS
-- =============================================
DO $$ BEGIN
  CREATE TYPE pricing_type AS ENUM ('one_time', 'recurring');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pricing_plan_interval AS ENUM ('day', 'week', 'month', 'year');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- STEP 2: CREATE USERS TABLE (Stripe Integration)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name text,
  avatar_url text,
  billing_address jsonb,
  updated_at timestamp with time zone,
  payment_method jsonb,
  email text
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view own user data." ON users;
CREATE POLICY "Everyone can view own user data." ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Can update own user data." ON users;
CREATE POLICY "Can update own user data." ON users
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Trigger to automatically create user entry on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SET search_path = ''
AS $$
  BEGIN
    INSERT INTO public.users (id, full_name, avatar_url, email)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
    RETURN new;
  END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_user();

-- =============================================
-- STEP 3: CREATE STRIPE TABLES
-- =============================================

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  stripe_customer_id text
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  active boolean,
  name text,
  description text,
  image text,
  metadata jsonb
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-only access." ON products;
CREATE POLICY "Allow public read-only access." ON products
  FOR SELECT USING (true);

-- Prices Table
CREATE TABLE IF NOT EXISTS prices (
  id text PRIMARY KEY,
  product_id text REFERENCES products,
  active boolean,
  description text,
  unit_amount bigint,
  currency text CHECK (char_length(currency) = 3),
  type pricing_type,
  interval pricing_plan_interval,
  interval_count integer,
  trial_period_days integer,
  metadata jsonb
);
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-only access." ON prices;
CREATE POLICY "Allow public read-only access." ON prices
  FOR SELECT USING (true);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  status subscription_status,
  metadata jsonb,
  price_id text REFERENCES prices,
  quantity integer,
  cancel_at_period_end boolean,
  created timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  current_period_start timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  current_period_end timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  cancel_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  canceled_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  trial_start timestamp with time zone DEFAULT timezone('utc'::text, now()),
  trial_end timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Can only view own subs data." ON subscriptions;
CREATE POLICY "Can only view own subs data." ON subscriptions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- =============================================
-- STEP 4: CREATE APPLICATION TABLES
-- =============================================

-- Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  workspace_owner uuid NOT NULL,
  title text NOT NULL,
  icon_id text NOT NULL,
  data text,
  in_trash text,
  logo text,
  banner_url text
);

-- Folders Table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  title text NOT NULL,
  icon_id text NOT NULL,
  data text,
  in_trash text,
  banner_url text,
  workspace_id uuid NOT NULL
);

-- Files Table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  title text NOT NULL,
  icon_id text NOT NULL,
  data text,
  in_trash text,
  banner_url text,
  workspace_id uuid NOT NULL,
  folder_id uuid NOT NULL
);

-- Collaborators Table
CREATE TABLE IF NOT EXISTS collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  workspace_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id uuid NOT NULL
);

-- =============================================
-- STEP 5: ADD FOREIGN KEY CONSTRAINTS
-- =============================================

-- Files foreign keys
DO $$ BEGIN
 ALTER TABLE files ADD CONSTRAINT files_workspace_id_workspaces_id_fk
   FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE files ADD CONSTRAINT files_folder_id_folders_id_fk
   FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Folders foreign keys
DO $$ BEGIN
 ALTER TABLE folders ADD CONSTRAINT folders_workspace_id_workspaces_id_fk
   FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Collaborators foreign keys
DO $$ BEGIN
 ALTER TABLE collaborators ADD CONSTRAINT collaborators_workspace_id_workspaces_id_fk
   FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE collaborators ADD CONSTRAINT collaborators_user_id_users_id_fk
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- STEP 6: ENABLE REALTIME
-- =============================================
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime
  FOR TABLE products, prices;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
