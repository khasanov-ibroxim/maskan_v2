const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username majburiy'],
        unique: true,
        trim: true,
        minlength: 3
    },
    password: {
        type: String,
        required: [true, 'Password majburiy'],
        minlength: 6,
        select: false
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'rieltor', 'user'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Password hash qilish
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Password tekshirish
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Online statusni yangilash
userSchema.methods.updateActivity = function() {
    this.lastActivity = Date.now();
    this.isOnline = true;
    return this.save();
};

// Offline qilish (5 daqiqadan oshiq faoliyat bo'lmasa)
userSchema.statics.updateOfflineUsers = async function() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    await this.updateMany(
        {
            isOnline: true,
            lastActivity: { $lt: fiveMinutesAgo }
        },
        {
            isOnline: false
        }
    );
};

module.exports = mongoose.model('User', userSchema);