const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    name: { type: String, required: true }, 
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    description: { type: String },
    imageUrl: { type: String }, 
    isActive: { type: Boolean, default: true }, 
    openTime: { type: String, default: '07:00' },
    closeTime: { type: String, default: '21:00' }, // Để 21:00 cho SV test dễ
    category: { type: String, default: 'Cơm' }
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);