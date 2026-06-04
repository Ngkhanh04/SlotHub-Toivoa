const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db'); 
const http = require('http'); 
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);

// ==========================================
// 1. CẤU HÌNH SOCKET.IO
// ==========================================
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.set('socketio', io); 

io.on('connection', (socket) => {
    console.log(`🔌 [Socket.io] Connected: ${socket.id}`);

    socket.on('join_user', (userId) => {
        if (userId) socket.join(`user_${userId}`);
    });

    socket.on('join_conversation', (conversationId) => {
        if (conversationId) socket.join(`conv_${conversationId}`);
    });

    socket.on('disconnect', () => {
        console.log(`❌ [Socket.io] Disconnected: ${socket.id}`);
    });
});

// ==========================================
// 2. MIDDLEWARE & DB
// ==========================================
app.use(cors());
app.use(express.json()); 

connectDB();

// ==========================================
// 3. ROUTES DECLARATION
// ==========================================
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes'); 
const uploadRoutes = require('./routes/uploadRoutes'); 
const reviewRoutes = require('./routes/reviewRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const chatRoutes = require('./routes/chatRoutes');

const vendorRoutes = require('./routes/vendorRoutes'); 
const menuItemRoutes = require('./routes/menuItemRoutes');
const orderRoutes = require('./routes/orderRoutes');

const notificationRoutes = require('./routes/notificationRoutes');
const timeSlotRoutes = require('./routes/timeSlotRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const reportRoutes = require('./routes/reportRoutes');
// 🌟 Route Refund mới
const refundRoutes = require('./routes/refundRoutes');
const cartRoutes = require('./routes/cartRoutes');
const adminRoutes = require('./routes/adminRoutes');
const messageRoutes = require('./routes/messageRoutes');
// --- MOUNT ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/chat', chatRoutes);

app.use('/api/vendor', vendorRoutes);


app.use('/api/menuitems', menuItemRoutes); 

app.use('/api/orders', orderRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/timeslots', timeSlotRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
// 🌟 Gắn Route Refund
app.use('/api/refunds', refundRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
// ==========================================
// 4. CHẠY SERVER
// ==========================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Server SlotHub running on port ${PORT}`);
    console.log(`📡 Real-time engine (Socket.io) is active!`);
});