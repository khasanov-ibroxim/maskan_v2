const fs = require('fs');
const path = require('path');

class Logger {
    constructor(logDir = 'logs') {
        this.logDir = logDir;
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = {
            timestamp,
            level,
            message,
            data
        };

        console.log(`[${timestamp}] [${level}] ${message}`, data || '');

        const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, JSON.stringify(logMessage) + '\n');
    }

    info(message, data) {
        this.log('INFO', message, data);
    }

    error(message, data) {
        this.log('ERROR', message, data);
    }

    warn(message, data) {
        this.log('WARN', message, data);
    }
}

module.exports = new Logger();