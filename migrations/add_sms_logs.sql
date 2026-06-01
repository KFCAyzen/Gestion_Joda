-- ================================================================
-- sms_logs : trace des envois SMS NEXAH + Delivery Reports
-- ================================================================
-- Une ligne par destinataire et par envoi.
-- Colonne message_id alimentée par la réponse de NEXAH (champ messageid),
-- permet de corréler ensuite les Delivery Reports (POST /api/sms/dlr).
--
-- Cycle de vie de status :
--   pending      → envoi initié, pas encore de réponse NEXAH
--   sent         → NEXAH a accepté (responsecode=1, status="success")
--   failed       → NEXAH a refusé, ou exception côté app
--   delivered    → DR reçu avec status=DELIVRD
--   undelivered  → DR reçu avec status=UNDELIV
-- ================================================================

CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  sms_client_id TEXT,
  recipient TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'undelivered')),
  error_code TEXT,
  error_description TEXT,
  submit_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_time TIMESTAMPTZ,
  delivery_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_message_id ON sms_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient  ON sms_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status     ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view sms logs" ON sms_logs;
CREATE POLICY "Admins can view sms logs" ON sms_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "System can insert sms logs" ON sms_logs;
CREATE POLICY "System can insert sms logs" ON sms_logs
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update sms logs" ON sms_logs;
CREATE POLICY "System can update sms logs" ON sms_logs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
