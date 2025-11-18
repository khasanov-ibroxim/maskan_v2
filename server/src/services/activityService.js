// Bu keyinroq MongoDB bilan ishlatiladi
class ActivityService {
    constructor() {
        this.activeUsers = new Map();
    }

    userActive(userId, userName) {
        this.activeUsers.set(userId, {
            userName,
            lastSeen: new Date(),
            isOnline: true
        });
    }

    userInactive(userId) {
        if (this.activeUsers.has(userId)) {
            const user = this.activeUsers.get(userId);
            user.isOnline = false;
            this.activeUsers.set(userId, user);
        }
    }

    getActiveUsers() {
        const now = new Date();
        const activeList = [];

        this.activeUsers.forEach((user, userId) => {
            const timeDiff = now - user.lastSeen;
            if (timeDiff < 5 * 60 * 1000) { // 5 daqiqa ichida
                activeList.push({
                    userId,
                    userName: user.userName,
                    lastSeen: user.lastSeen
                });
            }
        });

        return activeList;
    }
}

module.exports = new ActivityService();