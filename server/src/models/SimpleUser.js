const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

class SimpleUser {
    static getUsers() {
        if (!fs.existsSync(USERS_FILE)) {
            const defaultUsers = [
                {
                    id: '1',
                    username: 'admin',
                    password: bcrypt.hashSync('admin123', 10),
                    fullName: 'Admin User',
                    role: 'admin',
                    isActive: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    username: 'Dovron',
                    password: bcrypt.hashSync('24081994', 10),
                    fullName: 'Dovron',
                    role: 'user',
                    isActive: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '3',
                    username: 'Xusan',
                    password: bcrypt.hashSync('12345', 10),
                    fullName: 'Xusan',
                    role: 'user',
                    isActive: true,
                    createdAt: new Date().toISOString()
                }
            ];
            fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
            return defaultUsers;
        }
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }

    static saveUsers(users) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }

    // server/src/models/SimpleUser.js

    static getSessions() {
        if (!fs.existsSync(SESSIONS_FILE)) {
            fs.writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2));
            return [];
        }

        try {
            const content = fs.readFileSync(SESSIONS_FILE, 'utf8');

            // Bo'sh fayl tekshiruvi
            if (!content || content.trim() === '') {
                fs.writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2));
                return [];
            }

            return JSON.parse(content);
        } catch (error) {
            console.error('❌ Sessions faylni o\'qishda xato:', error.message);
            console.log('🔧 Fayl qayta yaratilmoqda...');

            // Backup yaratish
            const backupFile = SESSIONS_FILE + `.backup.${Date.now()}`;
            fs.copyFileSync(SESSIONS_FILE, backupFile);
            console.log(`💾 Backup saqlandi: ${backupFile}`);

            // Yangi fayl yaratish
            fs.writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2));
            return [];
        }
    }

    static saveSessions(sessions) {
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    }

    static getLogs() {
        if (!fs.existsSync(LOGS_FILE)) {
            fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2));
            return [];
        }
        return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    }

    static saveLogs(logs) {
        fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
    }

    static findByUsername(username) {
        const users = this.getUsers();
        return users.find(u => u.username === username);
    }

    static findById(id) {
        const users = this.getUsers();
        return users.find(u => u.id === id);
    }

    static comparePassword(password, hashedPassword) {
        return bcrypt.compareSync(password, hashedPassword);
    }

    static createUser(userData) {
        const users = this.getUsers();
        const newUser = {
            id: Date.now().toString(),
            username: userData.username,
            password: bcrypt.hashSync(userData.password, 10),
            fullName: userData.fullName,
            role: userData.role || 'user',
            isActive: true,
            createdAt: new Date().toISOString()
        };

        // Realtor uchun qo'shimcha ma'lumotlar
        if (userData.role === 'rieltor') {
            newUser.appScriptUrl = userData.appScriptUrl;
            newUser.telegramThemeId = userData.telegramThemeId;
        }

        users.push(newUser);
        this.saveUsers(users);
        return newUser;
    }

    static updateUser(id, updates) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            this.saveUsers(users);
            return users[index];
        }
        return null;
    }

    static deleteUser(id) {
        const users = this.getUsers();
        const filtered = users.filter(u => u.id !== id);
        this.saveUsers(filtered);
    }
}

module.exports = SimpleUser;