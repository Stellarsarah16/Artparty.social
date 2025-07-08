-- Production Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist
CREATE DATABASE artparty_social_prod;

-- Create user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'artparty') THEN
        CREATE USER artparty WITH PASSWORD 'CHANGE_THIS_PASSWORD';
    END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE artparty_social_prod TO artparty;

-- Connect to the database
\c artparty_social_prod;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO artparty;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO artparty;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO artparty;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; 