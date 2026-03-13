const { Router } = require("express");
const { register, login, logout, updateProfile, getProfile, deleteAccount } = require("../controllers/Auth_Controller");
const { authMiddleware } = require("../middleware/Auth_Middleware");

const router = Router();

router.post("/register", register);

router.post("/login", login);

router.post("/logout", authMiddleware, logout);

router.put("/profile", authMiddleware, updateProfile);

router.get("/profile", authMiddleware, getProfile);

router.delete("/profile", authMiddleware, deleteAccount);

module.exports = router;
