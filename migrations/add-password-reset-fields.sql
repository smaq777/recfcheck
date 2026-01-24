-- Add password reset fields to users table
-- This migration adds support for secure password reset functionality

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_code VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours');
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Create index for password reset queries
CREATE INDEX IF NOT EXISTS idx_users_reset_code ON users(password_reset_code) WHERE password_reset_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.password_hash IS 'bcrypt hashed password';
COMMENT ON COLUMN users.password_reset_code IS 'One-time code for password reset (expires in 24 hours)';
COMMENT ON COLUMN users.verification_token IS 'Email verification code (expires in 24 hours)';
