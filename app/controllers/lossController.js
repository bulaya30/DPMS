import db from "../db/db.js";
import stockController from "./stockController.js";
import birdController from "./birdController.js";
import eggController from "./eggController.js";
import feedController from "./feedController.js";

const collectionName = "losses";



function toJSDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return new Date(timestamp);
}
function normalizeToArray(data) {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    // Keep only numeric keys: "0", "1", "2"...
    return Object.keys(data)
      .filter(k => !isNaN(k))
      .map(k => data[k]);
  }

  return [];
}
function findByDate(data) {
  const list = normalizeToArray(data);
  if (!list.length) return null;

  const today = new Date();

  return list.find(e => {
    const date = toJSDate(e.date)
    return date.toDateString() === today.toDateString()
  });
}

async function validateBranchAndType(branchId, typeId) {
  const [branch, type] = await Promise.all([
    db.get("branches", "id", branchId),
    db.get("types", "id", typeId),
  ]);

  if (!branch) throw new Error("Unknown branch");
  if (!type) throw new Error("Unknown type");
  if (!branch.active) throw new Error("Cannot add losses to an inactive branch");

  return { branch, type };
}

async function getLosses(user, field = null, value = null) {
  try {
    if (!user || !user.role) throw new Error("Unauthorized");
    const data = await fetchLosses(user, field, value);
    if(user.role === 'admin') return data;

    return data.filter(e => e.branchId === user.branchId);
  } catch (error) {
    throw new Error(error);
    
  }
}

/* ================= GET LOSSES ================= */
async function fetchLosses(user, field = "", value = "") {
  try {
    let data = await db.get(collectionName, field, value);

    if (!data) return field === "id" ? null : [];

    // Normalize
    if (!Array.isArray(data)) data = [data];

    if (data.length === 0) return field === "id" ? null : [];

    /* ---------- LOAD BRANCHES ---------- */
    let branches = [];
    if (user.role === "admin") {
      branches = await db.get("branches");
    } else {
      const branch = await db.get("branches", "id", user.branchId);
      branches = branch ? [branch] : [];
    }

    const types = await db.get("types");

    return data.map(loss => {
      const branch = branches.find(b => b.id === loss.branchId);
      const type = types.find(t => t.id === loss.typeId);

      return {
        ...loss,
        branchName: branch?.name || "Unknown",
        typeName: type?.name || "Unknown",
      };
    });

  } catch (err) {
    console.error("Error fetching losses:", err);
    return field === "id" ? null : [];
  }
}


/* ================= ADD LOSS ================= */
async function addLoss(user, loss) {
  if (!loss) throw new Error("Invalid data");

  const quantity = Number(loss.quantity);
  if (isNaN(quantity) || quantity <= 0)
    throw new Error("Invalid quantity");

  if (!["admin", "manager"].includes(user.role))
    throw new Error("Permission denied");

  if (user.role === "manager" && loss.branchId !== user.branchId)
    throw new Error("Managers can only add losses to their branch");

  if (!["bird", "egg", "feed"].includes(loss.item))
    throw new Error("Invalid loss item");

  if (["bird", "egg"].includes(loss.item)) {
    if (!loss.typeId)
      throw new Error("Type required for bird and egg losses");

    await validateBranchAndType(loss.branchId, loss.typeId);
  }

  let stockBatch = [];

  if (loss.item === "bird") {
    stockBatch = await birdController.getBirds(user, "id", loss.itemId);
  } else if (loss.item === "egg") {
    stockBatch = await eggController.getEggs(user, "id", loss.itemId);
  } else {
    stockBatch = await feedController.getFeeds(user, "id", loss.itemId);
  }

  if (!stockBatch || stockBatch.length === 0)
    throw new Error("No stock available for this item");

  const existing = stockBatch[0];

  if (Number(existing.quantity) < quantity) {
    throw new Error(
      `Loss quantity (${quantity}) exceeds available stock (${existing.quantity})`
    );
  }

  const existingLosses = await getLosses(user, "itemId", existing.id);
  const today = new Date();

  // 🔁 FIND TODAY'S LOSS (if any)
 const todayLoss = findByDate(existingLosses);
  // return ['Okay', todayLoss]
  // 🔁 UPDATE TODAY'S LOSS
  if (todayLoss) {
    const updatedQty = Number(todayLoss.quantity) + quantity;

    if (updatedQty > Number(existing.quantity)) {
      throw new Error(
        `Total loss (${updatedQty}) exceeds available stock (${existing.quantity})`
      );
    }

    const updated = await updateLoss(user, todayLoss.id, {
      ...todayLoss,
      quantity: updatedQty,
      reason: loss.reason,
    });

    await stockController.addStock({
      user,
      branchId: loss.branchId,
      typeId: loss.typeId ?? null,
      item: loss.item,
      itemId: existing.id,
      delta: quantity,
      reason: loss.reason,
      field: "quantityLost",
    });

    return updated;
  }

  // 🆕 CREATE NEW LOSS (new day)
  const data = {
    branchId: existing.branchId,
    item: loss.item,
    typeId: existing.typeId ?? null,
    itemId: existing.id,
    date: today,
    quantity,
    reason: loss.reason,
    createdAt: today,
    date: new Date(),
  };

  const docRef = await db.add("losses", data);

  await stockController.addStock({
    user,
    branchId: loss.branchId,
    typeId: loss.typeId ?? null,
    item: loss.item,
    itemId: existing.id,
    delta: quantity,
    reason: loss.reason,
    field: "quantityLost",
  });

  return { id: docRef.id, ...data };
}



/* ================= UPDATE LOSS ================= */
async function updateLoss(user, id, updates) {
  if (!id || !updates) throw new Error("Invalid loss data");
  if (!["admin", "manager"].includes(user.role))
    throw new Error("Permission denied");

  // Fetch existing loss
  const existing = await getLosses(user, "id", id);
  if (!existing) throw new Error("Loss not found");
  
  if (user.role === "manager" && existing.branchId !== user.branchId)
    throw new Error("Managers can only update losses from their branch");
  
  const oldQty = Number(existing[0].quantity);
  const newQty =
  updates.quantity !== undefined
  ? Number(updates.quantity)
  : oldQty;
  
  if (isNaN(newQty) || newQty <= 0)
    throw new Error("Invalid quantity");
  
  // Fetch stock batch AFTER validating loss
  let stockBatch = [];
  
  if (existing[0].item === "bird") {
    stockBatch = await birdController.getBirds(user, "id", existing[0].itemId);
  } else if (existing[0].item === "egg") {
    stockBatch = await eggController.getEggs(user, "id", existing[0].itemId);
  } else {
    stockBatch = await feedController.getFeeds(user, "id", existing[0].itemId);
  }
  
  if (!stockBatch)
    throw new Error("No stock available for this item");
  
  const existingItem = stockBatch[0];
  
  // Correct stock validation formula
  const availableStock =
  Number(existingItem.quantity) + oldQty;
  
  if (newQty > availableStock) {
    throw new Error(
      `Loss quantity (${newQty}) exceeds available stock (${availableStock})`
    );
  }
   
  const updatedData = {
    // ...existing[0],
    quantity: newQty,
    reason: updates.reason || existing[0].reason,
    updatedAt: new Date(),
  };
  
  await db.update("losses", id, updatedData);
  const delta = newQty - oldQty;
  const stockData = {
      user,
      branchId: existing[0].branchId,
      typeId: existing[0].typeId ?? null,
      item: existing[0].item,
      itemId: existing[0].itemId,
      delta,
      reason: updates.reason || existing[0].reason,
      field: "quantityLost",
  };
  await stockController.addStock(stockData);
  

  return updatedData;
}



/* ================= DELETE LOSS ================= */
async function deleteLoss(user, id) {
  if (!id) throw new Error("Invalid loss id");

  if (!["admin", "manager"].includes(user.role))
    throw new Error("Permission denied");

  const loss = await getLosses(user, 'id', id);
  const existing = loss[0];

  if (!existing) throw new Error("Loss not found");

  if (user.role === "manager" && existing.branchId !== user.branchId)
    throw new Error("Managers can only delete losses from their branch");

  /* Soft delete */
  await db.update("losses", id, {
    active: false,
    deletedAt: new Date(),
  });

  /* Restore stock */
  await stockController.adjustStock({
    user,
    branchId: existing.branchId,
    typeId: existing.typeId ?? null,
    item: existing.item,       // bird | egg | feed
    itemId: id,
    delta: existing.quantity,  // RESTORE stock
    reason: "Loss deleted (reverted)",
  });

  return { success: true };
}



/* ================= PROCESS ================= */
async function process(payload) {
  if (!payload) throw new Error("Invalid data");
  const {data, action, user, id} = payload;
  if (!user) throw new Error("No user authenticated");
  switch (action) {
    case "add":
      return addLoss(user, data);
      
      case "update":
      // return data;
      return updateLoss(user, id, data);

    case "delete":
      return deleteLoss(user, id);

    default:
      throw new Error("Unknown action");
  }
}

/* ================= EXPORT ================= */
export default {
  getLosses,
  updateLoss,
  process,
};
