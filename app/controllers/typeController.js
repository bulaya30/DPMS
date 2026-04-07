import db from "../db/db.js";
import { io } from "../app.js";

const collectionName = "types";

async function getTypes(user, field = null, value = null) {
  try {
    if (user.role === 'admin') return await fetchTypes(field, value);
    return await fetchTypes(null, null, {includeInactive: false})    
  } catch (error) {
    throw new Error(error);
    
  }
}

/* ================= GET TYPES ================= */
async function fetchTypes(
  field = null,
  value = null,
  options = { includeInactive: true }
) {
  try {
    const types = await db.get(collectionName, field, value);

    // Single type by ID
    if (field === "id") {
      if (!types) return null;
      if (!options.includeInactive && types.active === false) return null;

      const inUse = await isTypeInUse(types.id);
      return { ...types, inUse };
    }

    // Multiple types
    const filtered = options.includeInactive
      ? types
      : types.filter(doc => doc.active === true);

    const typesWithUsage = await Promise.all(
      filtered.map(async type => {
        const inUse = await isTypeInUse(type.id);
        return { ...type, inUse };
      })
    );

    return typesWithUsage;
  } catch (err) {
    console.error("Error fetching types:", err);
    throw new Error(err);
    
  }
}


/* ================= ADD TYPE ================= */
async function addType(type) {
  if (!type || !type.name) throw new Error("Invalid data");

  const exists = await db.exists(collectionName, "name", type.name);
  if (exists) throw new Error("Type name already exists");

  const payload = { ...type, active: true, date: new Date(), createdAt: new Date().toISOString() };
  const docRef = await db.add(collectionName, payload);

  io.emit("typesUpdated");

  return { id: docRef.id, ...payload };
}

/* ================= UPDATE TYPE ================= */
async function updateType(typeId, updates) {
  if (!typeId || !updates || !updates.name) throw new Error("Invalid data");

  const type = await getTypes("id", typeId, { includeInactive: true });
  if (!type) throw new Error("Type does not exist");
  if (type.active === false && !updates.restore) throw new Error("Cannot update inactive type");

  delete updates.restore;
  await db.update(collectionName, typeId, updates);

  io.emit("typesUpdated");

  return { id: typeId, ...updates };
}

/* ================= TYPE IN USE ================= */
async function isTypeInUse(typeId) {
  const birds = await db.get("birds", "typeId", typeId);
  const eggs = await db.get("eggs", "typeId", typeId);

  return birds.length > 0 || eggs.length > 0;
}

/* ================= DELETE (SOFT) ================= */
async function deleteType(typeId) {
  if (!typeId) throw new Error("Invalid type id");

  const type = await getTypes("id", typeId, { includeInactive: true });
  if (!type) throw new Error("Type does not exist");

  const inUse = await isTypeInUse(typeId);
  if (inUse) throw new Error("Cannot delete this type because it is in use");

  await db.update(collectionName, typeId, {
    active: false,
    deletedAt: new Date().toISOString(),
  });

  io.emit("typesUpdated");

  return { id: typeId, deleted: true };
}

/* ================= RESTORE ================= */
async function restoreType(typeId) {
  await db.update(collectionName, typeId, {
    active: true,
    restoredAt: new Date().toISOString(),
  });

  io.emit("typesUpdated");

  return { id: typeId, restored: true };
}

/* ================= PROCESS ================= */
async function process(payload) {
  if (!payload) throw new Error("Invalid data");
  const {data, action, user, id} = payload;
    if ( user.role !== 'admin') {
      throw new Error('Only admin can manage item types');
    }


  switch (action) {
    case "add":
      return addType(data);
    case "update":
      return updateType(id, data);
    case "delete":
      return deleteType(id);
    case "restore":
      return restoreType(id);
    default:
      throw new Error("Unknown action");
  }
}

/* ================= EXPORT ================= */
export default {
  getTypes,
  isTypeInUse,
  process,
};
