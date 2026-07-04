-- Cleanup script: Remove duplicate workers and assign all work_days to primary worker

-- Step 1: Get the primary worker ID (should be Лідія)
DO $$
DECLARE
    primary_worker_id UUID;
    current_user_id UUID;
BEGIN
    -- Get current user (replace with actual user_id from auth.users)
    SELECT id INTO current_user_id FROM auth.users LIMIT 1;
    
    -- Get or create primary worker
    SELECT id INTO primary_worker_id 
    FROM workers 
    WHERE user_id = current_user_id AND is_primary = true 
    LIMIT 1;
    
    -- If no primary worker exists, create one
    IF primary_worker_id IS NULL THEN
        INSERT INTO workers (user_id, name, color, is_primary)
        VALUES (current_user_id, 'Лідія', '#3b82f6', true)
        RETURNING id INTO primary_worker_id;
    END IF;
    
    -- Step 2: Delete all non-primary workers for this user
    DELETE FROM workers 
    WHERE user_id = current_user_id AND is_primary = false;
    
    -- Step 3: Get all work_days that don't have assignments
    -- and create assignments for them to primary worker
    INSERT INTO work_day_assignments (work_day_id, worker_id, amount, hours)
    SELECT 
        wd.id,
        primary_worker_id,
        wd.amount,
        wd.hours
    FROM work_days wd
    INNER JOIN reports r ON wd.report_id = r.id
    WHERE r.user_id = current_user_id
    AND NOT EXISTS (
        SELECT 1 FROM work_day_assignments wda 
        WHERE wda.work_day_id = wd.id
    );
    
    RAISE NOTICE 'Cleanup complete. Primary worker: %', primary_worker_id;
END $$;
