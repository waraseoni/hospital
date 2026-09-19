-- Migration 00008: WhatsApp Logs & Message Tracking

CREATE TYPE whatsapp_message_type AS ENUM (
  'appointment_confirmation',
  'appointment_reminder',
  'prescription',
  'lab_report',
  'billing',
  'custom'
);

CREATE TYPE whatsapp_status AS ENUM ('pending', 'sent', 'delivered', 'failed');

CREATE TABLE whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_type whatsapp_message_type NOT NULL,
  message_body TEXT NOT NULL,
  pdf_link TEXT,
  status whatsapp_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  external_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_logs_phone ON whatsapp_logs(recipient_phone);
CREATE INDEX idx_whatsapp_logs_status ON whatsapp_logs(status);
CREATE INDEX idx_whatsapp_logs_type ON whatsapp_logs(message_type);

ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access on whatsapp_logs"
  ON whatsapp_logs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lab staff can view/send logs
CREATE POLICY "Lab staff can manage whatsapp logs"
  ON whatsapp_logs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lab')
  );

-- Staff can view logs
CREATE POLICY "Staff can view whatsapp logs"
  ON whatsapp_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'doctor'))
  );
