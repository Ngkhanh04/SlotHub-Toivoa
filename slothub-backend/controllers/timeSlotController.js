const TimeSlot = require('../models/TimeSlot');

// 1. [GET] Lấy danh sách các Slot đang mở (Cho sinh viên chọn lúc đặt cơm)
const DEFAULT_SLOTS = [
    { startTime: '09:00', endTime: '09:30', maxCapacity: 50 },
    { startTime: '11:30', endTime: '12:00', maxCapacity: 50 },
    { startTime: '13:00', endTime: '13:30', maxCapacity: 50 },
    { startTime: '17:00', endTime: '17:30', maxCapacity: 50 },
];

const getActiveTimeSlots = async (req, res) => {
    try {
        let slots = await TimeSlot.find({ isActive: true }).sort({ startTime: 1 });
        if (slots.length === 0) {
            await TimeSlot.insertMany(DEFAULT_SLOTS);
            slots = await TimeSlot.find({ isActive: true }).sort({ startTime: 1 });
        }
        res.status(200).json(slots);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách khung giờ', error: error.message });
    }
};

// 2. [POST] Tạo khung giờ mới (Chỉ Admin)
const createTimeSlot = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Chỉ Admin mới có quyền tạo Slot!' });
        }
        
        const { startTime, endTime, maxCapacity } = req.body;
        const newSlot = new TimeSlot({ startTime, endTime, maxCapacity });
        
        await newSlot.save();
        res.status(201).json({ message: 'Tạo khung giờ thành công!', slot: newSlot });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi tạo khung giờ', error: error.message });
    }
};

module.exports = { getActiveTimeSlots, createTimeSlot };