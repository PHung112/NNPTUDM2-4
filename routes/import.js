const express = require('express');
const router = express.Router();
const { excelUpload, importUsersFromExcel } = require('../utils/excelImporter');

/**
 * Route: POST /api/import/excel
 * Upload file user.xlsx và import vào database
 * File format:
 * | username | email |
 * | -------- | ----- |
 * | john     | john@example.com |
 * | jane     | jane@example.com |
 */
router.post('/excel', excelUpload.single('file'), async (req, res) => {
    try {
        // Kiểm tra file có được upload
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng chọn file Excel để upload'
            });
        }

        console.log('File uploaded:', req.file.filename);

        // Import users từ file Excel
        const result = await importUsersFromExcel(req.file.path);

        // Trả về kết quả
        return res.status(200).json({
            success: true,
            message: `Import hoàn tất: ${result.success} thành công, ${result.failed} thất bại`,
            data: result
        });

    } catch (error) {
        console.error('Lỗi:', error);
        
        // Xóa file nếu có lỗi
        if (req.file && require('fs').existsSync(req.file.path)) {
            require('fs').unlinkSync(req.file.path);
        }

        res.status(400).json({
            success: false,
            error: error.message || 'Lỗi khi import file Excel'
        });
    }
});

module.exports = router;
