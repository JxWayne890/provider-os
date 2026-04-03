-- ============================================
-- NEW TABLES FOR PROVIDERUS FEATURES
-- Run this in Supabase SQL Editor
-- ============================================

-- Feature 1: Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Feature 3: Proposals
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  title TEXT,
  line_items JSONB DEFAULT '[]',
  total NUMERIC DEFAULT 0,
  terms TEXT,
  status TEXT DEFAULT 'Draft',
  expires_at TEXT,
  created_at TEXT,
  accepted_at TEXT,
  proposal_url TEXT
);
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on proposals" ON proposals FOR ALL USING (true) WITH CHECK (true);

-- Feature 5: Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  category TEXT,
  vendor TEXT,
  date TEXT,
  recurring BOOLEAN DEFAULT false,
  client_id TEXT,
  project_id TEXT,
  receipt_url TEXT,
  created_at TEXT
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- Feature 7: Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  file_name TEXT,
  file_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  entity_type TEXT,
  entity_id TEXT,
  uploaded_at TEXT
);
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on attachments" ON attachments FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for attachments (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT DO NOTHING;
