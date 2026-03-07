// backend/routes/categories.js
const express = require("express");
const router = express.Router();
const { db } = require("../server");

// GET all categories
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("categories").get();
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add a new Category
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.location) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const docRef = await db.collection("categories").add(data);
    res.json({ id: docRef.id, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update a Category
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection("categories").doc(id).update(req.body);
    res.json({ id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a Category
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection("categories").doc(id).delete();
    res.json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
