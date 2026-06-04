const mongoose = require('mongoose');

/** Lịch sử quét QR / OTP nhận món tại quầy */
const pickupVerificationSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    method: {
        type: String,
        enum: ['QR', 'OTP', 'MANUAL_STATUS'],
        default: 'QR'
    },
    success: { type: Boolean, default: true },
    alreadyCompleted: { type: Boolean, default: false },
    otpMatched: { type: Boolean },
    note: { type: String, default: '' }
}, { timestamps: true });

pickupVerificationSchema.index({ order: 1, createdAt: -1 });
pickupVerificationSchema.index({ vendor: 1, createdAt: -1 });

module.exports = mongoose.model('PickupVerification', pickupVerificationSchema);
