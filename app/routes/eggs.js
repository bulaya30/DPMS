// backend/routes/eggs.js
const express = require("express");
const router = express.Router();
const { db } = require("../firebase");

// GET all eggs
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("eggs").get();
    const eggs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(eggs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add a new Egg
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const docRef = await db.collection("eggs").add(data);
    res.json({ id: docRef.id, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update a Egg
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection("eggs").doc(id).update(req.body);
    res.json({ id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a Egg
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection("eggs").doc(id).delete();
    res.json({ message: "Egg deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
