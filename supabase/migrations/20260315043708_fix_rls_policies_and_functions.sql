/*
  # Fix RLS Policies and Functions for Performance and Security

  1. Changes
    - Replace auth.uid() with (select auth.uid()) in all RLS policies for better performance
    - Fix function search_path to be immutable (security best practice)
    - Drop and recreate all affected policies

  2. Tables affected
    - users
    - user_api_keys
    - audits
    - page_results
    - ai_recommendations (if exists)

  3. Functions fixed
    - handle_new_user
    - update_updated_at_column
*/

-- ============================================================
-- FIX: users table policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================
-- FIX: user_api_keys table policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can insert own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON user_api_keys;

CREATE POLICY "Users can view own API keys"
  ON user_api_keys FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own API keys"
  ON user_api_keys FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own API keys"
  ON user_api_keys FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own API keys"
  ON user_api_keys FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- FIX: audits table policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own audits" ON audits;
DROP POLICY IF EXISTS "Users can create own audits" ON audits;
DROP POLICY IF EXISTS "Users can update own audits" ON audits;
DROP POLICY IF EXISTS "Users can delete own audits" ON audits;

CREATE POLICY "Users can view own audits"
  ON audits FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own audits"
  ON audits FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own audits"
  ON audits FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own audits"
  ON audits FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- FIX: page_results table policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own page results" ON page_results;
DROP POLICY IF EXISTS "Users can insert own page results" ON page_results;
DROP POLICY IF EXISTS "Users can update own page results" ON page_results;
DROP POLICY IF EXISTS "Users can delete own page results" ON page_results;

CREATE POLICY "Users can view own page results"
  ON page_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM audits
      WHERE audits.id = page_results.audit_id
      AND audits.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own page results"
  ON page_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audits
      WHERE audits.id = page_results.audit_id
      AND audits.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own page results"
  ON page_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM audits
      WHERE audits.id = page_results.audit_id
      AND audits.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audits
      WHERE audits.id = page_results.audit_id
      AND audits.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own page results"
  ON page_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM audits
      WHERE audits.id = page_results.audit_id
      AND audits.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- FIX: ai_recommendations table policies (if table exists)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_recommendations' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own AI recommendations" ON ai_recommendations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create own AI recommendations" ON ai_recommendations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own AI recommendations" ON ai_recommendations';

    EXECUTE 'CREATE POLICY "Users can view own AI recommendations"
      ON ai_recommendations FOR SELECT
      TO authenticated
      USING ((select auth.uid()) = user_id)';

    EXECUTE 'CREATE POLICY "Users can create own AI recommendations"
      ON ai_recommendations FOR INSERT
      TO authenticated
      WITH CHECK ((select auth.uid()) = user_id)';

    EXECUTE 'CREATE POLICY "Users can delete own AI recommendations"
      ON ai_recommendations FOR DELETE
      TO authenticated
      USING ((select auth.uid()) = user_id)';
  END IF;
END $$;

-- ============================================================
-- FIX: handle_new_user function - set immutable search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

-- ============================================================
-- FIX: update_updated_at_column function - set immutable search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
