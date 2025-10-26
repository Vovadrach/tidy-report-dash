-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  total_hours DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_earned DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create work_days table
CREATE TABLE IF NOT EXISTS work_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours DECIMAL(10, 2) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  note TEXT,
  day_paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_client_id ON reports(client_id);
CREATE INDEX IF NOT EXISTS idx_work_days_report_id ON work_days(report_id);

-- Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_days ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients
CREATE POLICY "Users can view their own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for reports
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
  ON reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
  ON reports FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for work_days
CREATE POLICY "Users can view work_days of their reports"
  ON work_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = work_days.report_id
      AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert work_days to their reports"
  ON work_days FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = work_days.report_id
      AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update work_days of their reports"
  ON work_days FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = work_days.report_id
      AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete work_days of their reports"
  ON work_days FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = work_days.report_id
      AND reports.user_id = auth.uid()
    )
  );
