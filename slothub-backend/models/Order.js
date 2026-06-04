const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, 
    
    items: [{
        menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true } 
    }],

    totalPrice: { type: Number, required: true }, 
    
    note: { type: String, default: '' }, 
    deliveryType: { type: String, default: 'pickup' }, // Mặc định là đến lấy
    
    // 🌟 CHỈ CÒN LẠI KHUNG GIỜ NHẬN MÓN
    pickupSlot: { 
        type: String, 
        required: [true, 'Vui lòng chọn khung giờ nhận cơm'] 
    }, 
    
    otpCode: { type: String },
    pickupCodeIssuedAt: { type: Date },
    pickupCodeExpiresAt: { type: Date },
    
    status: { 
        type: String, 
        enum: ['Pending', 'Processing', 'Ready', 'Completed', 'Cancelled'], 
        default: 'Pending' 
    },

    paymentStatus: { 
        type: String, 
        enum: ['Unpaid', 'Paid', 'Refunded'], 
        default: 'Unpaid' 
    },
    paymentMethod: { 
        type: String, 
        enum: ['wallet', 'vnpay'],
        default: 'wallet' 
    },
    transactionId: { type: String }, 
    
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);