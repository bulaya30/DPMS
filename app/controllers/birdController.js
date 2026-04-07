import db from "../db/db.js";
import { io } from "../app.js";
import stockController from "./stockController.js";
import vaccinScheduleController from "./vaccinScheduleController.js";
import vaccinationController from "./vaccinationController.js";
import PriceController from "./priceController.js"

const BATCH_SIZE = 50;
const collectionName = "birds";

/* ===================== HELPERS ===================== */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
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


async function resolveBirdPrice(user, { typeId, age = 0 }) {
  if (!typeId) throw new Error("Item type required");

  const rules = await PriceController.getPrices(user, "typeId", typeId);
  const numericAge = Number(age);
  
  if (!rules?.length || isNaN(numericAge)) {
      return { price: 0, currency: "UGX" };
  }
  
  const sortedRules = rules
    .flatMap(r => 
      r.ranges.map(range => ({
        ...range,
        minAge: Number(range.minAge ?? 0),
        maxAge: Number(range.maxAge ?? Infinity),
        price: Number(range.price ?? 0),
        currency: range.currency || "UGX",
      }))
    )
    .sort((a, b) => a.minAge - b.minAge);

  const matched = sortedRules.find(r =>
    numericAge >= r.minAge && numericAge <= r.maxAge
  );
  
  if (matched) {
    return {
      price: matched.price,
      currency: matched.currency || "UGX",
    };
  }
  
  // If age exceeds max bracket → use last rule
  const lastRule = sortedRules.at(-1);

  if (lastRule && numericAge > lastRule.maxAge) {
    return {
      price: lastRule.price,
      currency: lastRule.currency || "UGX",
    };
  }

  return { price: 0, currency: "UGX" };
}

async function validateBranchAndType(branchId, typeId) {
  const [branch, type] = await Promise.all([
    db.get("branches", "id", branchId),
    db.get("types", "id", typeId),
  ]);

  if (!branch) throw new Error("Unknown branch");
  if (!type) throw new Error("Unknown type");
  if (!branch.active) throw new Error("Cannot add birds to an inactive branch");
  if(!type.active) throw new Error("Cannot add birds to an inactive type");

  return { branch, type };
}

/* ===================== FETCH BIRDS ===================== */
export async function fetchBirds(user, field = "", value = "", page = 1, system = false) {
  try {
    // ---------------- FETCH RAW BIRDS ----------------
    const data = await db.get(collectionName, field || null, value || null, {
      limit: BATCH_SIZE,
      page,
      orderByField: "createdAt",
      orderDirection: "desc",
    });
    
    if (!data) return field === "id" ? null : [];

      let rows = data;
    // Normalize
    if (!Array.isArray(rows)) rows = [rows];

    if (rows.length === 0) return field === "id" ? null : [];

    // ---------------- LOAD BRANCHES & TYPES ----------------
    let branches = [];
    if(system) {
      branches = await db.get("branches");
    } else
    if (user.role === "admin") {
      branches = await db.get("branches");
    } else {
      const branch = await db.get("branches", "id", user.branchId);
      branches = branch ? [branch] : [];
    }

    const types = await db.get("types");
    const schedules = await vaccinScheduleController.getSchedules();

    const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
    const typeMap = Object.fromEntries(types.map(t => [t.id, t.name]));
    const scheduleMap = Object.fromEntries(schedules.map(s => [s.typeId, s]));

    // ---------------- ENRICH BIRDS ----------------
    const birdsEnriched = rows.map(bird => ({
      ...bird,
      branchName: branchMap[bird.branchId] || "Unknown branch",
      typeName: typeMap[bird.typeId] || "Unknown type",
    }));

    // ---------------- VACCINATION (READ-ONLY) ----------------
    const birdsWithVaccinations = await Promise.all(
      birdsEnriched.map(async bird => {
        const template = scheduleMap[bird.typeId];
        const vaccinationHistory = await vaccinationController.getVaccinationHistory(bird.id);
        const nextVaccination = template
        ? await vaccinScheduleController.getNextVaccination(bird, template, vaccinationHistory, { readOnly: true })
        : null;

        const vaccinationTimeline = template
          ? await vaccinationController.buildVaccinationTimeline(bird, template)
          : [];

        const vaccinationAlert = nextVaccination
          ? vaccinationController.getVaccinationAlert(nextVaccination)
          : null;

        return {
          ...bird,
          vaccinationHistory,
          nextVaccination,
          vaccinationTimeline,
          vaccinationAlert,
        };
      })
    );

    return birdsWithVaccinations;
  } catch (err) {
    throw err;
  }
}

/* ===================== GET BIRDS BASED ON USER ===================== */
async function getBirds(user, field = null, value = null) {
  try {
    if (!user || !user.role) {
      throw new Error("Unauthorized");
    }

    const birds = await fetchBirds(user, field, value);
    // console.log(birds); 

    // Admin : full access
    if (user.role === "admin") {
      return birds;
    }

    // Other users: branch + active only
    return birds.filter(
      b => b.branchId === user.branchId && b.active === true
    );
  } catch (error) {
    throw error; // preserve original error
  }
}

/* ===================== ADD BIRD ===================== */
async function addBird(user, bird) {
  if (!bird) throw new Error("Invalid bird data");

  const quantity = Number(bird.quantity);
  const age = Number(bird.age);

  if (isNaN(quantity) || quantity <= 0)
    throw new Error("Invalid quantity");

  if (isNaN(age) || age < 0)
    throw new Error("Invalid age");

  if (!["admin", "manager"].includes(user.role))
    throw new Error("Permission denied");

  if (user.role === "manager" && bird.branchId !== user.branchId)
    throw new Error("Managers can only add birds to their branch");

  // Validate branch and type
  await validateBranchAndType(bird.branchId, bird.typeId);

  // Fetch existing birds in branch
  const birds = await getBirds(user, "typeId", bird.typeId);

  // Find an active batch of same type and age
  const existing = birds.find(
    b => Number(b.age) === age
  );
  // ===== MERGE INTO EXISTING BATCH =====
  if (existing) {
    // Use updateStock to automatically handle inventory
    await stockController.updateStock({
      user,
      branchId: existing.branchId,
      typeId: existing.typeId,
      item: "bird",
      itemId: existing.id,
      newQuantity: Number(existing.quantity) + quantity,
      reason: "Bird batch merged",
    });

    return {
      id: existing.id,
      merged: true,
      quantity: Number(existing.quantity) + quantity,
      message: `Merged with existing batch (Age ${age} days)`,
    };
  }

  // ===== CREATE NEW BATCH =====
  const pricing = await resolveBirdPrice(user, { typeId: bird.typeId, age });

  const data = {
    branchId: bird.branchId,
    typeId: bird.typeId,
    quantity: 0, 
    age,
    price: pricing.price || null,
    currency: pricing.currency || null,
    ageRecordedAt: new Date(),
    date: new Date(),
    active: true,
  };

  const docRef = await db.add(collectionName, data);

  // Use addStock to handle new batch + inventory
  await stockController.addStock({
    user,
    branchId: bird.branchId,
    typeId: bird.typeId,
    item: "bird",
    itemId: docRef.id,
    delta: quantity,
    reason: "New bird batch",
  });

  const result = { id: docRef.id, created: true, ...data };

  io.emit("birdsUpdated");

  return result;
}


/* ===================== UPDATE BIRD ===================== */
async function updateBird(user, id, updates, options = {}) {
  if (!id || !updates) throw new Error("Invalid bird data");

  const bird = await getBirds(user, "id", id);
  const existing = bird[0];

  if (!existing) throw new Error("Bird not found");

  if (!options.system && !["admin", "manager"].includes(user.role))
    throw new Error("Permission denied");

  if (!options.system && user.role === "manager" && existing.branchId !== user.branchId)
    throw new Error("Managers cannot update birds from other branches");

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

  const oldQty = Number(existing.quantity);
  const newQty = updates.quantity !== undefined ? Number(updates.quantity) : oldQty;
  const delta = newQty - oldQty;

  const updatedData = {
    branchId: updates.branchId ?? existing.branchId,
    typeId: updates.typeId ?? existing.typeId,
    age: updates.age ?? existing.age,
    active: updates.active ?? existing.active,
    updatedAt: new Date(),
  };

  await db.update(collectionName, id, updatedData);

  if (delta !== 0 && !options.system) {
    await stockController.addStock({
      user,
      branchId: updatedData.branchId,
      typeId: updatedData.typeId,
      item: "bird",
      itemId: existing.id,
      delta: delta,
      reason: "Bird quantity corrected",
    });
  }

  const result = { sucess: true };

  // 🔥 notify all clients
  io.emit("birdsUpdated");

  return result;
}



/* ===================== DELETE / RESTORE ===================== */
async function deleteBird(user, id) {
  
  if(!user) throw new Error("No user authenticated");
  if(user.role !== "admin" || user.role !== "manager") throw new Error("Permission denied");

  const birds = await getBirds(user, 'id', id);
  const existing = birds[0];
  
  if (!existing) throw new Error("Bird not found");
  
  const sold = await hasSalesAfterDate({
    branchId: existing.branchId,
    typeId: existing.typeId,
    fromDate: existing.date,
  });
  
  if (sold)
    throw new Error("Cannot delete bird with sales history");
  
  await db.update(collectionName, id, {
    active: false,
    deletedAt: new Date(),
  });

  await stockController.deactivateStock({
    user,
    branchId: existing.branchId,
    typeId: existing.typeId,
    item: "bird",
    itemId: existing.id,
  });
  
  io.emit("birdsUpdated");

  return { success: true };
}


async function restoreBird(user, id) {

  if(!user) throw new Error("No user authenticated");
  if(user.role !== "admin" || user.role !== "manager") throw new Error("Permission denied");
  
  const birds = await getBirds(user, 'id', id);
  const existing = birds[0];

  if (!existing) throw new Error("Bird not found");

  await db.update(collectionName, id, {
    active: true,
    restoredAt: new Date(),
  });

  await stockController.activateStock({
    user,
    branchId: existing.branchId,
    typeId: existing.typeId,
    item: "bird",
    itemId: existing.id,
  });

  io.emit("birdsUpdated");

  return { success: true };
}


/* ===================== PROCESS ===================== */
async function process(payload) {
  if (!payload) throw new Error("Invalid data");
  const { data, action, id, user } = payload;
  if (!user) throw new Error("No user authenticated");
  switch (action) {
    case "add":
      return addBird(user, data);
    case "update":
      return updateBird(user, id, data);
    case "delete":
      return deleteBird(user, id);
    case "restore":
      return restoreBird(user, id);
    default:
      throw new Error("Unknown action");
  }
}

/* ===================== EXPORT DEFAULT ===================== */
export default {
  getBirds,
  addBird,
  updateBird,
  deleteBird,
  restoreBird,
  process,
};
