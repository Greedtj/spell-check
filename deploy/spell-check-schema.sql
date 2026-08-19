-- SQL Server schema for Spell Check Beta.
-- New camelCase structure. This script is non-destructive.

IF DB_ID(N'spellCheckBeta') IS NULL
    CREATE DATABASE [spellCheckBeta];
GO

USE [spellCheckBeta];
GO

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.users (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_users PRIMARY KEY,
        email NVARCHAR(320) NOT NULL,
        name NVARCHAR(255) NULL,
        type NVARCHAR(20) NOT NULL CONSTRAINT DF_users_type DEFAULT N'TEACHER',
        isAdmin BIT NOT NULL CONSTRAINT DF_users_isAdmin DEFAULT 0,
        isBlocked BIT NOT NULL CONSTRAINT DF_users_isBlocked DEFAULT 0,
        isActive BIT NOT NULL CONSTRAINT DF_users_isActive DEFAULT 1,
        createdBy INT NULL,
        createdAt DATETIME2(0) NOT NULL CONSTRAINT DF_users_createdAt DEFAULT SYSUTCDATETIME(),
        updatedBy INT NULL,
        updateAt DATETIME2(0) NOT NULL CONSTRAINT DF_users_updateAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_users_email UNIQUE (email),
        CONSTRAINT CK_users_type CHECK (type IN (N'STUDENT', N'TEACHER', N'STAFF')),
        CONSTRAINT FK_users_createdBy FOREIGN KEY (createdBy) REFERENCES dbo.users(id),
        CONSTRAINT FK_users_updatedBy FOREIGN KEY (updatedBy) REFERENCES dbo.users(id)
    );
END
GO

IF OBJECT_ID(N'dbo.jobs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.jobs (
        id NVARCHAR(36) NOT NULL CONSTRAINT PK_jobs PRIMARY KEY,
        userId INT NOT NULL,
        originalFilename NVARCHAR(500) NOT NULL,
        originalKey NVARCHAR(800) NOT NULL,
        ocrKey NVARCHAR(800) NULL,
        reportKey NVARCHAR(800) NULL,
        excelKey NVARCHAR(800) NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_jobs_status DEFAULT N'PENDING',
        errorText NVARCHAR(1000) NULL,
        pages INT NULL,
        elapsedSeconds INT NULL,
        isActive BIT NOT NULL CONSTRAINT DF_jobs_isActive DEFAULT 1,
        createdBy INT NULL,
        createdAt DATETIME2(0) NOT NULL CONSTRAINT DF_jobs_createdAt DEFAULT SYSUTCDATETIME(),
        updatedBy INT NULL,
        updateAt DATETIME2(0) NOT NULL CONSTRAINT DF_jobs_updateAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_jobs_status CHECK (status IN (N'PENDING', N'PROCESSING', N'DONE', N'FAILED')),
        CONSTRAINT FK_jobs_userId FOREIGN KEY (userId) REFERENCES dbo.users(id),
        CONSTRAINT FK_jobs_createdBy FOREIGN KEY (createdBy) REFERENCES dbo.users(id),
        CONSTRAINT FK_jobs_updatedBy FOREIGN KEY (updatedBy) REFERENCES dbo.users(id)
    );
END
GO

IF OBJECT_ID(N'dbo.jobLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.jobLogs (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_jobLogs PRIMARY KEY,
        jobId NVARCHAR(36) NOT NULL,
        level NVARCHAR(30) NOT NULL CONSTRAINT DF_jobLogs_level DEFAULT N'INFO',
        message NVARCHAR(MAX) NOT NULL,
        detail NVARCHAR(MAX) NULL,
        isActive BIT NOT NULL CONSTRAINT DF_jobLogs_isActive DEFAULT 1,
        createdBy INT NULL,
        createdAt DATETIME2(0) NOT NULL CONSTRAINT DF_jobLogs_createdAt DEFAULT SYSUTCDATETIME(),
        updatedBy INT NULL,
        updateAt DATETIME2(0) NOT NULL CONSTRAINT DF_jobLogs_updateAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_jobLogs_jobId FOREIGN KEY (jobId) REFERENCES dbo.jobs(id),
        CONSTRAINT FK_jobLogs_createdBy FOREIGN KEY (createdBy) REFERENCES dbo.users(id),
        CONSTRAINT FK_jobLogs_updatedBy FOREIGN KEY (updatedBy) REFERENCES dbo.users(id)
    );
END
GO

IF COL_LENGTH(N'dbo.jobLogs', N'detail') IS NULL
BEGIN
    ALTER TABLE dbo.jobLogs ADD detail NVARCHAR(MAX) NULL;
END
GO

IF OBJECT_ID(N'dbo.dictionaryTerms', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.dictionaryTerms (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_dictionaryTerms PRIMARY KEY,
        wrong NVARCHAR(500) NOT NULL,
        correct NVARCHAR(500) NOT NULL,
        isActive BIT NOT NULL CONSTRAINT DF_dictionaryTerms_isActive DEFAULT 1,
        createdBy INT NULL,
        createdAt DATETIME2(0) NOT NULL CONSTRAINT DF_dictionaryTerms_createdAt DEFAULT SYSUTCDATETIME(),
        updatedBy INT NULL,
        updateAt DATETIME2(0) NOT NULL CONSTRAINT DF_dictionaryTerms_updateAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_dictionaryTerms_wrong UNIQUE (wrong),
        CONSTRAINT FK_dictionaryTerms_createdBy FOREIGN KEY (createdBy) REFERENCES dbo.users(id),
        CONSTRAINT FK_dictionaryTerms_updatedBy FOREIGN KEY (updatedBy) REFERENCES dbo.users(id)
    );
END
GO

IF OBJECT_ID(N'dbo.spellcheckFindings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.spellcheckFindings (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_spellcheckFindings PRIMARY KEY,
        jobId NVARCHAR(36) NOT NULL,
        page NVARCHAR(50) NOT NULL,
        found NVARCHAR(500) NOT NULL,
        suggestion NVARCHAR(500) NOT NULL,
        reason NVARCHAR(1000) NOT NULL,
        isActive BIT NOT NULL CONSTRAINT DF_spellcheckFindings_isActive DEFAULT 1,
        createdBy INT NULL,
        createdAt DATETIME2(0) NOT NULL CONSTRAINT DF_spellcheckFindings_createdAt DEFAULT SYSUTCDATETIME(),
        updatedBy INT NULL,
        updateAt DATETIME2(0) NOT NULL CONSTRAINT DF_spellcheckFindings_updateAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_spellcheckFindings_jobId FOREIGN KEY (jobId) REFERENCES dbo.jobs(id),
        CONSTRAINT FK_spellcheckFindings_createdBy FOREIGN KEY (createdBy) REFERENCES dbo.users(id),
        CONSTRAINT FK_spellcheckFindings_updatedBy FOREIGN KEY (updatedBy) REFERENCES dbo.users(id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_jobs_userId' AND object_id = OBJECT_ID(N'dbo.jobs'))
    CREATE INDEX IX_jobs_userId ON dbo.jobs(userId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_jobs_status' AND object_id = OBJECT_ID(N'dbo.jobs'))
    CREATE INDEX IX_jobs_status ON dbo.jobs(status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_jobs_createdAt' AND object_id = OBJECT_ID(N'dbo.jobs'))
    CREATE INDEX IX_jobs_createdAt ON dbo.jobs(createdAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_jobLogs_jobId' AND object_id = OBJECT_ID(N'dbo.jobLogs'))
    CREATE INDEX IX_jobLogs_jobId ON dbo.jobLogs(jobId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_jobLogs_createdAt' AND object_id = OBJECT_ID(N'dbo.jobLogs'))
    CREATE INDEX IX_jobLogs_createdAt ON dbo.jobLogs(createdAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_spellcheckFindings_jobId' AND object_id = OBJECT_ID(N'dbo.spellcheckFindings'))
    CREATE INDEX IX_spellcheckFindings_jobId ON dbo.spellcheckFindings(jobId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_spellcheckFindings_found' AND object_id = OBJECT_ID(N'dbo.spellcheckFindings'))
    CREATE INDEX IX_spellcheckFindings_found ON dbo.spellcheckFindings(found);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_spellcheckFindings_suggestion' AND object_id = OBJECT_ID(N'dbo.spellcheckFindings'))
    CREATE INDEX IX_spellcheckFindings_suggestion ON dbo.spellcheckFindings(suggestion);
GO
