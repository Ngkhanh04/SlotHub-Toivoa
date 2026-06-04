const mongoose = require('mongoose');

/** Nhật ký đổi trạng thái đơn hàng — không mất lịch sử */
const orderStatusLogSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    fromStatus: { type: String, default: '' },
    toStatus: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedByRole: { type: String, default: 'system' },
    note: { type: String, default: '' }
}, { timestamps: true });

orderStatusLogSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model('OrderStatusLog', orderStatusLogSchema);
