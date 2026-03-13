const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { connectDB } = require("./config/db");
const { profanityMiddleware } = require("./middleware/profanityFilter");

require("dotenv").config();

// routes
const authRoutes = require("./routes/Auth_Route");
const accountRoutes = require("./routes/Account_Route");
const categoryRoutes = require("./routes/Category_Route");
const transactionRoutes = require("./routes/Transaction_Route");
const summaryRoutes = require("./routes/Summary_Route");
const exportRoutes = require("./routes/Export_Route");
const importRoutes = require("./routes/Import_Route");

const app = express();
const PORT = process.env.PORT || 3000;

// create slip folder automatically
const slipDir = path.join(__dirname, "..", "slip");
if (!fs.existsSync(slipDir)) {
    fs.mkdirSync(slipDir, { recursive: true });
}

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(profanityMiddleware);

// static files
app.use("/slip", express.static(slipDir));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/import", importRoutes);

// homepage
app.get("/", (req, res) => {
    res.json({
        message: "Money+ Tracker API",
        status: "Running"
    });
});

// error handling
app.use((err, req, res, next) => {
    console.error(err);

    // json error
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({ error: "JSON error, please check your JSON format krub!" });
    }

    // file upload error
    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File size is too large, please upload a file smaller than 5MB" });
    }

    res.status(500).json({ error: "An error occurred on the server" });
});

// start server
async function startServer() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log("Server is running on PORT " + PORT);
        });
    } catch (error) {
        console.log("Failed to start server: " + error);
    }
}

startServer();
