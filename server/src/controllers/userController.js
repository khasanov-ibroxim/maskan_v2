const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// @desc    Online userlarni olish
// @route   GET /api/users/online
exports.getOnlineUsers = async (req, res) => {
    try {
        // Avval offline userlarni yangilash
        await User.updateOfflineUsers();

        const onlineUsers = await User.find({ isOnline: true })
            .select('username fullName role lastActivity')
            .sort('-lastActivity');

        res.json({
            success: true,
            count: onlineUsers.length,
            users: onlineUsers
        });

    } catch (error) {
        console.error('Online users xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

// @desc    User faoliyatini olish
// @route   GET /api/users/:id/activity
exports.getUserActivity = async (req, res) => {
    try {
        const userId = req.params.id;

        // Faqat admin yoki o'z activity'sini ko'rishi mumkin
        if (req.user.role !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Ruxsat yo\'q'
            });
        }

        const activities = await ActivityLog.find({ user: userId })
            .sort('-timestamp')
            .limit(50)
            .populate('user', 'username fullName');

        // Umumiy statistika
        const stats = await ActivityLog.aggregate([
            { $match: { user: mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                    totalDuration: { $sum: '$duration' }
                }
            }
        ]);

        res.json({
            success: true,
            activities,
            stats
        });

    } catch (error) {
        console.error('User activity xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

// @desc    Barcha userlarni olish (admin)
// @route   GET /api/users
exports.getAllUsers = async (req, res) => {
    try {
        await User.updateOfflineUsers();

        const users = await User.find()
            .select('username fullName role isActive isOnline lastLogin lastActivity')
            .sort('-createdAt');

        res.json({
            success: true,
            count: users.length,
            users
        });

    } catch (error) {
        console.error('Get users xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

// @desc    Yangi user yaratish (admin)
// @route   POST /api/users
exports.createUser = async (req, res) => {
    try {
        const { username, password, fullName, role } = req.body;

        // Validatsiya
        if (!username || !password || !fullName) {
            return res.status(400).json({
                success: false,
                error: 'Barcha maydonlar to\'ldirilishi kerak'
            });
        }

        // Username mavjudligini tekshirish
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Bu username band'
            });
        }

        const user = await User.create({
            username,
            password,
            fullName,
            role: role || 'user'
        });

        res.status(201).json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Create user xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};