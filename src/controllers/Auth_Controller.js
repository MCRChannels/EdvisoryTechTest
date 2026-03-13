const { getDB } = require("../config/db");
const { hashPassword, verifyPassword, generateToken } = require("../middleware/Auth_Middleware");

// register
async function register(req, res) {
    try {
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;

        // input check
        if (!username || !email || !password) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        // password length
        if (password.length < 6) {
            return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
        }

        const db = getDB();

        // check existing user
        const userCheck = await db.collection("users").findOne({
            $or: [{ email: email }, { username: username }]
        });
        
        if (userCheck) {
            return res.status(409).json({ error: "Username หรือ Email นี้มีคนใช้แล้ว" });
        }

        // hash password
        const passwordInfo = hashPassword(password);

        // save to db
        const result = await db.collection("users").insertOne({
            username: username,
            email: email,
            password: passwordInfo.hash,
            salt: passwordInfo.salt,
            createdAt: new Date()
        });

        res.status(201).json({
            message: "สมัครสมาชิกสำเร็จแล้ว",
            user: {
                id: result.insertedId,
                username: username,
                email: email
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "สมัครสมาชิกไม่สำเร็จ" });
    }
}

// login
async function login(req, res) {
    try {
        const username = req.body.username;
        const password = req.body.password;

        if (!username || !password) {
            return res.status(400).json({ error: "กรุณากรอก username และ password" });
        }

        const db = getDB();
        
        // find user
        const user = await db.collection("users").findOne({ username: username });

        // check password
        if (user == null) {
            return res.status(401).json({ error: "ไม่พบผู้ใช้งานนี้" });
        }

        const isPasswordCorrect = verifyPassword(password, user.password, user.salt);
        if (isPasswordCorrect == false) {
            return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
        }

        // clear old session
        await db.collection("sessions").deleteMany({ userId: user._id });

        // new token
        const newToken = generateToken();
        
        // save session
        await db.collection("sessions").insertOne({
            userId: user._id,
            token: newToken,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 วัน
        });

        res.json({
            message: "เข้าสู่ระบบสำเร็จ",
            token: newToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "เข้าสู่ระบบไม่สำเร็จ" });
    }
}

// logout
async function logout(req, res) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(" ")[1];
            const db = getDB();
            await db.collection("sessions").deleteOne({ token: token });
        }
        res.json({ message: "ออกจากระบบแล้ว" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "ออกจากระบบไม่สำเร็จ" });
    }
}

// update profile
async function updateProfile(req, res) {
    try {
        const email = req.body.email;
        const password = req.body.password;
        
        const db = getDB();
        const userId = req.userId;
        const updateData = {};

        // email update
        if (email) {
            // check unique
            const otherUser = await db.collection("users").findOne({ email: email });
            if (otherUser && otherUser._id.toString() !== userId.toString()) {
                return res.status(409).json({ error: "Email นี้มีคนอื่นใช้แล้ว" });
            }
            updateData.email = email;
        }

        // password update
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: "รหัสผ่านใหม่ต้องมี 6 ตัวขึ้นไป" });
            }
            const passwordInfo = hashPassword(password);
            updateData.password = passwordInfo.hash;
            updateData.salt = passwordInfo.salt;
        }

        const result = await db.collection("users").findOneAndUpdate(
            { _id: userId },
            { $set: updateData },
            { returnDocument: "after" }
        );

        res.json({
            message: "แก้ไขข้อมูลสำเร็จ",
            user: {
                id: result._id,
                username: result.username,
                email: result.email
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "แก้ไขข้อมูลไม่สำเร็จ" });
    }
}

// get profile
async function getProfile(req, res) {
    try {
        const db = getDB();
        const user = await db.collection("users").findOne(
            { _id: req.userId },
            { projection: { password: 0, salt: 0 } }
        );

        if (!user) {
            return res.status(404).json({ error: "หาข้อมูลไม่เจอ" });
        }

        res.json({
            message: "ดึงข้อมูลสำเร็จ",
            user: user
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
    }
}

// delete account
async function deleteAccount(req, res) {
    try {
        const db = getDB();
        const userId = req.userId;

        // delete all data
        await db.collection("sessions").deleteMany({ userId: userId });
        await db.collection("accounts").deleteMany({ userId: userId });
        await db.collection("categories").deleteMany({ userId: userId });
        await db.collection("transactions").deleteMany({ userId: userId });
        await db.collection("users").deleteOne({ _id: userId });

        res.json({ message: "ลบบัญชีและข้อมูลทั้งหมดออกแล้ว" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "ลบบัญชีไม่ได้" });
    }
}

module.exports = { register, login, logout, updateProfile, getProfile, deleteAccount };
