const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    avatar: { type: String }, 
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true }
}, { timestamps: true });

const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true }, 
    price: { type: Number, required: true },
    description: { type: String },
    imageUrl: { type: String }, 
    category: { type: String, default: 'Cơm' }, 
    isAvailable: { type: Boolean, default: true }, 
    
    // Sức khỏe
    calories: { type: Number, min: 0 }, 
    
    // Kho
    countInStock: { type: Number, default: 50, min: 0 }, 
    dailyQuota: { type: Number, default: 100 }, 
    totalSold: { type: Number, default: 0 },

    // Đánh giá
    reviews: [reviewSchema], 
    rating: { type: Number, default: 0 }, 
    numReviews: { type: Number, default: 0 } 
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);