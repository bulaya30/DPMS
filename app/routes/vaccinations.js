// backend/routes/vaccinations.js
const express = require("express");
const router = express.Router();
const { db } = require("../firebase");

// GET all vaccinations
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("vaccinations").get();
    const vaccinations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(vaccinations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add a new Vaccination
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const docRef = await db.collection("vaccinations").add(data);
    res.json({ id: docRef.id, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update a Vaccination
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection("vaccinations").doc(id).update(req.body);
    res.json({ id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a Vaccination
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection("vaccinations").doc(id).delete();
    res.json({ message: "Vaccination deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
