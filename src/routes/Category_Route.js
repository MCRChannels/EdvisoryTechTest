const { Router } = require("express");
const { authMiddleware } = require("../middleware/Auth_Middleware");
const {
    getCategories,
    createCategory,
    deleteCategory,
    updateCategory,
} = require("../controllers/Category_Controller");

const router = Router();

router.use(authMiddleware);

router.get("/", getCategories);

router.post("/", createCategory);

router.delete("/:id", deleteCategory);

router.put("/:id", updateCategory);

module.exports = router;
