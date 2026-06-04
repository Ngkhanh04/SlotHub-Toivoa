const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true }, // VD: Cơm, Bún/Phở, Đồ uống, Ăn vặt
    description: { type: String },
    iconUrl: { type: String }, // Link ảnh icon (Cloudinary) để hiển thị lên App cho đẹp
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);