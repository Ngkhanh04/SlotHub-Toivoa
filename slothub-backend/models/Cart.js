const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true // Mỗi user chỉ có duy nhất 1 giỏ hàng
    },
    items: [{
        menuItem: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'MenuItem',
            required: true
        },
        quantity: { 
            type: Number, 
            default: 1,
            min: [1, 'Số lượng tối thiểu là 1']
        }
    }],
    totalPrice: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

// 🌟 FIX LỖI: Dùng async/await thì KHÔNG truyền tham số next()
// Thêm try...catch để đảm bảo không bị sập nếu có 1 món ăn bị xóa khỏi DB
cartSchema.pre('save', async function() {
    try {
        const MenuItem = mongoose.model('MenuItem');
        let total = 0;
        for (const item of this.items) {
            // Chỉ tính tiền nếu có menuItem
            if (item.menuItem) {
                const product = await MenuItem.findById(item.menuItem);
                if (product && product.price) {
                    total += product.price * item.quantity;
                }
            }
        }
        this.totalPrice = total;
    } catch (error) {
        console.error("❌ Lỗi khi tính tổng tiền giỏ hàng:", error);
    }
});

module.exports = mongoose.model('Cart', cartSchema);