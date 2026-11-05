
CREATE TABLE IF NOT EXISTS sensorReadings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    power DECIMAL(8,3) NOT NULL DEFAULT 0.000,
    dustLevel DECIMAL(8,3) NOT NULL DEFAULT 0.000,
    waterTank DECIMAL(8,3) NOT NULL DEFAULT 0.000,
    waterUsage DECIMAL(8,3) NOT NULL DEFAULT 0.000,

    pumpRunning BOOLEAN NOT NULL DEFAULT FALSE,

    espStatus VARCHAR(50) NOT NULL DEFAULT 'idle',
    commandAck VARCHAR(255) DEFAULT NULL,

    recordedAt TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sensor_recorded_at (recordedAt)
);

CREATE TABLE IF NOT EXISTS cleaningHistory (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    startedAt DATETIME DEFAULT NULL,
    completedAt DATETIME DEFAULT NULL,

    durationSeconds INT UNSIGNED DEFAULT NULL,

    cleaningStatus ENUM(
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled'
    ) NOT NULL DEFAULT 'pending',

    powerBefore DECIMAL(8,3) DEFAULT NULL,
    powerAfter DECIMAL(8,3) DEFAULT NULL,

    dustBefore DECIMAL(8,3) DEFAULT NULL,
    dustAfter DECIMAL(8,3) DEFAULT NULL,

    waterUsed DECIMAL(8,3) DEFAULT NULL,
    notes TEXT DEFAULT NULL,

    createdAt TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS systemSettings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    settingKey VARCHAR(100) NOT NULL UNIQUE,
    settingValue TEXT DEFAULT NULL,
    description VARCHAR(255) DEFAULT NULL,

    updatedAt TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    permission BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS maintenanceLogs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    eventType VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,

    severity ENUM(
        'info',
        'warning',
        'error',
        'critical'
    ) NOT NULL DEFAULT 'info',

    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolvedAt DATETIME DEFAULT NULL,

    createdAt TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);
