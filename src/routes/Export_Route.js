const { Router } = require("express");
const { authMiddleware } = require("../middleware/Auth_Middleware");
const { exportSummary } = require("../controllers/Export_Controller");

const router = Router();

router.use(authMiddleware);

router.get("/summary", exportSummary);

module.exports = router;
