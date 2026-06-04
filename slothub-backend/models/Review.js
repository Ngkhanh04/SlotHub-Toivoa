const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true }, // Đánh giá gian hàng nào
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Ai là người đánh giá
    rating: { type: Number, required: true, min: 1, max: 5 }, // Chấm từ 1 đến 5 sao
    comment: { type: String, required: true },
    // Vẫn giữ tính năng xịn xò: Cho phép sinh viên up ảnh chụp hộp cơm thực tế
    images: [{ type: String }] 
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);