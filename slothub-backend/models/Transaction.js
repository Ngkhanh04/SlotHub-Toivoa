const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    amount: { type: Number, required: true },
    type: { 
        type: String, 
        enum: ['PAYMENT', 'REFUND', 'PAYOUT', 'DEPOSIT', 'WITHDRAW', 'PLATFORM_FEE'], 
        required: true 
    },
    paymentMethod: { type: String, default: 'VNPAY' },
    transactionId: { type: String }, 
    status: { 
        type: String, 
        enum: ['PENDING', 'SUCCESS', 'FAILED'], 
        default: 'PENDING' 
    },
    description: { type: String },

    // 🌟 THÊM MỚI: Cấu trúc lưu trữ thông tin ngân hàng nhận tiền của Sinh viên
    bankInfo: {
        bankName: { type: String },       // Tên ngân hàng (Ví dụ: MBBank, Vietcombank)
        accountNumber: { type: String },  // Số tài khoản nhận tiền
        accountName: { type: String }     // Tên chủ tài khoản (Viết hoa không dấu)
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);