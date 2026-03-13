const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

// get all accounts
async function getAccounts(req, res) {
    try {
        const db = getDB();
        
        // pagination
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        let skip = (page - 1) * limit;

        const userId = new ObjectId(req.userId);
        const filter = { userId: userId };

        // get data
        const accounts = await db.collection("accounts")
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await db.collection("accounts").countDocuments(filter);

        // response
        res.json({
            data: accounts,
            pageInfo: {
                page: page,
                limit: limit,
                total: total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "ดึงข้อมูลบัญชีไม่ได้" });
    }
}

// create account
async function createAccount(req, res) {
    try {
        const name = req.body.name;

        if (!name || name.trim() === "") {
            return res.status(400).json({ error: "กรุณาใส่ชื่อบัญชีด้วยครับ" });
        }

        const db = getDB();
        const userId = new ObjectId(req.userId);

        // save data
        const newAccount = {
            userId: userId,
            name: name.trim(),
            createdAt: new Date()
        };

        const result = await db.collection("accounts").insertOne(newAccount);

        res.status(201).json({
            message: "เพิ่มบัญชีเรียบร้อยแล้ว",
            account: {
                _id: result.insertedId,
                name: name.trim()
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "เพิ่มบัญชีไม่สำเร็จ" });
    }
}

// delete account
async function deleteAccount(req, res) {
    try {
        const db = getDB();
        const accountId = new ObjectId(req.params.id);
        const userId = new ObjectId(req.userId);

        // check owner
        const account = await db.collection("accounts").findOne({
            _id: accountId,
            userId: userId
        });

        if (!account) {
            return res.status(404).json({ error: "ไม่พบบัญชีที่ต้องการลบ" });
        }

        // check transactions
        const checkTx = await db.collection("transactions").countDocuments({ accountId: accountId });
        if (checkTx > 0) {
            return res.status(400).json({
                error: "ลบไม่ได้นะ เพราะมีรายการใช้จ่ายค้างอยู่ในบัญชีนี้ " + checkTx + " รายการ"
            });
        }

        // delete
        await db.collection("accounts").deleteOne({ _id: accountId });

        res.json({ message: "ลบบัญชี " + account.name + " ออกแล้ว" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "ลบบัญชีไม่ได้" });
    }
}

// update account
async function updateAccount(req, res) {
    try {
        const name = req.body.name;
        if (!name || name.trim() === "") {
            return res.status(400).json({ error: "ต้องระบุชื่อใหม่ด้วยครับ" });
        }

        const db = getDB();
        const accountId = new ObjectId(req.params.id);
        const userId = new ObjectId(req.userId);

        // update
        const result = await db.collection("accounts").findOneAndUpdate(
            { _id: accountId, userId: userId },
            { $set: { name: name.trim() } },
            { returnDocument: "after" }
        );

        if (!result) {
            return res.status(404).json({ error: "ไม่พบบัญชีนี้" });
        }

        res.json({
            message: "แก้ไขชื่อบัญชีเรียบร้อย",
            account: result
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "แก้ไขข้อมูลไม่สำเร็จ" });
    }
}

module.exports = { getAccounts, createAccount, deleteAccount, updateAccount };
