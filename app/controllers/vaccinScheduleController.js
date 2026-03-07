import db from "../db/db.js";
import vaccinationController from "./vaccinationController.js";

const collectionName = "vaccine_schedules";

async function resolveBirdPriceCore({ typeId, age = 0 }) {
  if (!typeId) throw new Error("Item type required");

  const rules = await db.get(collectionName, "typeId", typeId);
  const numericAge = Number(age);

  if (!rules?.length || isNaN(numericAge)) {
    return { price: 0, currency: "UGX" };
  }

  const sortedRules = rules
    .map(r => ({
      ...r,
      minAge: Number(r.minAge ?? 0),
      maxAge: Number(r.maxAge ?? Infinity),
      price: Number(r.price ?? 0),
    }))
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

  if (numericAge > lastRule.maxAge) {
    return {
      price: lastRule.price,
      currency: lastRule.currency || "UGX",
    };
  }

  return { price: 0, currency: "UGX" };
}

/* ===================== DATE HELPERS ===================== */

function toDate(value) {
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  return new Date(value);
}

function dateDiffInDays(fromDate, toDate = new Date()) {
  if (!(fromDate instanceof Date)) return null;
  const diffInMs = toDate - fromDate;
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days));
  return d;
}
/* ===================== CALCULATE BIRD AGE ===================== */
async function calculateBirdAge(birdBatch) {
  if (
    birdBatch.age === undefined ||
    !birdBatch.updatedAt ||
    !birdBatch.typeId
  )
    return Number(birdBatch.age || 0);

  const lastUpdate = toDate(birdBatch.updatedAt);
  const today = new Date();

  const lastUpdateDate = new Date(
    lastUpdate.getFullYear(),
    lastUpdate.getMonth(),
    lastUpdate.getDate()
  );

  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  if (todayDate <= lastUpdateDate) return Number(birdBatch.age);

  const daysPassed = dateDiffInDays(lastUpdateDate, todayDate);

  if (daysPassed <= 0) return Number(birdBatch.age);

  const newAge = Number(birdBatch.age) + daysPassed;

  /* ===== RESOLVE NEW PRICE ===== */
  const pricing = await resolveBirdPriceCore({
    typeId: birdBatch.typeId,
    age: newAge,
  });

  /* ===== UPDATE BIRD BATCH ===== */
  await db.update("birds", birdBatch.id, {
    age: newAge,
    price: pricing.price,
    currency: pricing.currency,
    updatedAt: new Date(),
  });

  return newAge;
}

async function getSchedules(field = "", value = "") {
  try {
    /* ---------- Get schedules ---------- */
    let schedules;

    if (field === "id" && value) {
      const data = await db.get(collectionName, "id", value);
      if (!data) return null;
      schedules = [data];
    } else {
      schedules = await db.get(collectionName, field || null, value || null);
    }

    if (!schedules || schedules.length === 0) return [];

    /* ---------- Fetch bird types ---------- */
    const types = await db.get("types");

    const typeMap = {};
    types.forEach(t => {
      typeMap[t.id] = t.name;
    });

    /* ---------- Map type name ---------- */
    const mapped = schedules.map(s => ({
      ...s,
      typeName: typeMap[s.typeId] || "Unknown"
    }));

    return field === "id" ? mapped[0] : mapped;

  } catch (err) {
    throw err;
  }
}

/* ===================== Add SCHEDULE ===================== */
async function addSchedule(user, data) {
  if (user.role !== "admin") {
    throw new Error("Only admin can add vaccination schedules");
  }

  const { typeId, name, schedule } = data;

  if (!typeId || !name || !Array.isArray(schedule) || schedule.length === 0) {
    throw new Error("Missing required fields");
  }

  /* ---------- Validate each schedule row ---------- */
  for (const row of schedule) {
    if (!row.ageInDays && row.ageInDays !== 0) {
      throw new Error("Each schedule entry must include bird age");
    }

    if (!row.vaccine) {
      throw new Error("Each schedule entry must include vaccine name");
    }
  }

  try {
    const template = {
      typeId,
      name,
      schedule: schedule.map(s => ({
        ageInDays: Number(s.ageInDays),
        vaccine: s.vaccine
      })),
      date: new Date(),
      active: true,
      createdBy: user.uid,
    };

    const id = await db.add(collectionName, template);
    return id;

  } catch (error) {
    throw new Error(error);
    ;
  }
}

async function updateSchedule(user, id, update) {
  if (user.role !== "admin") {
    throw new Error("Only admin can update vaccination schedules");
  }

  if (!update) throw new Error("No data provided");

  const {typeId, name, schedule } = update;

  if (!id || !typeId || !name || !Array.isArray(schedule) || schedule.length === 0) {
    throw new Error("Missing required fields");
  }

  const existing = await getSchedules("id", id);
  if (!existing) throw new Error("Schedule not found");

  
  /* ---------- Validate each schedule row ---------- */
  for (const row of schedule) {
    if (row.ageInDays === undefined || row.ageInDays === null) {
      throw new Error("Each schedule entry must include bird age");
    }

    if (!row.vaccine?.trim()) {
      throw new Error("Each schedule entry must include vaccine name");
    }
  }

  try {
    const template = {
      typeId,
      name,
      schedule: schedule.map(s => ({
        ageInDays: Number(s.ageInDays),
        vaccine: s.vaccine.trim()
      })),
      updatedBy: user.uid,
      updatedAt: new Date()
    };

    await db.update(collectionName, id, template);
    return true;

  } catch (err) {
    throw err;
  }
}

/* ===================== GET NEXT VACCINATION ===================== */
async function getNextVaccination(birdBatch, template, history = []) {
  if (!birdBatch || !template || !Array.isArray(template.schedule)) return null;

  const birdAge = await calculateBirdAge(birdBatch);
  if (isNaN(birdAge)) return null;

  const schedule = [...template.schedule].sort((a, b) => Number(a.ageInDays) - Number(b.ageInDays));

  for (const item of schedule) {
    const done = history.find(h => h.vaccine === item.vaccine);
    if (done) continue;

    const daysLeft = Number(item.ageInDays) - birdAge;
    let status = "UPCOMING";
    if (daysLeft === 0) status = "DUE";
    if (daysLeft < 0) status = "OVERDUE";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = addDays(today, daysLeft);

    return { vaccine: item.vaccine, ageInDays: item.ageInDays, dueDate, status, daysLeft };
  }

  return null;
}

/* ===================== PROCESS (ADMIN ONLY) ===================== */
async function process(payload) {
  if (!payload) throw new Error("Invalid request");
  const { data, action, user, id } = payload;

  if (user.role !== "admin") throw new Error("Only admin can manage vaccination schedules");

  switch (action) {
    case "add":
      return await addSchedule(user, data);
    case "update":
      return await updateSchedule(user, id, data);
    case "delete":
      return await deleteTemplate(id);
    case "completeVaccination":
      return await vaccinationController.completeVaccination(
        data.birdBatch,
        data.birdBatch.nextVaccination
      );
    default:
      throw new Error("Unknown action");
  }
}

/* ===================== EXPORT ===================== */
export default {
  getSchedules,
  getNextVaccination,
  calculateBirdAge,
  process,
};
