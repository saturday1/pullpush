-- Add role and trial columns to profile table
ALTER TABLE profile
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'free'
    CHECK (role IN ('free', 'standard', 'premium', 'lifetime', 'developer')),
  ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz;

-- Set developer role for known developer UIDs (update UIDs as needed)
-- UPDATE profile SET role = 'developer' WHERE user_id IN ('uid1', 'uid2');
