const crypto = require("crypto");
const { getDB } = require("../config/db");

// Auth check
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนนะครับ" });
        }

        const token = authHeader.split(" ")[1];
        const db = getDB();

        const session = await db.collection("sessions").findOne({ token });
        if (!session) {
            return res.status(401).json({ error: "Token ไม่ถูกต้องหรือยังไม่ได้ใส่ใน Authorization (Bearer Token) ครับ" });
        }

        if (session.expiresAt < new Date()) {
            await db.collection("sessions").deleteOne({ _id: session._id });
            return res.status(401).json({ error: "Token หมดอายุ กรุณาเข้าสู่ระบบใหม่" });
        }

        req.userId = session.userId;
        next();
    } catch (err) {
        res.status(500).json({ error: "Authentication error" });
    }
}

// Hash password
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
        .createHash("sha256")
        .update(password + salt)
        .digest("hex");
    return { hash, salt };
}

function verifyPassword(password, hash, salt) {
    const computed = crypto
        .createHash("sha256")
        .update(password + salt)
        .digest("hex");
    return computed === hash;
}

// New token
function generateToken() {
    return crypto.randomBytes(32).toString("hex");
}

module.exports = { authMiddleware, hashPassword, verifyPassword, generateToken };
