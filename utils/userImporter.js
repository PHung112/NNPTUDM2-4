const User = require('../schemas/users');
const Role = require('../schemas/roles');
const nodemailer = require("nodemailer");

// Hàm tạo password ngẫu nhiên 16 ký tự
function generateRandomPassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// Hàm gửi email password
async function sendPasswordEmail(email, password, username) {
    const transporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 587,
        secure: false,
        auth: {
            user: "287b18f056f31c",  // Credentials từ Mailtrap
            pass: "287cf68d982c44",  // Credentials từ Mailtrap
        },
    });

    const mailOptions = {
        from: 'noreply@yourapp.com',
        to: email,
        subject: "Thông tin đăng nhập tài khoản",
        html: `
            <h2>Chào ${username}!</h2>
            <p>Tài khoản của bạn đã được tạo thành công.</p>
            <p><strong>Thông tin đăng nhập:</strong></p>
            <p>Username: <strong>${username}</strong></p>
            <p>Email: <strong>${email}</strong></p>
            <p>Password: <strong>${password}</strong></p>
            <p style="color: red;">Vui lòng thay đổi mật khẩu sau lần đăng nhập đầu tiên!</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email gửi thành công:", email);
        return true;
    } catch (error) {
        console.error("Lỗi gửi email:", error);
        return false;
    }
}

// Hàm import User
async function importUser(username, email) {
    try {
        // Kiểm tra user đã tồn tại
        const existingUser = await User.findOne({
            $or: [{ username }, { email }],
            isDeleted: false
        });

        if (existingUser) {
            throw new Error('Username hoặc email đã tồn tại');
        }

        // Lấy role "user"
        const userRole = await Role.findOne({ name: 'user' });
        if (!userRole) {
            throw new Error('Role "user" không tồn tại trong hệ thống');
        }

        // Tạo password ngẫu nhiên
        const randomPassword = generateRandomPassword(16);

        // Tạo user mới
        const newUser = new User({
            username,
            email,
            password: randomPassword,
            role: userRole._id,
            status: false,
            fullName: "",
            avatarUrl: "https://i.sstatic.net/l60Hf.png"
        });

        // Lưu user vào database
        await newUser.save();

        // Gửi email chứa mật khẩu
        const emailSent = await sendPasswordEmail(email, randomPassword, username);

        if (emailSent) {
            return {
                success: true,
                message: 'User được tạo thành công và email được gửi',
                user: {
                    _id: newUser._id,
                    username: newUser.username,
                    email: newUser.email,
                    role: newUser.role
                }
            };
        } else {
            return {
                success: true,
                message: 'User được tạo nhưng gửi email thất bại',
                user: newUser
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    generateRandomPassword,
    sendPasswordEmail,
    importUser
};
