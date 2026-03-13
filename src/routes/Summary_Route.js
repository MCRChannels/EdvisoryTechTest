const { Router } = require("express");
const { authMiddleware } = require("../middleware/Auth_Middleware");
const { getSummary } = require("../controllers/Summary_Controller");

const router = Router();

router.use(authMiddleware);

router.get("/", getSummary);

module.exports = router;
