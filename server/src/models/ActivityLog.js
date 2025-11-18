const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['login', 'logout', 'data_submit', 'file_access', 'other']
    },
    description: String,
    ipAddress: String,
    userAgent: String,
    duration: Number, // session davomiyligi (sekundlarda)
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index qo'shish
activityLogSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);