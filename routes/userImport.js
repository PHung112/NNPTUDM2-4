const express = require('express');
const router = express.Router();
const { importUser } = require('../utils/userImporter');

/**
 * Route: POST /api/users/import
 * Tạo user mới với username, email
 * Password được tạo ngẫu nhiên 16 ký tự
 * Email chứa password sẽ được gửi cho user
 */
router.post('/import', async (req, res) => {
    try {
        const { username, email } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!username || !email) {
            return res.status(400).json({
                success: false,
                error: 'Username và email là bắt buộc'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email không hợp lệ'
            });
        }

        // Import user
        const result = await importUser(username, email);

        if (result.success) {
            return res.status(201).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi server: ' + error.message
        });
    }
});

module.exports = router;
