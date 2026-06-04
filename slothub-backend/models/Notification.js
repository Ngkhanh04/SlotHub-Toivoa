const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    audience: {
        type: String,
        enum: ['admin', 'vendor', 'student'],
        default: 'admin'
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: [
            'DEPOSIT', 'WITHDRAW', 'PAYOUT', 'NEW_VENDOR', 'NEW_USER', 'NEW_ORDER',
            'NEW_REVIEW', 'REPORT', 'SYSTEM', 'ORDER_READY', 'ORDER_COMPLETED', 'PICKUP'
        ],
        default: 'SYSTEM'
    },
    isRead: { type: Boolean, default: false },
    actionLink: { type: String, default: '' }
}, {
    timestamps: true
});

notificationSchema.index({ audience: 1, recipientId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
