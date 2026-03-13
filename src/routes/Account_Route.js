const { Router } = require("express");
const { authMiddleware } = require("../middleware/Auth_Middleware");
const {
    getAccounts,
    createAccount,
    deleteAccount,
    updateAccount,
} = require("../controllers/Account_Controller");

const router = Router();

// Auth
router.use(authMiddleware);

router.get("/", getAccounts);

router.post("/", createAccount);

router.delete("/:id", deleteAccount);

router.put("/:id", updateAccount);

module.exports = router;
