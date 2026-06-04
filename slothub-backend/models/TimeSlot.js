const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
    startTime: { type: String, required: true }, // VD: "11:30"
    endTime: { type: String, required: true },   // VD: "11:45"
    maxCapacity: { type: Number, required: true, default: 50 }, // Tối đa 50 đơn/slot để tránh kẹt xe
    isActive: { type: Boolean, default: true } // Admin có thể tắt slot này nếu canteen cúp điện/nghỉ
}, { timestamps: true });

module.exports = mongoose.model('TimeSlot', timeSlotSchema);