-- CivicAI Database Schema for Supabase PostgreSQL
-- Run this script in your Supabase SQL Editor
-- IMPORTANT: This drops existing tables - backup first if needed!

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (to recreate with correct schema)
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Complaints Table
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'Submitted',
  category TEXT,
  main_category TEXT,
  sub_category TEXT,
  description TEXT,
  location JSONB,
  user_phone TEXT,
  user_id TEXT,
  user_name TEXT,
  image JSONB,
  analysis JSONB,
  forwarding_history JSONB DEFAULT '[]'::jsonb,
  forwarded_to TEXT,
  forwarded_at TIMESTAMP WITH TIME ZONE,
  forwarded_by TEXT,
  assigned_to TEXT,
  assigned_to_name TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  status_updated_at TIMESTAMP WITH TIME ZONE,
  status_updated_by TEXT,
  status_updated_by_name TEXT,
  proof_of_work JSONB,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  resolved_by_name TEXT
);

-- Admins Table
CREATE TABLE admins (
  phone TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT,
  department_id TEXT,
  department_name TEXT,
  can_access_complaints BOOLEAN DEFAULT true,
  can_manage_admins BOOLEAN DEFAULT true,
  permissions_updated_at TIMESTAMP WITH TIME ZONE,
  permissions_updated_by TEXT
);

-- Departments Table
CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  primary_email TEXT,
  cc_emails TEXT[] DEFAULT '{}',
  contact_person TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX idx_complaints_user_phone ON complaints(user_phone);
CREATE INDEX idx_complaints_forwarded_to ON complaints(forwarded_to);
CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to);
CREATE INDEX idx_admins_department_id ON admins(department_id);

-- Enable Row Level Security (RLS)
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth requirements)
-- For now, allow all operations (you can restrict this later with Supabase Auth)
CREATE POLICY "Allow all operations on complaints" ON complaints FOR ALL USING (true);
CREATE POLICY "Allow all operations on admins" ON admins FOR ALL USING (true);
CREATE POLICY "Allow all operations on departments" ON departments FOR ALL USING (true);
