-- Performance indexes for frequently filtered/sorted columns
-- Run this once against the production database.

-- payments: filtered by student_id, status, type; sorted by created_at
CREATE INDEX IF NOT EXISTS idx_payments_student_id   ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status       ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at   ON payments(created_at DESC);

-- notifications: filtered by user_id + read; sorted by created_at
CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread    ON notifications(user_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- messages: filtered by to_user_id / from_user_id + lu; sorted by created_at
CREATE INDEX IF NOT EXISTS idx_messages_to_user_id   ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_user_id ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread        ON messages(to_user_id) WHERE lu = false;
CREATE INDEX IF NOT EXISTS idx_messages_created_at    ON messages(created_at DESC);

-- students: sorted by created_at; filtered by created_by (portal lookup)
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_created_by ON students(created_by);

-- dossier_bourses: filtered by student_id, status; sorted by created_at
CREATE INDEX IF NOT EXISTS idx_dossier_bourses_student_id ON dossier_bourses(student_id);
CREATE INDEX IF NOT EXISTS idx_dossier_bourses_status     ON dossier_bourses(status);
CREATE INDEX IF NOT EXISTS idx_dossier_bourses_created_at ON dossier_bourses(created_at DESC);
