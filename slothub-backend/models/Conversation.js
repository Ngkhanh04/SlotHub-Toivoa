const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['STUDENT_VENDOR', 'VENDOR_ADMIN'],
        required: true
    },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vendorOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

conversationSchema.index({ type: 1, student: 1, vendor: 1 }, { unique: true, partialFilterExpression: { type: 'STUDENT_VENDOR' } });
conversationSchema.index({ type: 1, vendorOwner: 1 }, { unique: true, partialFilterExpression: { type: 'VENDOR_ADMIN' } });

module.exports = mongoose.model('Conversation', conversationSchema);
