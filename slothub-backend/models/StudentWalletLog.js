const mongoose = require('mongoose');

/** Biến động số dư ví sinh viên (bổ sung cho Transaction) */
const studentWalletLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number },
    type: {
        type: String,
        enum: ['DEPOSIT', 'PAYMENT', 'REFUND', 'ADJUSTMENT'],
        required: true
    },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    description: { type: String, default: '' }
}, { timestamps: true });

studentWalletLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('StudentWalletLog', studentWalletLogSchema);
