const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const fs = require("fs");
const path = require("path");

// get all transactions
async function getTransactions(req, res) {
    try {
        const db = getDB();
        
        // pagination
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        let skip = (page - 1) * limit;

        const userId = new ObjectId(req.userId);
        const filter = { userId: userId };

        // filters
        if (req.query.type) {
            filter.type = req.query.type;
        }

        if (req.query.account_id) {
            filter.accountId = new ObjectId(req.query.account_id);
        }

        if (req.query.category_id) {
            filter.categoryId = new ObjectId(req.query.category_id);
        }

        // date range
        if (req.query.start_date || req.query.end_date) {
            filter.transactionDate = {};
            if (req.query.start_date) {
                filter.transactionDate.$gte = new Date(req.query.start_date);
            }
            if (req.query.end_date) {
                filter.transactionDate.$lte = new Date(req.query.end_date);
            }
        }

        // query and join
        const transactions = await db.collection("transactions").aggregate([
            { $match: filter },
            { $sort: { transactionDate: -1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: "accounts",
                    localField: "accountId",
                    foreignField: "_id",
                    as: "accountData",
                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "categoryId",
                    foreignField: "_id",
                    as: "categoryData",
                },
            },
            {
                $addFields: {
                    account: { $arrayElemAt: ["$accountData", 0] },
                    category: { $arrayElemAt: ["$categoryData", 0] },
                },
            },
            {
                $project: {
                    accountData: 0,
                    categoryData: 0
                }
            }
        ]).toArray();

        // count total
        const total = await db.collection("transactions").countDocuments(filter);

        res.json({
            data: transactions,
            pageInfo: {
                page: page,
                limit: limit,
                total: total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "ดึงข้อมูลรายการไม่สำเร็จ" });
    }
}

// create new
async function createTransaction(req, res) {
    try {
        const userId = new ObjectId(req.userId);
        const accountId = req.body.account_id;
        const categoryId = req.body.category_id;
        const type = req.body.type;
        const amount = req.body.amount;
        const note = req.body.note;
        const transactionDate = req.body.transaction_date;

        // validate
        if (!accountId || !categoryId || !type || !amount || !transactionDate) {
            return res.status(400).json({ error: "รบกวนกรอกข้อมูลที่จำเป็นให้ครบด้วยครับ" });
        }

        const db = getDB();

        // check existence
        const account = await db.collection("accounts").findOne({ _id: new ObjectId(accountId), userId: userId });
        const category = await db.collection("categories").findOne({ _id: new ObjectId(categoryId), userId: userId });

        if (!account) {
            return res.status(404).json({ error: "ไม่พบบัญชีที่ระบุ" });
        }
        if (!category) {
            return res.status(404).json({ error: "ไม่พบประเภทรายการที่ระบุ" });
        }

        // prepare data
        let slipPath = null;
        if (req.file) {
            slipPath = "/slip/" + req.file.filename;
        }

        const newTransaction = {
            userId: userId,
            accountId: new ObjectId(accountId),
            categoryId: new ObjectId(categoryId),
            type: type,
            amount: parseFloat(amount),
            note: note,
            slipImage: slipPath,
            transactionDate: new Date(transactionDate),
            createdAt: new Date()
        };

        const result = await db.collection("transactions").insertOne(newTransaction);

        res.status(201).json({
            message: "เพิ่มรายการเรียบร้อยแล้ว",
            transaction: result
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "เพิ่มรายการไม่ได้" });
    }
}

// delete transaction
async function deleteTransaction(req, res) {
    try {
        const db = getDB();
        const transactionId = new ObjectId(req.params.id);
        const userId = new ObjectId(req.userId);

        const transaction = await db.collection("transactions").findOne({
            _id: transactionId,
            userId: userId
        });

        if (!transaction) {
            return res.status(404).json({ error: "ไม่พบรายการที่ต้องการลบ" });
        }

        // delete slip file
        if (transaction.slipImage) {
            const fileName = transaction.slipImage.replace("/slip/", "");
            const filePath = path.join(__dirname, "..", "..", "slip", fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await db.collection("transactions").deleteOne({ _id: transactionId });

        res.json({ message: "ลบรายการเรียบร้อย" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "ลบรายการไม่สำเร็จ" });
    }
}

// update transaction
async function updateTransaction(req, res) {
    try {
        const db = getDB();
        const userId = new ObjectId(req.userId);
        const transactionId = new ObjectId(req.params.id);

        const currentTx = await db.collection("transactions").findOne({ _id: transactionId, userId: userId });
        if (!currentTx) {
            return res.status(404).json({ error: "ไม่พบรายการนี้" });
        }

        const updateData = {};
        if (req.body.account_id) updateData.accountId = new ObjectId(req.body.account_id);
        if (req.body.category_id) updateData.categoryId = new ObjectId(req.body.category_id);
        if (req.body.type) updateData.type = req.body.type;
        if (req.body.amount) updateData.amount = parseFloat(req.body.amount);
        if (req.body.note !== undefined) updateData.note = req.body.note;
        if (req.body.transaction_date) updateData.transactionDate = new Date(req.body.transaction_date);

        // if new file uploaded
        if (req.file) {
            // delete old file
            if (currentTx.slipImage) {
                const oldFileName = currentTx.slipImage.replace("/slip/", "");
                const oldPath = path.join(__dirname, "..", "..", "slip", oldFileName);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            updateData.slipImage = "/slip/" + req.file.filename;
        }

        const result = await db.collection("transactions").findOneAndUpdate(
            { _id: transactionId, userId: userId },
            { $set: updateData },
            { returnDocument: "after" }
        );

        res.json({
            message: "อัปเดตรายการเรียบร้อย",
            transaction: result
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "แก้ไขรายการไม่สำเร็จ" });
    }
}

module.exports = { getTransactions, createTransaction, deleteTransaction, updateTransaction };
