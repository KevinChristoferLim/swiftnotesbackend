-- Migration: Add reminder support to notes table
-- Date: 2025-12-18
-- Description: Add reminder date, time, repeat, and location columns to support reminder functionality

-- Add reminder columns to notes table
ALTER TABLE notes
ADD COLUMN reminder_date_millis BIGINT DEFAULT NULL AFTER is_locked,
ADD COLUMN reminder_time_millis BIGINT DEFAULT NULL AFTER reminder_date_millis,
ADD COLUMN reminder_repeat VARCHAR(500) DEFAULT NULL AFTER reminder_time_millis,
ADD COLUMN reminder_location VARCHAR(255) DEFAULT NULL AFTER reminder_repeat;

-- Add index for quick reminder queries (find notes with reminders in the future)
ALTER TABLE notes
ADD INDEX idx_reminder_time (reminder_time_millis);

-- Create a separate reminders_log table to track reminder history (optional, for future auditing)
CREATE TABLE IF NOT EXISTS reminders_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  note_id INT NOT NULL,
  user_id INT NOT NULL,
  reminder_date_millis BIGINT,
  reminder_time_millis BIGINT,
  reminder_repeat VARCHAR(500),
  reminder_location VARCHAR(255),
  status ENUM('pending', 'triggered', 'dismissed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_reminder_time (reminder_time_millis)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add columns to notes table for lock_pin (if using PIN-based locking instead of password)
-- Uncomment if you want to migrate from lock_password to lock_pin
-- ALTER TABLE notes
-- ADD COLUMN lock_pin VARCHAR(255) DEFAULT NULL AFTER lock_password;

-- Verification: Check the notes table structure
-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'notes' AND TABLE_SCHEMA = 'swiftnotes';
