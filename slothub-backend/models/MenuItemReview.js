const mongoose = require('mongoose');

/** Đánh giá món ăn — lưu riêng, không phụ thuộc embed trong MenuItem */
const menuItemReviewSchema = new mongoose.Schema({
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true }
}, { timestamps: true });

menuItemReviewSchema.index({ menuItem: 1, user: 1 }, { unique: true });
menuItemReviewSchema.index({ vendor: 1, createdAt: -1 });

module.exports = mongoose.model('MenuItemReview', menuItemReviewSchema);
