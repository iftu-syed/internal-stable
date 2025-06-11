// logger.js
const fs = require('fs');
const path = require('path');

// Full path to logs/app.log
const logFilePath = path.join(__dirname, 'logs', 'app.log');

// Open the log file in append mode
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Function to write a log message with timestamp
function logToApp(message) {
  const timestamp = new Date().toISOString(); // Example: 2025-06-04T15:23:45.678Z
  const fullMessage = `[${timestamp}] ${message}\n`;
  logStream.write(fullMessage);
}

// Export the function so other files can use it
module.exports = {
  logToApp,
};
