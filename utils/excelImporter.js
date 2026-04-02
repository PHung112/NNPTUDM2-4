const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { importUser } = require('./userImporter');

// Cấu hình multer cho upload file Excel
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/excel');
        // Tạo thư mục nếu không tồn tại
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    // Chỉ cho phép file Excel
    const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép file Excel (.xls, .xlsx)'), false);
    }
};

const excelUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

/**
 * Hàm đọc và xử lý file Excel
 * @param {string} filePath - Đường dẫn file Excel
 * @returns {Array} Mảng chứa dữ liệu người dùng
 */
function readExcelFile(filePath) {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        return data;
    } catch (error) {
        throw new Error('Lỗi đọc file Excel: ' + error.message);
    }
}

/**
 * Hàm import batch user từ file Excel
 * @param {string} filePath - Đường dẫn file Excel
 * @returns {Object} Kết quả import
 */
async function importUsersFromExcel(filePath) {
    try {
        // Đọc dữ liệu từ file Excel
        const users = readExcelFile(filePath);
        
        if (!Array.isArray(users) || users.length === 0) {
            throw new Error('File Excel không chứa dữ liệu hoặc định dạng không đúng');
        }

        const results = {
            total: users.length,
            success: 0,
            failed: 0,
            errors: []
        };

        // Import từng user
        for (let i = 0; i < users.length; i++) {
            const row = users[i];

            // Validate dữ liệu (column names phải là: username, email)
            const username = row.username || row.Username || row.USERNAME;
            const email = row.email || row.Email || row.EMAIL;

            if (!username || !email) {
                results.failed++;
                results.errors.push({
                    row: i + 2, // +2 vì header là row 1
                    error: 'Thiếu username hoặc email',
                    data: row
                });
                continue;
            }

            try {
                const result = await importUser(username.toString().trim(), email.toString().trim());
                
                if (result.success) {
                    results.success++;
                } else {
                    results.failed++;
                    results.errors.push({
                        row: i + 2,
                        error: result.error,
                        data: row
                    });
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    row: i + 2,
                    error: error.message,
                    data: row
                });
            }
        }

        return results;
    } catch (error) {
        throw error;
    } finally {
        // Xóa file sau khi xử lý
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

module.exports = {
    excelUpload,
    readExcelFile,
    importUsersFromExcel
};
