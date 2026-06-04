const express = require('express');
const router = express.Router();
const { chatWithAI } = require('../controllers/chatController');

// [POST] Gọi API để chat với AI
router.post('/chat', chatWithAI);

module.exports = router;