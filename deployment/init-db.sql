-- Database initialization script for StellarCollabApp
-- This script is automatically executed when the PostgreSQL container starts

-- The main database is created by the POSTGRES_DB environment variable
-- This script runs after the database is created

-- Create basic extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a simple table to verify the database is working
CREATE TABLE IF NOT EXISTS initialization_log (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Log that initialization completed
INSERT INTO initialization_log (message) VALUES ('StellarCollabApp database initialized successfully');

-- Grant all privileges to the stellarcollab user on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO stellarcollab;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO stellarcollab;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO stellarcollab;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO stellarcollab; 