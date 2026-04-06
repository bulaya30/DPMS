import db from "../db/db.js";

const collectionName = "vaccinations"; // vaccination history (completed)

/* ======================================================
   GET VACCINATIONS (HISTORY)
====================================================== */
async function getVaccinations(field = "", value = "") {
  const vaccinations = [];

  try {
    const data = await db.get(collectionName, field || null, value || null);
    
    if (field === 'id') {
      if (data) {
        vaccinations.push({ ...data });
      }
      return vaccinations[0];
    }
    data.forEach(doc => {
      vaccinations.push({ ...doc });
    });
    
    return vaccinations;
  } catch (error) {
      console.error("Error fetching vaccinations:", error);
      return [];
    }
}

/* ======================================================
   CORE LOGIC
====================================================== */

// Check if vaccine already administered
async function hasReceivedVaccine(birdId, vaccine) {
  const data = await getVaccinations("birdId", birdId);

  if (!Array.isArray(data) || data.length === 0) return false;

  return data.some(v => v.vaccine === vaccine);
}

// Get vaccination history for a bird batch
async function getVaccinationHistory(birdId) {
  const history = [];
  const data = await getVaccinations( "birdId", birdId);

  data.forEach(doc => {
    history.push({...doc });
  });

  return history;
}

/* ======================================================
   COMPLETE VACCINATION
====================================================== */
async function completeVaccination(birdBatch, nextVaccination) {
  if (!birdBatch || !nextVaccination) {
    throw new Error("Invalid vaccination completion data");
  }
  
  // ❌ Too early
  if (Number(birdBatch.age) < Number(nextVaccination.ageInDays)) {
    throw new Error("Birds are too young for this vaccination");
  }
  
  
  // ❌ Already administered
  const alreadyDone = await hasReceivedVaccine(
    birdBatch.id,
    nextVaccination.vaccine
  );

  if (alreadyDone) {
    throw new Error("Vaccine already administered");
  }
  // ✅ Save vaccination history
  const record = {
    birdId: birdBatch.id,
    typeId: birdBatch.typeId,
    branchId: birdBatch.branchId,
    vaccine: nextVaccination.vaccine,
    ageInDays: nextVaccination.ageInDays,
    vaccinationDate: new Date(),
  };
  
  try {
    const docRef = await db.add(collectionName, record);
    return { id: docRef.id, ...record };
    
  } catch (error) {
    throw error
  }
}

/* ======================================================
   TIMELINE
====================================================== */
async function buildVaccinationTimeline(birdBatch, template) {
  if (!template || !Array.isArray(template.schedule)) return [];

  const history = await getVaccinationHistory(birdBatch.id);

  return template.schedule.map(item => {
    const done = history.find(h => h.vaccine === item.vaccine);

    if (done) {
      return {
        vaccine: item.vaccine,
        ageInDays: item.ageInDays,
        status: "COMPLETED",
        date: done.vaccinationDate
      };
    }

    const daysLeft = item.ageInDays - Number(birdBatch.age);
    const dueDate = addDays(new Date(), daysLeft);

    if (Number(birdBatch.age) >= Number(item.ageInDays)) {
      return {
        type: birdBatch.typeName,
        vaccine: item.vaccine,
        ageInDays: item.ageInDays,
        status: "OVERDUE",
        dueDate // ← now we include the due date for overdue vaccines
      };
    }

    return {
      vaccine: item.vaccine,
      ageInDays: item.ageInDays,
      status: "UPCOMING",
      dueDate
    };
  });
}

// Helper to add days
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days));
  return d;
}

/* ======================================================
   ALERTS
====================================================== */
function getVaccinationAlert(nextVaccination) {
  if (!nextVaccination) return null;

  if (nextVaccination.status === "OVERDUE") {
    return { level: "danger", message: "Vaccination overdue" };
  }

  if (nextVaccination.status === "DUE") {
    return { level: "warning", message: "Vaccination due today" };
  }

  return null;
}

/* ======================================================
   PROCESS
====================================================== */
async function process(payload) {
  if (!payload ) { throw new Error("Invalid data"); }
  const {data, action, user, id} = payload;
  if ( user.role !== 'admin' || user.role !== 'manager') {
    throw new Error('Only admin or manager can manage vaccines');
  }

  switch (action) {

    case "complete":
      return await completeVaccination(
        data.birdBatch,
        data.nextVaccination
      );

    default:
      throw new Error("Unknown action");
  }
}

export default {
  getVaccinations,
  hasReceivedVaccine,
  getVaccinationHistory,
  completeVaccination,
  buildVaccinationTimeline,
  getVaccinationAlert,
  process
};
