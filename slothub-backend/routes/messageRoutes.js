const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    getMyConversations,
    getVendorsForChat,
    startConversation,
    getMessages,
    sendMessage,
    markConversationRead
} = require('../controllers/messageController');

router.use(protect);

router.get('/conversations', getMyConversations);
router.get('/vendors-for-chat', getVendorsForChat);
router.post('/conversations', startConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.put('/conversations/:id/read', markConversationRead);

module.exports = router;
