const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs'); // 🌟 Đã thêm thư viện băm mật khẩu

const userSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Vui lòng nhập họ và tên'], trim: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, trim: true, default: '' },
    role: { type: String, enum: ['student', 'staff', 'vendor', 'vendor_owner', 'admin'], default: 'student' },
    password: { type: String, select: false },
    avatar: { type: String, default: '' },
    
    // 🌟 ĐÃ THÊM: Trường lưu ID của Google để tránh lỗi khi đăng nhập bằng Google
    googleId: { type: String, default: '' },

    // 🌟 THÊM TRƯỜNG DUYỆT TÀI KHOẢN (ĐĂNG KÝ QUẦY)
    isApproved: { 
        type: Boolean, 
        default: true 
    },

    walletBalance: { 
        type: Number, 
        default: 0, 
        min: [0, 'Số dư tài khoản không thể âm'] 
    },
    bankAccount: {
        bankName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        accountName: { type: String, default: '' }
    },
    isActive: { type: Boolean, default: true },
    studentId: { type: String, trim: true, default: '' },

    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false }

}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

userSchema.virtual('isPremium').get(function() {
    return this.walletBalance > 1000000; 
});

userSchema.methods.getResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    return resetToken;
};

// ==========================================
// 1. BĂM MẬT KHẨU TRƯỚC KHI LƯU VÀO DB (BẢN FIX TRIỆT ĐỂ LỖI NEXT)
// ==========================================
userSchema.pre('save', async function() {
    // 🌟 ĐÃ SỬA: Bỏ "next", dùng return thẳng. Nếu không có password hoặc pass không bị thay đổi thì bỏ qua
    if (!this.password || !this.isModified('password')) {
        return; 
    }
    // Băm mật khẩu với độ khó là 10 (salt)
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// ==========================================
// 2. HÀM SO SÁNH MẬT KHẨU KHI ĐĂNG NHẬP
// ==========================================
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ role: 1 });
// Mỗi sinh viên một STK — không trùng (bank + số TK) giữa các user role student
userSchema.index(
    { 'bankAccount.bankName': 1, 'bankAccount.accountNumber': 1 },
    {
        unique: true,
        partialFilterExpression: {
            role: 'student',
            'bankAccount.accountNumber': { $type: 'string', $ne: '' }
        }
    }
);

module.exports = mongoose.model('User', userSchema);