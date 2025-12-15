const express = require("express");
const router = express.Router();
const { db } = require("../server");

// GET all feeds
router.get("/", async (req, res) => {
  const snapshot = await db.collection("feeds").get();
  const feeds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(feeds);
});

// POST add feed
router.post("/", async (req, res) => {
  const { name, quantity, branchId } = req.body;
  const docRef = await db.collection("feeds").add({ name, quantity, branchId, createdAt: new Date() });
  res.status(201).json({ id: docRef.id, name, quantity, branchId });
});

module.exports = router;
