// backend/routes/branches.js
const express = require("express");
const router = express.Router();
const { db } = require("../firebase");

// GET all branches
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("branches").get();
    const branches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add a new Branch
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const docRef = await db.collection("branches").add(data);
    res.json({ id: docRef.id, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update a Branch
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection("branches").doc(id).update(req.body);
    res.json({ id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a Branch
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection("branches").doc(id).delete();
    res.json({ message: "Branch deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
