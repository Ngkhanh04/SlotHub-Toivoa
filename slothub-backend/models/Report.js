const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Sinh viên report
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }, // Report đơn hàng nào
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true }, // Quán bị report
    issueType: { 
        type: String, 
        enum: ['MISSING_ITEM', 'BAD_QUALITY', 'WRONG_ITEM', 'ATTITUDE', 'OTHER'], 
        required: true 
    },
    description: { type: String, required: true },
    images: [{ type: String }], // Bằng chứng (Hình chụp cọng tóc trong bát cơm chẳng hạn)
    status: { 
        type: String, 
        enum: ['PENDING', 'INVESTIGATING', 'RESOLVED', 'REJECTED'], 
        default: 'PENDING' 
    },
    adminNote: { type: String } // Kết luận của Ban quản lý (VD: Đã phạt quán 200k, hoàn tiền cho SV)
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);