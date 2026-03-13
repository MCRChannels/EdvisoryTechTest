const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const { authMiddleware } = require("../middleware/Auth_Middleware");
const {
    getTransactions,
    createTransaction,
    deleteTransaction,
    updateTransaction,
} = require("../controllers/Transaction_Controller");

const router = Router();

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "..", "..", "slip"));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `slip-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("อนุญาตเฉพาะไฟล์รูปภาพ (jpeg, png, gif, webp)"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.use(authMiddleware);

router.get("/", getTransactions);

router.post("/", upload.single("slip"), createTransaction);

router.delete("/:id", deleteTransaction);

router.put("/:id", upload.single("slip"), updateTransaction);

module.exports = router;
