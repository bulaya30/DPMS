
import db from "../db/db.js";

const collectionName = "inventories";
function toJSDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return new Date(timestamp);
}



async function getInventories(user, field = null, value = null) {
  if (user.role === 'admin') return await fetchInventories(field, value);
 return await fetchInventories('branchId', user.branchId)
}

/* ======================================================
   GET INVENTORY (WITH BRANCH & TYPE NAMES)
====================================================== */
async function fetchInventories(field = '', value = '') {
  try {
    const data = await db.get(collectionName, field || null, value || null);

    if (!data) return field === "id" ? null : [];

    let rows = data;
    // Normalize
    if (!Array.isArray(rows)) rows = [rows];

    if (rows.length === 0) return field === "id" ? null : [];

    /* ---------- Normalize to array ---------- */
    const inventories = field === 'id' ? [{ ...rows }] : rows.map(d => ({ ...d }));

    /* ---------- Collect IDs ---------- */
    const branchIds = new Set();
    const typeIds = new Set();

    inventories.forEach(inv => {
      if (inv.branchId) branchIds.add(inv.branchId);
      if (inv.typeId) typeIds.add(inv.typeId);
    });

    /* ---------- Fetch related data ---------- */
    const [branches, types] = await Promise.all([
      branchIds.size ? db.get("branches") : [],
      typeIds.size ? db.get("types") : []
    ]);

    /* ---------- Build lookup maps ---------- */
    const branchMap = {};
    branches.forEach(b => {
      branchMap[b.id] = b.name;
    });

    const typeMap = {};
    types.forEach(t => {
      typeMap[t.id] = t.name;
    });

    /* ---------- Map names ---------- */
    const result = inventories.map(inv => ({
      ...inv,
      branchName: branchMap[inv.branchId] || null,
      ...(inv.typeId && { typeName: typeMap[inv.typeId] || null })
    }));

    return field === 'id' ? result[0] : result;

  } catch (error) {
    throw new Error(error);
  }
}

async function makeInventory(item, date = new Date()) {
  const baseDate = date ? toJSDate(date) : new Date();
  if (!baseDate) throw new Error("Invalid date provided");

  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const prevDate = new Date(start);
  prevDate.setDate(prevDate.getDate() - 1);
  
  /* ---------- Validate ---------- */
  if (!["bird", "egg", "feed"].includes(item.collection))
    throw new Error("Invalid item type");

  if (!item.branchId)
    throw new Error("Branch ID is required");

  if (item.collection !== "feed" && !item.typeId)
    throw new Error("Type ID is required");

  /* ---------- Check existing inventory (TODAY) ---------- */
  const todaysInventories = await getInventories("itemId", item.itemId);
  const existing = todaysInventories.find(i =>
    i.branchId === item.branchId &&
    i.item === item.collection &&
    (item.collection === "feed" || i.typeId === item.typeId) &&
    toJSDate(i.date) >= start &&
    toJSDate(i.date) < end
  );

  /* ---------- Opening stock ---------- */
  let openingStock = 0;
  if (existing) {
    openingStock = Number(existing.openingStock || 0);
  } else {
    // Look for previous day
    const prevInventories = await getInventories("date", prevDate);
    const prev = prevInventories.find(i =>
      i.itemId === item.itemId &&
      i.branchId === item.branchId &&
      (item.collection === "feed" || i.typeId === item.typeId)
    );
    openingStock = prev ? Number(prev.closingStock || 0) : 0;
  }

  /* ---------- Quantity sold ---------- */
  let quantitySold = 0;
  if (item.collection !== "feed") {
    const sales = await db.get("sales", "itemId", item.itemId);
    const salesArray = Array.isArray(sales) ? sales : (sales ? [sales] : []);
    quantitySold = salesArray
      .filter(s =>
        s.branchId === item.branchId &&
        (item.collection === "feed" || s.typeId === item.typeId) &&
        toJSDate(s.date) >= start &&
        toJSDate(s.date) < end
      )
      .reduce((sum, s) => sum + Number(s.quantity || 0), 0);
  }

  /* ---------- Quantity added & lost ---------- */
  const quantityAdded = item.deltaAdded > 0 ? item.deltaAdded : 0;
  const quantityLost = item.deltaLost > 0 ? item.deltaLost : 0;

  /* ---------- Feed-specific consumed ---------- */
  const quantityConsumed = item.collection === "feed" ? item.deltaConsumed || 0 : 0;

  /* ---------- Closing stock ---------- */
  let closingStock;
  if (item.collection === "feed") {
    closingStock = openingStock + quantityAdded - quantityConsumed - quantityLost;
  } else {
    closingStock = openingStock + quantityAdded - quantitySold - quantityLost;
  }

  /* ---------- Inventory record ---------- */
  const record = {
    item: item.collection,
    itemId: item.itemId,
    branchId: item.branchId,
    ...(item.collection !== "feed" && { typeId: item.typeId }),
    openingStock,
    quantityAdded,
    ...(item.collection !== "feed" && { quantitySold }),
    ...(item.collection === "feed" && { quantityConsumed }),
    quantityLost,
    closingStock,
    date: start,
    updatedAt: new Date(),
  };

  /* ---------- Upsert ---------- */
  if (existing) {
    await db.update("inventories", existing.id, record);
    return { id: existing.id, ...record };
  }

  const ref = await db.add("inventories", record);
  return { id: ref.id, ...record };
}

async function deactivateInventory(data) {

  const { user, itemId } = data;
  if(!user) throw new Error("No user authenticated");
  if(user.role !== "admin" && user.role !== "manager") throw new Error("Permission denied");
  
  if(!itemId) throw new Error("Missing required fields");

  const inventory = await getInventories(user, "itemId", itemId);
  if(!inventory || inventory.length === 0) throw new Error("Inventory not found");
  try {
    await db.update(collectionName, inventory[0].id, {
      active: false,
      deletedAt: null,
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error) {
    throw new Error(error);
  }  
  
}

async function activateInventory(data) {
  const { user, itemId } = data;
  if(!user) throw new Error("No user authenticated");
  if(user.role !== "admin" && user.role !== "manager") throw new Error("Permission denied");
  
  if(!itemId) throw new Error("Missing required fields");

  const inventory = await getInventories(user, "itemId", itemId);
  if(!inventory || inventory.length === 0) throw new Error("Inventory not found");
  try {
    await db.update(collectionName, inventory[0].id, {
      active: true,
      deletedAt: null,
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error) {
    throw new Error(error);
  }  
}

export default {
  getInventories,
  makeInventory,
  deactivateInventory,
  activateInventory,
}