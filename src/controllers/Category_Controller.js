const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

// get all categories
async function getCategories(req, res) {
    try {
        const db = getDB();
        const userId = new ObjectId(req.userId);
        const filter = { userId: userId };

        // filter by type
        if (req.query.type) {
            filter.type = req.query.type;
        }

        const categories = await db.collection("categories")
            .find(filter)
            .sort({ type: 1, name: 1 })
            .toArray();

        res.json({
            data: categories
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "ดึงข้อมูลหมวดหมู่ไม่ได้" });
    }
}

// create category
async function createCategory(req, res) {
    try {
        const name = req.body.name;
        const type = req.body.type;

        if (!name || !type) {
            return res.status(400).json({ error: "ต้องระบุชื่อและประเภท (income/expense)" });
        }

        const db = getDB();
        const userId = new ObjectId(req.userId);

        const newCategory = {
            userId: userId,
            name: name.trim(),
            type: type,
            createdAt: new Date()
        };

        const result = await db.collection("categories").insertOne(newCategory);

        res.status(201).json({
            message: "เพิ่มหมวดหมู่เรียบร้อย",
            category: {
                _id: result.insertedId,
                name: name.trim(),
                type: type
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "เพิ่มหมวดหมู่ไม่สำเร็จ" });
    }
}

// delete category
async function deleteCategory(req, res) {
    try {
        const db = getDB();
        const categoryId = new ObjectId(req.params.id);
        const userId = new ObjectId(req.userId);

        // existence check
        const category = await db.collection("categories").findOne({ _id: categoryId, userId: userId });
        if (!category) {
            return res.status(404).json({ error: "ไม่พบหมวดหมู่นี้" });
        }

        // check if used in transactions
        const count = await db.collection("transactions").countDocuments({ categoryId: categoryId });
        if (count > 0) {
            return res.status(400).json({ error: "ลบไม่ได้นะ เพราะมี " + count + " รายการที่ใช้หมวดหมู่นี้อยู่" });
        }

        await db.collection("categories").deleteOne({ _id: categoryId });

        res.json({ message: "ลบหมวดหมู่ " + category.name + " แล้ว" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "ลบไม่สำเร็จ" });
    }
}

// update category
async function updateCategory(req, res) {
    try {
        const db = getDB();
        const categoryId = new ObjectId(req.params.id);
        const userId = new ObjectId(req.userId);

        const updateData = {};
        if (req.body.name) updateData.name = req.body.name.trim();
        if (req.body.type) updateData.type = req.body.type;

        const result = await db.collection("categories").findOneAndUpdate(
            { _id: categoryId, userId: userId },
            { $set: updateData },
            { returnDocument: "after" }
        );

        if (!result) {
            return res.status(404).json({ error: `ไม่พบประเภทที่คุณต้องการแก้ไข หรือ ID Category ไม่ถูกต้องครับ` });
        }

        res.json({
            message: `แก้ไขประเภท ${result.name.trim()} สำเร็จครับ`,
            category: result,
        });
    } catch (err) {
        console.error("Update category error:", err);
        res.status(500).json({ error: `เกิดข้อผิดพลาดในระบบ: ${err.message}` });
    }
}

module.exports = { getCategories, createCategory, deleteCategory, updateCategory };
