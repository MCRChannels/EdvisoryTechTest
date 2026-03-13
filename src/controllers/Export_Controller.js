const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const xlsx = require("xlsx");

// export data to file
async function exportSummary(req, res) {
    try {
        const db = getDB();
        const userId = new ObjectId(req.userId);
        const format = req.query.format || "json";

        // get all transactions
        const transactions = await db.collection("transactions").aggregate([
            { $match: { userId: userId } },
            { $sort: { transactionDate: -1 } },
            {
                $lookup: {
                    from: "accounts",
                    localField: "accountId",
                    foreignField: "_id",
                    as: "account"
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "categoryId",
                    foreignField: "_id",
                    as: "category"
                }
            },
            {
                $addFields: {
                    accountName: { $arrayElemAt: ["$account.name", 0] },
                    categoryName: { $arrayElemAt: ["$category.name", 0] }
                }
            },
            {
                $project: { account: 0, category: 0, userId: 0 }
            }
        ]).toArray();

        // excel format
        if (format === "xlsx" || format === "excel") {
            const workbook = xlsx.utils.book_new();
            const worksheet = xlsx.utils.json_to_sheet(transactions);
            xlsx.utils.book_append_sheet(workbook, worksheet, "Transactions");
            
            const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
            
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", "attachment; filename=transactions.xlsx");
            return res.send(buffer);
        }

        // csv format
        if (format === "csv") {
            let csv = "Date,Type,Amount,Category,Account,Note\n";
            for (let i = 0; i < transactions.length; i++) {
                const tx = transactions[i];
                const date = new Date(tx.transactionDate).toLocaleDateString();
                const row = date + "," + tx.type + "," + tx.amount + "," + tx.categoryName + "," + tx.accountName + "," + (tx.note || "") + "\n";
                csv += row;
            }
            
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
            return res.send(csv);
        }

        // json format
        res.json({
            count: transactions.length,
            data: transactions
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "ส่งออกข้อมูลไม่สำเร็จ" });
    }
}

module.exports = { exportSummary };
