import db from "../db/db.js";
import stockController from "./stockController.js";
import birdController from "./birdController.js";
import eggController from "./eggController.js";
import inventoryController from "./inventoryController.js";

const collectionName = "sales";


function toJSDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return new Date(timestamp);
}

async function addSale(user, data) {
  if (!["bird", "egg"].includes(data.item)) {
    throw new Error("Only birds and eggs can be sold");
  }

  if (!data.typeId || !data.quantity || !data.branchId) {
    throw new Error("Missing required fields");
  }

  const qtyToSell = Number(data.quantity);
  if (qtyToSell <= 0) throw new Error("Invalid quantity");

  /* ---------- Resolve item controller ---------- */
  const controller =
    data.item === "bird" ? birdController : eggController;

  const items =
    (await controller.getBirds?.(user, "typeId", data.typeId)) ??
    (await controller.getEggs(user, "typeId", data.typeId));

  const selectedItem =
    data.item === "bird"
      ? items.find(i => i.branchId === data.branchId && i.age === data.age)
      : items.find(i => i.branchId === data.branchId);

  if (!selectedItem) throw new Error("Item not found in branch");

  /* ---------- Stock validation ---------- */
  const stockArr = await stockController.getStoks(user, "itemId", selectedItem.id);
  const stock = stockArr?.[0];

  if (!stock) throw new Error("Stock record not found");

  const available = Number(stock.quantity) - Number(stock.quantityReserved || 0);

  if (available < qtyToSell) {
    throw new Error("Insufficient available stock");
  }

  /* ---------- Date boundaries ---------- */
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  /* ---------- Check existing sale ---------- */
  const sales = await getSales(user);
  const existingSale = sales.find(s => {
    const saleDate = toJSDate(s.date);
    return (
      s.item === data.item &&
      s.branchId === data.branchId &&
      s.typeId === data.typeId &&
      s.itemId === selectedItem.id &&
      s.uid === user.uid &&
      saleDate >= start &&
      saleDate < end
    );
  });

  const price = Number(selectedItem.price);
  const totalToAdd = price * qtyToSell;

  /* ---------- ADD / UPDATE sale ---------- */
  if (existingSale) {
    await db.update("sales", existingSale.id, {
      quantity: Number(existingSale.quantity) + qtyToSell,
      total: Number(existingSale.total) + totalToAdd,
      updatedAt: now,
    });
  } else {
    await db.add("sales", {
      uid: user.uid,
      branchId: data.branchId,
      typeId: data.typeId,
      item: data.item,
      itemId: selectedItem.id,
      quantity: qtyToSell,
      price,
      total: totalToAdd,
      date: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  /* ---------- STOCK & ITEM SYNC (SINGLE SOURCE OF TRUTH) ---------- */
  await stockController.addStock({
    user,
    branchId: data.branchId,
    typeId: data.typeId,
    item: data.item,
    itemId: selectedItem.id,
    delta: -qtyToSell,
    reason: "sale",
  });

  return {
    success: true,
    sold: qtyToSell,
    remainingStock: available - qtyToSell,
    totalAdded: totalToAdd,
    updated: Boolean(existingSale),
  };
}


async function getSales(user, field = null, value = null) {
  if (user.role === 'admin') return await fetchSales(field, value);
  if(user.role === 'manager') return await fetchSales( 'branchId', user.branchId);
  const sales = await fetchSales('branchId', user.branchId)
  return sales.filter(sale => sale.uid === user.uid)
}



/* ======================================================
   GET SALES (WITH BRANCH, TYPE, AND ITEM NAMES)
====================================================== */
async function fetchSales(field = null, value = null) {
  try {
    let data = await db.get(collectionName, field || null, value || null);
    if (!data) return field === "id" ? null : [];

    if (!Array.isArray(data)) data = [data];
    if (data.length === 0) return field === "id" ? null : [];

    /* ---------- Collect IDs ---------- */
    const branchIds = new Set();
    const typeIds = new Set();
    const itemIds = new Set();

    data.forEach(s => {
      if (s.branchId) branchIds.add(s.branchId);
      if (s.typeId) typeIds.add(s.typeId);
      if (s.itemId) itemIds.add(s.itemId);
    });

    /* ---------- Fetch related data ---------- */
    const [branches, types, birds, eggs] = await Promise.all([
      branchIds.size ? db.get("branches") : [],
      typeIds.size ? db.get("types") : [],
      itemIds.size ? db.get("birds") : [],
      itemIds.size ? db.get("eggs") : [],
    ]);

    /* ---------- Build lookup maps ---------- */
    const branchMap = {};
    branches.forEach(b => (branchMap[b.id] = b.name));

    const typeMap = {};
    types.forEach(t => (typeMap[t.id] = t.name));

    const birdMap = {};
    birds.forEach(b => {
      birdMap[b.id] = {
        name: b.name,
        age: b.age,
      };
    });

    const eggMap = {};
    eggs.forEach(e => {
      eggMap[e.id] = {
        name: e.name,
      };
    });

    /* ---------- Map names + age ---------- */
    const result = data.map(s => {
      const isBird = s.item === "bird";
      const itemData = isBird ? birdMap[s.itemId] : eggMap[s.itemId];

      return {
        ...s,
        branchName: branchMap[s.branchId] || null,
        typeName: s.typeId ? typeMap[s.typeId] || null : null,
        itemName: itemData?.name || null,
        age: isBird ? itemData?.age ?? null : null,
      };
    });

    return field === "id" ? result[0] : result;
  } catch (error) {
    console.error("Error fetching sales:", error);
    throw new Error(error);
  }
}

/* ======================================================
   GET DAILY SALES
====================================================== */

async function getDailySales(user, date = new Date()) {
  if (!user) throw new Error("Access denied");

  const baseDate = date ? toJSDate(date) : new Date();
  if (!baseDate) throw new Error("Invalid date provided");

  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const sales = await getSales(user);

  return sales.filter(s => {
    const saleDate = toJSDate(s.date);
    return saleDate >= start && saleDate < end;
  });
}




async function updateSale({ itemId, itemType, date, newQuantity, newDate = null }) {
  if (!itemId || !itemType || !date || !newQuantity) throw new Error("Missing required fields");

  const sales = await getSales({ field: 'date', value: date });
  if (!sales.length) throw new Error("No sales found for this date");

  const sale = sales.find(s => s.itemId === itemId && s.itemType === itemType);
  if (!sale) throw new Error("Sale record not found");

  let item = itemType === 'bird'
    ? await db.get('birds', 'id', itemId)
    : await db.get('eggs', 'id', itemId);

  if (!item) throw new Error("Item not found");

  const restoredStock = Number(item.quantity) + Number(sale.quantity);
  if (Number(newQuantity) > restoredStock) throw new Error("Insufficient stock");

  item.quantity = restoredStock - Number(newQuantity);
  delete item.updatedAt;

  if (itemType === 'bird') await birdController.updateBird(item.id, item);
  else await eggController.updateEgg(item.id, item);

  const updatedSale = { quantity: Number(newQuantity), total: Number(newQuantity) * Number(sale.price), date: newDate ? new Date(newDate) : sale.date };
  await db.update('sales', sale.id, updatedSale);

  return { id: sale.id, ...updatedSale };
}

async function deleteSale(saleId) {
  if (!saleId) throw new Error("Sale ID required");

  const sale = await getSales({ field: 'id', value: saleId });
  if (!sale) throw new Error("Sale not found");

  const item = sale.itemType === 'bird'
    ? await birdController.getSales('id', sale.itemId)
    : await eggController.getEggs('id', sale.itemId);

  if (!item) throw new Error("Item not found");

  item.quantity += Number(sale.quantity);
  delete item.updatedAt;

  if (sale.itemType === 'bird') await birdController.updateBird(item.id, item);
  else await eggController.updateEgg(item.id, item);

  await db.delete('sales', saleId);
  return { success: true };
}

async function getTotalSold(user, itemType) {
  const sales = await getSales(user);
  return sales.filter(s => s.itemType === itemType && (!branch || s.branch === branch))
    .reduce((sum, s) => sum + Number(s.quantity), 0);
}

async function getSalesSummary(user) {
  const sales = await getSales(user);
  let salesSold = 0, revenue = 0;

  sales.forEach(s => {
    revenue += Number(s.total);
    if (s.itemType === 'egg') salesSold += Number(s.quantity);
    else salesSold += Number(s.quantity);
  });

  return { salesSold, salesSold, revenue };
}

async function process(payload) {
  if (!payload) throw new Error("Invalid data");
  
  const {action, data, user, id} = payload;

  const isPrivileged =
    user.role === "admin" || user.role === "manager";
  // 🔐 Restrict update & delete
  if ((action === "update" || action === "delete") && !isPrivileged) {
    throw new Error("Only admin or manager can update or delete sales");
  }

  switch (action) {
    case "add":
      return await addSale(user, data);

    case "update":
      return await updateSale(id, data);

    case "delete":
      return await deleteSale(id);

    default:
      throw new Error("Invalid action");
  }
}


export default {
  getSales,
  getDailySales,
  updateSale,
  getTotalSold,
  getSalesSummary,
  deleteSale,
  process
};
