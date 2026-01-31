
ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS end_time TIME;

CREATE TABLE IF NOT EXISTS blocked_time_slots (
    id SERIAL PRIMARY KEY,
    blocked_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);
