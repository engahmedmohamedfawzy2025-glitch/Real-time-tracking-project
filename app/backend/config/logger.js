const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Ensure logs directory exists
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, source, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${source || 'SYSTEM'}] ${message}${metaStr}`;
  })
);

// Create daily rotate file transport
const createDailyRotateTransport = (filename) => {
  return new DailyRotateFile({
    filename: path.join(logsDir, `${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat
  });
};

// Create loggers for different modules
const createLogger = (source) => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.label({ label: source }),
      logFormat
    ),
    defaultMeta: { source },
    transports: [
      createDailyRotateTransport('combined'),
      createDailyRotateTransport('error')
    ]
  });

  // Add console transport for development
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }));
  }

  return logger;
};

// Specialized loggers
const authLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { source: 'AUTH' },
  transports: [
    createDailyRotateTransport('auth'),
    createDailyRotateTransport('combined')
  ]
});

const ordersLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { source: 'ORDERS' },
  transports: [
    createDailyRotateTransport('orders'),
    createDailyRotateTransport('combined')
  ]
});

const socketLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { source: 'SOCKET' },
  transports: [
    createDailyRotateTransport('socket'),
    createDailyRotateTransport('combined')
  ]
});

const fcmLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { source: 'FCM' },
  transports: [
    createDailyRotateTransport('fcm'),
    createDailyRotateTransport('combined')
  ]
});

const errorLogger = winston.createLogger({
  level: 'error',
  format: logFormat,
  defaultMeta: { source: 'ERROR' },
  transports: [
    createDailyRotateTransport('error')
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  });

  authLogger.add(consoleTransport);
  ordersLogger.add(consoleTransport);
  socketLogger.add(consoleTransport);
  notificationsLogger.add(consoleTransport);
  errorLogger.add(consoleTransport);
}

module.exports = {
  createLogger,
  authLogger,
  ordersLogger,
  socketLogger,
  notificationsLogger,
  errorLogger
};