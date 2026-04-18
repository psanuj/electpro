-- ─── RUN THIS IN SQL SERVER MANAGEMENT STUDIO ───────────────────────────────
-- Step 1: Create the database
CREATE DATABASE ElectProDB;
GO

-- Step 2: Use it
USE ElectProDB;
GO

-- Step 3: Create Users table
CREATE TABLE Users (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  name        NVARCHAR(100)  NOT NULL,
  email       NVARCHAR(100)  NOT NULL UNIQUE,
  password    NVARCHAR(255)  NOT NULL,
  role        NVARCHAR(20)   NOT NULL,  -- 'student' or 'admin'
  usn         NVARCHAR(50)   NULL,      -- student only
  branch      NVARCHAR(50)   NULL,      -- student only
  semester    NVARCHAR(20)   NULL,      -- student only
  designation NVARCHAR(100)  NULL,      -- admin only
  department  NVARCHAR(100)  NULL,      -- admin only
  created_at  DATETIME DEFAULT GETDATE()
);
GO

PRINT '✅ ElectProDB and Users table created successfully!';
