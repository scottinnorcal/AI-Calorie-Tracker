-- Create the 'meals' table
CREATE TABLE meals (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    analysis TEXT,
    user_goal TEXT,
    daily_calories_goal INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- (Optional) Create an index on created_at for faster queries
CREATE INDEX idx_meals_created_at ON meals (created_at);
