-- Додаємо колонку is_planned в таблицю work_days
ALTER TABLE work_days
ADD COLUMN IF NOT EXISTS is_planned BOOLEAN DEFAULT FALSE;

-- Коментар для опису
COMMENT ON COLUMN work_days.is_planned IS 'Позначає чи робота запланована (без годин/суми)';
