-- Migration: Add Workers and Work Day Assignments
-- This migration adds support for multiple workers per work day

-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6', -- Default blue color for markers
  is_primary BOOLEAN NOT NULL DEFAULT false, -- True for main user (Лідія)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create work_day_assignments table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS work_day_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_day_id UUID NOT NULL REFERENCES work_days(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Amount assigned to this worker
  hours DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Hours assigned to this worker
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(work_day_id, worker_id) -- One assignment per worker per work day
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workers_user_id ON workers(user_id);
CREATE INDEX IF NOT EXISTS idx_work_day_assignments_work_day_id ON work_day_assignments(work_day_id);
CREATE INDEX IF NOT EXISTS idx_work_day_assignments_worker_id ON work_day_assignments(worker_id);

-- Enable Row Level Security (RLS)
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_day_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workers
CREATE POLICY "Users can view their own workers"
  ON workers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workers"
  ON workers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workers"
  ON workers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workers"
  ON workers FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for work_day_assignments
CREATE POLICY "Users can view assignments of their work_days"
  ON work_day_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_days
      JOIN reports ON reports.id = work_days.report_id
      WHERE work_days.id = work_day_assignments.work_day_id
      AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert assignments to their work_days"
  ON work_day_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_days
      JOIN reports ON reports.id = work_days.report_id
      WHERE work_days.id = work_day_assignments.work_day_id
      AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update assignments of their work_days"
  ON work_day_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM work_days
      JOIN reports ON reports.id = work_days.report_id
      WHERE work_days.id = work_day_assignments.work_day_id
      AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete assignments of their work_days"
  ON work_day_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM work_days
      JOIN reports ON reports.id = work_days.report_id
      WHERE work_days.id = work_day_assignments.work_day_id
      AND reports.user_id = auth.uid()
    )
  );

-- Insert primary worker for existing users (run this after migration)
-- This will be done programmatically when user first logs in
