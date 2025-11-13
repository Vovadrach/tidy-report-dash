-- Remove CASCADE behavior from work_day_assignments
-- This allows records to remain even after worker is deleted

-- First, drop the existing foreign key constraint
ALTER TABLE work_day_assignments
DROP CONSTRAINT IF EXISTS work_day_assignments_worker_id_fkey;

-- Add new foreign key constraint with SET NULL behavior
-- When a worker is deleted, their assignments will have worker_id set to NULL
ALTER TABLE work_day_assignments
ADD CONSTRAINT work_day_assignments_worker_id_fkey
FOREIGN KEY (worker_id)
REFERENCES workers(id)
ON DELETE SET NULL;

-- Make worker_id nullable to support this behavior
ALTER TABLE work_day_assignments
ALTER COLUMN worker_id DROP NOT NULL;

-- Add a column to store the deleted worker's name for historical reference
ALTER TABLE work_day_assignments
ADD COLUMN IF NOT EXISTS deleted_worker_name TEXT;

-- Create a function to preserve worker name before deletion
CREATE OR REPLACE FUNCTION preserve_worker_name()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE work_day_assignments
  SET deleted_worker_name = (SELECT name FROM workers WHERE id = OLD.id)
  WHERE worker_id = OLD.id AND deleted_worker_name IS NULL;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before worker deletion
DROP TRIGGER IF EXISTS preserve_worker_name_trigger ON workers;
CREATE TRIGGER preserve_worker_name_trigger
BEFORE DELETE ON workers
FOR EACH ROW
EXECUTE FUNCTION preserve_worker_name();
