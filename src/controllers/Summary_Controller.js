const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

// get income-expense summary
async function getSummary(req, res) {
    try {
        const db = getDB();
        const userId = new ObjectId(req.userId);
        const filter = { userId: userId };

        // filter by account
        if (req.query.account_id) {
            filter.accountId = new ObjectId(req.query.account_id);
        }

        // filter by category
        if (req.query.category_id) {
            filter.categoryId = new ObjectId(req.query.category_id);
        }

        // filter by date range
        if (req.query.start_date || req.query.end_date) {
            filter.transactionDate = {};
            if (req.query.start_date) {
                filter.transactionDate.$gte = new Date(req.query.start_date);
            }
            if (req.query.end_date) {
                filter.transactionDate.$lte = new Date(req.query.end_date);
            }
        }

        // filter by period (day/month/year)
        if (req.query.period) {
            const now = new Date();
            const year = parseInt(req.query.year) || now.getFullYear();
            const month = parseInt(req.query.month) || now.getMonth() + 1;

            if (req.query.period === "day") {
                const day = parseInt(req.query.day) || now.getDate();
                filter.transactionDate = {
                    $gte: new Date(year, month - 1, day, 0, 0, 0),
                    $lte: new Date(year, month - 1, day, 23, 59, 59, 999)
                };
            } else if (req.query.period === "month") {
                filter.transactionDate = {
                    $gte: new Date(year, month - 1, 1),
                    $lte: new Date(year, month, 0, 23, 59, 59, 999)
                };
            } else if (req.query.period === "year") {
                filter.transactionDate = {
                    $gte: new Date(year, 0, 1),
                    $lte: new Date(year, 11, 31, 23, 59, 59, 999)
                };
            }
        }

        // 1. calculate total income/expense
        const summaryData = await db.collection("transactions").aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$type",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        let totalIncome = 0;
        let totalExpense = 0;
        let incomeCount = 0;
        let expenseCount = 0;

        for (let i = 0; i < summaryData.length; i++) {
            const item = summaryData[i];
            if (item._id === "income") {
                totalIncome = item.total;
                incomeCount = item.count;
            } else if (item._id === "expense") {
                totalExpense = item.total;
                expenseCount = item.count;
            }
        }

        // 2. summary by category
        const byCategory = await db.collection("transactions").aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$categoryId",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                    type: { $first: "$type" }
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category"
                }
            },
            {
                $project: {
                    categoryName: { $arrayElemAt: ["$category.name", 0] },
                    total: 1,
                    count: 1,
                    type: 1
                }
            },
            { $sort: { total: -1 } }
        ]).toArray();

        // 3. summary by account
        const byAccount = await db.collection("transactions").aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$accountId",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                    type: { $first: "$type" }
                }
            },
            {
                $lookup: {
                    from: "accounts",
                    localField: "_id",
                    foreignField: "_id",
                    as: "account"
                }
            },
            {
                $project: {
                    accountName: { $arrayElemAt: ["$account.name", 0] },
                    total: 1,
                    count: 1,
                    type: 1
                }
            },
            { $sort: { total: -1 } }
        ]).toArray();

        // response
        res.json({
            summary: {
                totalIncome: totalIncome,
                totalExpense: totalExpense,
                balance: totalIncome - totalExpense,
                incomeCount: incomeCount,
                expenseCount: expenseCount,
                totalTransactions: incomeCount + expenseCount
            },
            byCategory: byCategory,
            byAccount: byAccount
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "ดึงข้อมูลสรุปไม่ได้" });
    }
}

module.exports = { getSummary };
