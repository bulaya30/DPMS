import db from "../db/db.js";
import stockController from "./stockController.js";
const collectionName = "feeds";

async function getFeeds(user, field = null, value = null) {
  if (user.role === 'admin') return await fetchFeeds(user, field, value);
  const feeds = await fetchFeeds(user, 'branchId', user.branchId)
  return feeds.filter(f => f.active);
}

// GET all feeds
async function fetchFeeds(user, field = "", value = "") {
   
  try {
    const data = await db.get(collectionName, field || null, value || null);
    if (!data) return field === "id" ? null : [];

    let rows = data;
    // Normalize
    if (!Array.isArray(rows)) rows = [rows];

    if (rows.length === 0) return field === "id" ? null : [];
      // ---------------- LOAD BRANCHES & TYPES ---------------- //
      let branches = [];
      if (user.role === "admin") {
        branches = await db.get("branches");
      } else {
      const branch = await db.get("branches", "id", user.branchId);
      branches = branch ? [branch] : [];
    }
    const types = await db.get('types');
    
    const feeds = rows.map(feed => {
      const branch = branches.find(b => b.id === feed.branchId);
      return {
        ...feed,
        branchName: branch?.name 
      };
    });  
    return feeds;

  } catch (error) {
    console.error("Error fetching feeds:", error);
    throw error
  }
}


async function addFeed(user, data) {
  if (!data.branchId || data.quantity === undefined)
    throw new Error("Branch and quantity are required");
  
  if (!["admin", "manager"].includes(user.role))
    throw new Error("Permission denied");
  
  if (user.role === "manager" && data.branchId !== user.branchId)
    throw new Error("Managers can only add feed to their branch");
  
  const quantity = Number(data.quantity);
  if (isNaN(quantity) || quantity <= 0)
    throw new Error("Invalid quantity");
  
  const feed = {
    name: data.name,
    branchId: data.branchId,
    quantity: 0,
    createdAt: new Date(),
    active: true,
    date: new Date(),
    unit: data.unit
  };
  
  const docRef = await db.add(collectionName, feed);
  await stockController.addStock({
    user,
    branchId: data.branchId,
    item: "feed",
    itemId: docRef.id,
    delta: quantity,
    reason: "New Feed",
  });

  
  return { id: docRef.id, ...feed };
}


  /* ======================================================
   CONSUME FEED (STOCK → INVENTORY)
  ====================================================== */
  async function consumeFeed(user, data) {
  if (!data.branchId || data.quantity === undefined)
    throw new Error("Branch and quantity are required");

  if (!["admin", "manager"].includes(user.role))
    throw new Error("Permission denied");

  if (user.role === "manager" && data.branchId !== user.branchId)
    throw new Error("Managers can only consume feed from their branch");

  const quantity = Number(data.quantity);
  if (isNaN(quantity) || quantity <= 0)
    throw new Error("Invalid quantity");

  await stockController.adjustStock({
    user,
    branchId: data.branchId,
    item: "feed",
    quantity: -quantity,
    reason: "Feed consumed",
  });

  return { success: true, consumed: quantity };
}


/* ======================================================
   UPDATE FEED STOCK (CORRECTION → INVENTORY AUTO-CALC)
  ====================================================== */
  async function updateFeed(user, id, updates) {
  if (!id || !updates)
    throw new Error("Invalid feed data");

  if (!["admin", "manager"].includes(user.role))
    throw new Error("Permission denied");
  const feed = await getFeeds(user, 'id', id);
  const existing = feed[0];

  if (!existing) throw new Error("Feed not found");
  const quantityChanged =
    updates.quantity !== undefined &&
    Number(updates.quantity) !== Number(existing.quantity);
  
  const payload = {
    branchId: existing.branchId,
    name: updates.name,
    branchId: updates.branchId,
    unit: updates.unit
  };

  // await db.update(collectionName, id, payload);


  if (quantityChanged) {
    const delta =
      Number(updates.quantity) - Number(existing.quantity);
    await stockController.addStock({
      user,
      branchId: existing.branchId,
      item: "feed",
      itemId: existing.id,
      delta,
      reason: "Feed quantity corrected",
    });
  }
  return { success: true };
}



async function deleteFeed(user, id) {
  if (!id) throw new Error("Invalid feed id");

  if (!["admin", "manager"].includes(user.role))
    throw new Error("Permission denied");

  const feed = await getFeeds(user, 'id', id);
  const existing = feed[0];

  if (!existing) throw new Error("Feed not found");

  await db.update(collectionName, id, {
    active: false,
    deletedAt: new Date(),
  });

  await stockController.syncStock({
    user,
    branchId: existing.branchId,
    item: "feed",
    delta: -existing.quantity,
    reason: "Feed deleted",
  });

  return { success: true };
}


  async function process(payload) {
  if (!payload) throw new Error("Invalid data");

  const { data, action, user, id } = payload;

  if (!["admin", "manager"].includes(user.role))
    throw new Error("Only admin or manager can manage feeds");

  switch (action) {
    case "add":
      return addFeed(user, data);

    case "consume":
      return consumeFeed(user, data);

    case "update":
      return updateFeed(user, id, data);

    case "delete":
      return deleteFeed(user, id);

    default:
      throw new Error("Unknown action");
  }
}


  export default {
    getFeeds,
    process
  };
