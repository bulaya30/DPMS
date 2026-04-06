// stockController.js
import db from "../db/db.js";
import inventoryController from "./inventoryController.js";

const collectionName = "stocks";

/* ============================
   HELPER FUNCTIONS
============================ */

async function validateBranchAndType(branchId, typeId) {
  const [branch, type] = await Promise.all([
    db.get("branches", "id", branchId),
    db.get("types", "id", typeId),
  ]);

  if (!branch) throw new Error("Branch not found");
  if (!branch.active) throw new Error("Cannot operate on inactive branch");

  if (!type) throw new Error("Type not found");
  if (!type.active) throw new Error("Cannot operate on inactive type");

  return { branch, type };
}

async function findStock(user, branchId, typeId, item, itemId) {
  const stocks = await getStoks(user, "branchId", branchId);

  return stocks.find(
    s =>
      s.item === item &&
      s.typeId === (typeId || null) &&
      s.itemId === itemId &&
      !s.deleted
  );
}


/* ============================
   GET LEDGERS
============================ */
async function getLedgers(user, field = null, value) {
  if(!user || !user.role) throw new Error("Unauthorized");

  const ledgers = await fetchLedgers(user, field, value)
  
  return (user.role === 'admin') ? ledgers : ledgers.filter(s => s.branchId === user.branchId);
}

/* ============================
   GET FETCHSTOCKS
============================ */
async function fetchLedgers(user, field = null, value = null) {
  
  let data = await db.get('stock_transactions', field, value);
  if (!data) return field === "id" ? null : [];

    // Normalize
    if (!Array.isArray(data)) data = [data];

    if (data.length === 0) return field === "id" ? null : [];
  let branches = [];
  if (user.role === "admin") {
    branches = await db.get("branches");
  } else {
    const branch = await db.get("branches", "id", user.branchId);
    branches = branch ? [branch] : [];
  }

  const types = await db.get("types");

  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  const typeMap = Object.fromEntries(types.map(t => [t.id, t.name]));

  return data.map(s => ({
    ...s,
    branchName: branchMap[s.branchId] || "Unknown branch",
    typeName: typeMap[s.typeId] || "Unknown type",
  }));
}
/* ============================
GET STOCKS
============================ */

async function getStoks(user, field = null, value = null) {
  if (!user || !user.role) throw new Error("Unauthorized");
  
  const stocks = await fetchStocks(user, field, value);
  
  return (user.role === "admin") ? stocks : stocks.filter(s => s.branchId === user.branchId);
}

/* ============================
   GET FETCHSTOCKS
============================ */
async function fetchStocks(user, field = null, value = null) {
  
  let data = await db.get(collectionName, field, value);
  if (!data) return field === "id" ? null : [];

    // Normalize
    if (!Array.isArray(data)) data = [data];

    if (data.length === 0) return field === "id" ? null : [];
  let branches = [];
  if (user.role === "admin") {
    branches = await db.get("branches");
  } else {
    const branch = await db.get("branches", "id", user.branchId);
    branches = branch ? [branch] : [];
  }

  const types = await db.get("types");

  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  const typeMap = Object.fromEntries(types.map(t => [t.id, t.name]));

  return data.map(s => ({
    ...s,
    branchName: branchMap[s.branchId] || "-",
    typeName: typeMap[s.typeId] || "-",
  }));
}

/* ============================
CORE STOCK MUTATION
============================ */
async function addStock(data) {
  if (!data) throw new Error("Invalid data");

  const { user, branchId, typeId, item, itemId, delta, reason = "New stock", field = null } = data;

  if (!user) throw new Error("Unauthorized");
  if (!branchId || !item || !itemId || typeof delta !== "number") {
    throw new Error("Missing required fields");
  }

  if (!["bird", "egg", "feed"].includes(item)) throw new Error("Invalid item");

  // typeId only required for bird & egg
  if (item !== "feed" && !typeId) throw new Error("Type required");

  if (item !== "feed") await validateBranchAndType(branchId, typeId);
  
  // Delegate all stock updates & inventory to syncStock
  return await syncStock({ user, branchId, typeId, item, itemId, delta, field, reason });
}

/* ============================
   SNAPSHOT SYNC
   ============================ */

   async function syncStock(data) {
  const {
    user,
    branchId,
    typeId,
    item,
    itemId,
    delta,
    field = null,
    reason = "New stock",
  } = data;
  if (!user || !branchId || !item || typeof delta !== "number") {
    throw new Error("Missing required fields");
  }
  
  if (!["bird", "egg", "feed"].includes(item)) {
    throw new Error("Invalid item");
  }
  
  if (item !== "feed" && !typeId) throw new Error("Type required");
  if (!itemId) throw new Error("itemId required");
  if (item !== "feed") await validateBranchAndType(branchId, typeId);
  if (field && !["quantityLost"].includes(field)) throw new Error("Invalid stock meta field");
  
  const stock = await findStock(user, branchId, typeId, item, itemId);
  
  let deltaAdded = 0;
  let deltaLost = 0;
  let deltaConsumed = 0;
  
  if (!stock) {
    // CREATE NEW STOCK
    if (delta < 0) throw new Error("Cannot reduce non-existing stock");
    
    deltaAdded = delta;
    
    const record = {
      branchId,
      typeId: typeId ?? null,
      item,
      itemId,
      quantity: delta,
      quantityLost: deltaLost,
      ...(item !== "feed" && { quantitySold: 0, }),
      ...(item === "feed" && { quantityConsumed: deltaConsumed }),
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
      active: true,
      date: new Date(),
    };
    
    const stockId = await db.add(collectionName, record);
    
    await inventoryController.makeInventory(
      {
        collection: item,
        branchId,
        typeId,
        itemId,
        deltaAdded,
        deltaLost,
        deltaConsumed,
      },
      new Date()
    );
    await db.update(
      item === 'bird' ? 'birds' :
      item === 'egg' ? 'eggs' : 
      'feeds', itemId, {quantity: delta}
    )
    return { created: true, id: stockId, ...record };
  }
  
  // ===== UPDATE EXISTING STOCK =====
  let newQty = Number(stock.quantity);
  let newLost = Number(stock.quantityLost || 0);
  let newConsumed = Number(stock.quantityConsumed || 0);
  
  if (!field) {
    newQty += delta;
    deltaAdded = newQty; // Only positive changes count as added
  } else if (field === "quantityLost") {
    newQty -= delta;
    newLost += delta;
    deltaLost = newLost;
  } else if(field === 'quantityConsumed') {
    newQty -= delta;
    newConsumed += delta;
    deltaConsumed = newConsumed;

  }

  if (newQty < 0) throw new Error("Stock cannot go below zero");
  if (newLost < 0) throw new Error("Quantity Lost cannot be negative");

  await db.update(collectionName, stock.id, {
    quantity: newQty,
    quantityLost: newLost,
    quantityConsumed: newConsumed,
    updatedAt: new Date(),
  });

  // ===== TRANSACTION LEDGER =====
  await db.add("stock_transactions", {
    branchId,
    typeId: typeId ?? null,
    item,
    itemId,
    delta,
    field: field || "quantity",
    reason,
    createdAt: new Date(),
    createdBy: user.uid,
    date: new Date(),
  });

  // ===== UPDATE INVENTORY =====
  await inventoryController.makeInventory(
    {
      collection: item,
      branchId,
      typeId,
      itemId,
      deltaAdded,
      deltaLost,
      deltaConsumed,
    },
    new Date()
  );
  await db.update(
      item === 'bird' ? 'birds' :
      item === 'egg' ? 'eggs' : 
      'feeds', itemId, {quantity: newQty}
    )
  return {
    updated: true,
    id: stock.id,
    quantity: newQty,
    quantityLost: newLost,
  };
}


/* ============================
   ABSOLUTE UPDATE
============================ */

async function updateStock({
  user,
  branchId,
  typeId,
  item,
  itemId,
  newQuantity,
  reason = "correction",
  field = null,
}) {
  const stock = await findStock(user, branchId, typeId, item, itemId);
  if (!stock) throw new Error("Stock not found");

  const target = Number(newQuantity);
  if (isNaN(target)) throw new Error("Invalid quantity");

  const delta = target - Number(stock.quantity);
  if (delta === 0) return { success: true };

  return addStock({
    user,
    branchId,
    typeId,
    item,
    itemId,
    delta,
    reason,
    field,
  });
}

/* ============================
   ADJUST STOCK
============================ */

async function adjustStock({
  user,
  branchId,
  typeId,
  item,
  itemId,
  delta,
  reason = "adjustment",
  field = null,
}) {
  if (typeof delta !== "number") throw new Error("Delta must be a valid number");

  return addStock({
    user,
    branchId,
    typeId,
    item,
    itemId,
    delta,
    reason,
    field,
  });
}

/* ============================
   DELETE STOCK
============================ */

async function deleteStock(stockId) {
  if (!stockId) throw new Error("Stock ID is required");

  const stock = await db.get(collectionName, "id", stockId);
  if (!stock) throw new Error("Stock not found");
  if (stock.deleted) throw new Error("Stock already deleted");

  await db.update(collectionName, stockId, {
    deleted: true,
    deletedAt: new Date(),
    updatedAt: new Date(),
  });

  return { success: true };
}

async function deactivateStock(data) {

    if (!data) throw new Error("Invalid data");
  const { user, itemId } = data;

  if(!user) throw new Error("No user authenticated");
  if(user.role !== "admin" && user.role !== "manager") throw new Error("Permission denied");

  const stock = await getStoks(user, "itemId", itemId);
  
  if (!stock) throw new Error("Stock not found");
  
  await db.update(collectionName, stock[0].id, {
    active: false,
    deletedAt: null,
    updatedAt: new Date(),
  });
  
  await inventoryController.deactivateInventory(data)


  return { success: true };

}

async function activateStock(data) {
  if (!data) throw new Error("Invalid data");
  const { user, itemId } = data;

  if(!user) throw new Error("No user authenticated");
  if(user.role !== "admin" && user.role !== "manager") throw new Error("Permission denied");

  const stock = await getStoks(user, "itemId", itemId);
  
  if (!stock) throw new Error("Stock not found");
  
  await db.update(collectionName, stock[0].id, {
    active: true,
    deletedAt: null,
    updatedAt: new Date(),
  });
  
  await inventoryController.activateInventory(data)


  return { success: true };
  
}

/* ============================
   PROCESS ROUTER
============================ */

const process = async payload => {
  if (!payload) throw new Error("Invalid payload");

  const { user, action, data, id } = payload;

  if (!user) throw new Error("No user authenticated");
  if (!["admin", "manager"].includes(user.role)) throw new Error("Unauthorized");

  switch (action) {
    case "add":
      return addStock({ user, ...data });

    case "update":
      return updateStock({ user, ...data });

    case "adjust":
      return adjustStock({ user, ...data });

    case "delete":
      return deleteStock(id);

    default:
      throw new Error("Unknown action");
  }
};

/* ============================
   EXPORT
============================ */

export default {
  getStoks,
  getLedgers,
  addStock,
  updateStock,
  adjustStock,
  deleteStock,
  deactivateStock,
  activateStock,
  process,
};
