const express = require("express");
const router = express.Router();
const { db } = require("../server");

// GET all birds
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("birds").get();
    const birds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(birds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add a new bird
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    if (!data.quantity || !data.category || !data.age || !data.branchId) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const docRef = await db.collection("birds").add(data);
    res.status(201).json({ id: docRef.id, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
