const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const xlsx = require("xlsx");
const fs = require("fs");

// import from file
async function importTransactions(req, res) {
    try {
        // check file
        if (!req.file) {
            return res.status(400).json({ error: "กรุณาแนบไฟล์ด้วยนะ" });
        }

        const db = getDB();
        const userId = new ObjectId(req.userId);
        const filePath = req.file.path;

        // read file
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // cleanup
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        if (rows.length === 0) {
            return res.status(400).json({ error: "ในไฟล์ไม่มีข้อมูลเลย" });
        }

        let successCount = 0;
        let failCount = 0;

        // process rows
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // validate
                const amount = parseFloat(row.amount);
                const type = row.type;
                const accName = row.account_name;
                const catName = row.category_name;

                if (!amount || !type || !accName || !catName) {
                    failCount++;
                    continue;
                }

                // find account
                let account = await db.collection("accounts").findOne({
                    userId: userId,
                    name: accName.trim()
                });
                
                if (!account) {
                    const resAcc = await db.collection("accounts").insertOne({
                        userId: userId,
                        name: accName.trim(),
                        createdAt: new Date()
                    });
                    account = { _id: resAcc.insertedId };
                }

                // find category
                let category = await db.collection("categories").findOne({
                    userId: userId,
                    name: catName.trim()
                });

                if (!category) {
                    const resCat = await db.collection("categories").insertOne({
                        userId: userId,
                        name: catName.trim(),
                        type: type,
                        createdAt: new Date()
                    });
                    category = { _id: resCat.insertedId };
                }

                // save transaction
                await db.collection("transactions").insertOne({
                    userId: userId,
                    accountId: account._id,
                    categoryId: category._id,
                    type: type,
                    amount: amount,
                    note: row.note || "",
                    transactionDate: row.date ? new Date(row.date) : new Date(),
                    createdAt: new Date()
                });

                successCount++;
            } catch (err) {
                console.log("Error indexing row " + i + ": " + err);
                failCount++;
            }
        }

        res.json({
            message: "นำเข้าข้อมูลเสร็จสิ้น",
            total: rows.length,
            success: successCount,
            fail: failCount
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "ระบบนำเข้ามีปัญหา" });
    }
}

module.exports = { importTransactions };
