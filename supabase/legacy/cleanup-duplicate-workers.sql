-- SAFE Cleanup duplicate workers - keep only ONE primary worker per user
-- This script preserves ALL work_day_assignments by reassigning them to the kept worker

-- Step 1: Show current state BEFORE cleanup
SELECT 'BEFORE CLEANUP:' as status;
SELECT user_id, COUNT(*) as worker_count, 
       STRING_AGG(name || ' (primary: ' || is_primary::text || ', id: ' || id::text || ')', ', ') as workers
FROM workers
GROUP BY user_id;

-- Step 2: Show work_day_assignments BEFORE cleanup
SELECT 'WORK DAY ASSIGNMENTS BEFORE:' as status;
SELECT w.name as worker_name, COUNT(wda.id) as assignment_count
FROM work_day_assignments wda
JOIN workers w ON wda.worker_id = w.id
GROUP BY w.id, w.name
ORDER BY w.name;

-- Step 3: Perform cleanup
DO $$
DECLARE
    rec RECORD;
    worker_to_keep_id UUID;
    deleted_count INTEGER;
    reassigned_count INTEGER;
BEGIN
    -- For each user
    FOR rec IN 
        SELECT DISTINCT user_id FROM workers
    LOOP
        -- Find the first (oldest) primary worker for this user
        SELECT id INTO worker_to_keep_id
        FROM workers
        WHERE user_id = rec.user_id AND is_primary = true
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- If no primary worker exists, keep the first worker and make it primary
        IF worker_to_keep_id IS NULL THEN
            SELECT id INTO worker_to_keep_id
            FROM workers
            WHERE user_id = rec.user_id
            ORDER BY created_at ASC
            LIMIT 1;
            
            -- Update it to be primary
            UPDATE workers 
            SET is_primary = true, name = 'Лідія', color = '#3b82f6'
            WHERE id = worker_to_keep_id;
        END IF;
        
        -- Count assignments that will be reassigned
        SELECT COUNT(*) INTO reassigned_count
        FROM work_day_assignments
        WHERE worker_id IN (
            SELECT id FROM workers 
            WHERE user_id = rec.user_id 
            AND id != worker_to_keep_id
        );
        
        -- Reassign all work_day_assignments from duplicate workers to the kept worker
        UPDATE work_day_assignments
        SET worker_id = worker_to_keep_id
        WHERE worker_id IN (
            SELECT id FROM workers 
            WHERE user_id = rec.user_id 
            AND id != worker_to_keep_id
        );
        
        -- Count workers that will be deleted
        SELECT COUNT(*) INTO deleted_count
        FROM workers
        WHERE user_id = rec.user_id
        AND id != worker_to_keep_id;
        
        -- Delete all other workers for this user
        DELETE FROM workers
        WHERE user_id = rec.user_id
        AND id != worker_to_keep_id;
        
        RAISE NOTICE 'User % - kept worker %, deleted % duplicates, reassigned % assignments', 
            rec.user_id, worker_to_keep_id, deleted_count, reassigned_count;
    END LOOP;
    
    RAISE NOTICE 'Cleanup completed successfully!';
END $$;

-- Step 4: Show state AFTER cleanup
SELECT 'AFTER CLEANUP:' as status;
SELECT user_id, COUNT(*) as worker_count, 
       STRING_AGG(name || ' (primary: ' || is_primary::text || ', id: ' || id::text || ')', ', ') as workers
FROM workers
GROUP BY user_id;

-- Step 5: Show work_day_assignments AFTER cleanup - should have same total count
SELECT 'WORK DAY ASSIGNMENTS AFTER:' as status;
SELECT w.name as worker_name, COUNT(wda.id) as assignment_count
FROM work_day_assignments wda
JOIN workers w ON wda.worker_id = w.id
GROUP BY w.id, w.name
ORDER BY w.name;

-- Step 6: Verify no orphaned assignments
SELECT 'ORPHANED ASSIGNMENTS CHECK:' as status;
SELECT COUNT(*) as orphaned_count
FROM work_day_assignments wda
LEFT JOIN workers w ON wda.worker_id = w.id
WHERE w.id IS NULL;

-- Step 7: Assign any existing work_days WITHOUT assignments to primary worker
INSERT INTO work_day_assignments (work_day_id, worker_id, amount, hours)
SELECT 
    wd.id,
    w.id as worker_id,
    wd.amount,
    wd.hours
FROM work_days wd
INNER JOIN reports r ON wd.report_id = r.id
INNER JOIN workers w ON w.user_id = r.user_id AND w.is_primary = true
WHERE NOT EXISTS (
    SELECT 1 FROM work_day_assignments wda 
    WHERE wda.work_day_id = wd.id
);

SELECT 'COMPLETE - All work records are safe!' as status;
