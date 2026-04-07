import db from "../db/db.js";
import stockController from "./stockController.js";

const collectionName = "eggs";

async function validateBranchAndType(branchId, typeId) {
  const [branch, type] = await Promise.all([
    db.get("branches", "id", branchId),
    db.get("types", "id", typeId),
  ]);

  if (!branch) throw new Error("Unknown branch");
  if (!type) throw new Error("Unknown type");
  if (!branch.active) throw new Error("Cannot add eggs to an inactive branch");

  return { branch, type };
}
async function hasSalesAfterDate({ branchId, typeId, fromDate }) {
  const sales = await db.get("sales", "branchId", branchId);
  return sales.some(
    s =>
      s.item === "bird" &&
      s.typeId === typeId &&
      new Date(s.date) >= new Date(fromDate)
  );
}

async function getEggs(user, field = null, value = null) {
  try {
    if (!user || !user.role) throw new Error("Unauthorized");
    const data = await fetchEggs(user, field, value);
    if(user.role === 'admin') return data;

    return data.filter(e => e.branchId === user.branchId && e.active === true);
  } catch (error) {
    throw error;
    
  }
}

/* ================= GET EGGS ================= */
async function fetchEggs(user, field = "", value = "") {
  try {
    const data = await db.get(collectionName, field || null, value || null);

    if (!data) return field === "id" ? null : [];

    let rows = data;
    if (!Array.isArray(rows)) rows = [rows];

    if (rows.length === 0) return field === "id" ? null : [];

    /* ---------------- LOAD BRANCHES & TYPES ---------------- */
    let branches = [];

    if (user.role === "admin") {
      branches = await db.get("branches");
    } else {
      const branch = await db.get("branches", "id", user.branchId);
      branches = branch ? [branch] : [];
    }

    const types = await db.get("types");

    const eggs = rows.map(egg => {
      const branch = branches.find(b => b.id === egg.branchId);
      const type = types.find(t => t.id === egg.typeId);

      return {
        ...egg,
        branchName: branch?.name || "Unknown",
        typeName: type?.name || "Unknown",
      };
    });

    return eggs;

  } catch (err) {
    console.error("Error fetching eggs:", err);
    throw err;
  }
}


/* ================= ADD EGG ================= */
async function addEgg(user, egg) {
  if (!egg) throw new Error("Invalid data");

  const quantity = Number(egg.quantity);
  const price = Number(egg.price);

  if (isNaN(quantity) || quantity <= 0) throw new Error("Invalid quantity");
  if (isNaN(price) || price <= 0) throw new Error("Invalid price");

  if (!["admin", "manager"].includes(user.role))
    throw new Error("Permission denied");

  if (user.role === "manager" && egg.branchId !== user.branchId)
    throw new Error("Managers can only add eggs to their branch");

  await validateBranchAndType(egg.branchId, egg.typeId);

  const eggs = await getEggs(user, "branchId", egg.branchId);
  const existing = eggs.find(e => e.typeId === egg.typeId);

  if (existing) {
    throw new Error(
      `Eggs of this type already exist in this branch (${existing.branchName})`
    );
  }

  const data = {
    branchId: egg.branchId,
    typeId: egg.typeId,
    date: egg.date || new Date(),
    color: egg.color,
    quantity : 0,
    price,
    active: true,
    createdAt: new Date(),
    date: new Date(),
  };

  const docRef = await db.add(collectionName, data);
  await stockController.addStock({
    user,
    branchId: egg.branchId,
    typeId: egg.typeId,
    item: "egg",
    itemId: docRef.id,
    delta: quantity,
    reason: "New egg batch",
  });

  return { id: docRef.id, ...data };
}


/* ================= UPDATE EGG ================= */
async function updateEgg(user, id, updates) {
  if (!id || !updates) throw new Error("Invalid egg data");

  if (!["admin", "manager"].includes(user.role))
    throw new Error("Permission denied");

  const egg = await getEggs(user, 'id', id);
  if (!egg) throw new Error("Egg not found");
  
  const existing = egg[0];


  if (user.role === "manager" && existing.branchId !== user.branchId)
    throw new Error("Managers can only update eggs from their branch");

  const quantityChanged =
    updates.quantity !== undefined &&
    Number(updates.quantity) !== Number(existing.quantity);

  if (quantityChanged) {
    const sold = await hasSalesAfterDate({
      branchId: existing.branchId,
      typeId: existing.typeId,
      fromDate: existing.date,
    });

    if (sold)
      throw new Error("Cannot update quantity after sales have been made");
  }

  const updatedData = {
    color: updates.color ?? existing.color,
    price: updates.price ?? existing.price,
    updatedAt: new Date(),
  };

  await db.update(collectionName, id, updatedData);
  
  const oldQty = Number(existing.quantity);
  const newQty = updates.quantity !== undefined
    ? Number(updates.quantity)
    : oldQty;

  const delta = newQty - oldQty
  if (delta !== 0) {
    await stockController.addStock({
      user,
      branchId: existing.branchId,
      typeId: existing.typeId,
      item: "egg",
      itemId: id,
      delta: delta,
      reason: "Egg quantity correction",
    })
  }

  return { success: true };
}


/* ================= DELETE EGG ================= */
async function deleteEgg(user, id) {
  if (!id) throw new Error("Invalid egg id");

  if (!["admin", "manager"].includes(user.role))
    throw new Error("Permission denied");

  const egg = await getEggs(user, 'id', id);
  const existing = egg[0];
  if (!existing) throw new Error("Egg not found");
  
  if (user.role === "manager" && existing.branchId !== user.branchId)
    throw new Error("Managers can only delete eggs from their branch");
  
  const sold = await hasSalesAfterDate({
    branchId: existing.branchId,
    typeId: existing.typeId,
    fromDate: existing.date,
  });

  
  if (sold)
    throw new Error("Cannot delete egg with sales history");

  await db.update(collectionName, id, {
    active: false,
    deletedAt: new Date(),
  });
  await stockController.deactivateStock({
    user, 
    itemId: id 
  })

  return { success: true };
}

async function restoreEgg(user, id) {
  if(!user) throw new Error("No user authenticated");
  if(user.role !== "admin" && user.role !== "manager") throw new Error("Permission denied");
  
  const eggs = await getEggs(user, 'id', id);  
  const existing = eggs[0];
  if (!existing) throw new Error("Egg not found");

  await db.update(collectionName, id, {
    active: true,
    restoredAt: new Date(),
  });
  await stockController.activateStock({
    user,
    itemId: existing.id,
  });

  return { success: true };
}

async function stock(user, data) {
  if(!data) throw new Error("Invalid data");

  const { branchId, typeId, quantity } = data;

  if(!user) throw new Error("No user authenticated");
  if(user.role !== "admin" && user.role !== "manager") throw new Error("Permission denied");

  if(!branchId || !typeId || !quantity) throw new Error("Missing required fields");

  const egg = await getEggs(user, 'typeId', typeId);
  const existing = egg[0];
  if (!existing) throw new Error("Egg not found in that Branch");

  await stockController.updateStock({
    user,
    branchId: existing.branchId,
    typeId: existing.typeId,
    item: "egg",
    itemId: existing.id,
    newQuantity: Number(existing.quantity) + Number(quantity),
    reason: "New stock",
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
      return addEgg(user, data);

    case "update":
      return updateEgg(user, id, data);

    case "delete":
      return deleteEgg(user, id);

      case "restore":
        return restoreEgg(user, id);

      case "stock":
        return stock(user, data);
    default:
      throw new Error("Unknown action");
  }
}

/* ================= EXPORT ================= */
export default {
  getEggs,
  updateEgg,
  process,
};
