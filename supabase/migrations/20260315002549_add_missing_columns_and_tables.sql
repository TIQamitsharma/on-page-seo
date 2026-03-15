/*
  # Add Missing Columns and Tables

  ## Changes
  1. Add user_id column to page_results table
  2. Add is_active column to user_api_keys table
  3. Create ai_recommendations table
  4. Add cancelled status to audits check constraint
  
  ## Notes
  - Safe to run multiple times with IF NOT EXISTS checks
*/

-- Add user_id to page_results if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_results' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE page_results ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX idx_page_results_user_id ON page_results(user_id);
  END IF;
END $$;

-- Add is_active to user_api_keys if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_api_keys' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_api_keys ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Create ai_recommendations table
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_result_id uuid NOT NULL REFERENCES page_results(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommendations jsonb NOT NULL,
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own AI recommendations" ON ai_recommendations;
CREATE POLICY "Users can view own AI recommendations"
  ON ai_recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own AI recommendations" ON ai_recommendations;
CREATE POLICY "Users can create own AI recommendations"
  ON ai_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own AI recommendations" ON ai_recommendations;
CREATE POLICY "Users can delete own AI recommendations"
  ON ai_recommendations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_page_result ON ai_recommendations(page_result_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id);

-- Update audits status check to include 'cancelled'
DO $$
BEGIN
  ALTER TABLE audits DROP CONSTRAINT IF EXISTS audits_status_check;
  ALTER TABLE audits ADD CONSTRAINT audits_status_check 
    CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;