
import db from "../db/db.js";
import { fetchBirds } from "./birdController.js";
import { fetchUsers } from "./userController.js";
import sendSMS from "../bundle/smsService.js";

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

const normalizeDate = d => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (typeof d === "object" && "_seconds" in d) return new Date(d._seconds * 1000);
  if (typeof d === "string") return new Date(d);
  return new Date(d);
};

export default async function vaccinationReminder() {
  try {
    const today = new Date();

    // 🔹 Check if already ran today
    const logs = await db.get("system_logs", "type", "VACCINATION_REMINDER");

    const alreadyRan = logs?.some(
      log => normalizeDate(log).toLocaleDateString() === today.toLocaleDateString()
    );

    if (alreadyRan) {
      return;
    };

    // 🔹 YOUR EXISTING LOGIC HERE
    const birdData = await fetchBirds(null, "active", true, 1, true);
    if (!birdData || birdData.length === 0) return;

    const targetBirds = birdData.filter(
      b => b?.active && b?.nextVaccination?.daysLeft <= 5
    );

    if (targetBirds.length === 0) return;

    const notifications =
      (await db.get("notifications", "type", "UPCOMING_VACCINATION")) || [];

    const allUsers = await fetchUsers();

    const usersByBranch = {};
    for (const user of allUsers) {
      if (!usersByBranch[user.branchId]) {
        usersByBranch[user.branchId] = [];
      }
      usersByBranch[user.branchId].push(user);
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (const bird of targetBirds) {
      const { vaccine, dueDate, daysLeft } = bird.nextVaccination;

      const alreadyNotified = notifications.some(n =>
        n.birdId === bird.id && n.vaccine === vaccine
      );

      if (alreadyNotified) continue;

      const users = usersByBranch[bird.branchId] || [];
      const manager = users.find(u => u.role === "manager");

      if (!manager?.contact) continue;

      const phone = manager.contact.replace(/[-\s]/g, "");
      
      const message = daysLeft > 0 ? 
      `Reminder: ${bird.typeName} at ${bird.branchName} needs ${vaccine} in ${daysLeft} days. Due: ${normalizeDate(new Date(dueDate)).toLocaleDateString()}`:
      `Reminder: ${bird.typeName} at ${bird.branchName} missed ${vaccine} ${daysLeft} days ago. Due: ${normalizeDate(new Date(dueDate)).toLocaleDateString()}`;
      // console.log(message)
      
      await sendSMS({ to: phone, message });

      await db.add("notifications", {
        birdId: bird.id,
        branchId: bird.branchId,
        vaccine,
        type: "UPCOMING_VACCINATION",
        dueDate,
        notifiedAt: new Date(),
      });

      await sleep(500);
    }

    // ✅ Mark as executed today
    await db.add("system_logs", {
      type: "VACCINATION_REMINDER",
      date: new Date(),
    });

  } catch (err) { }
}

async function resolveBirdPriceCore({ typeId, age = 0 }) {
  if (!typeId) throw new Error("Item type required");

  const rules = await db.get('pricing_rules', "typeId", typeId);
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

  return newAge;
}

export async function updateBirdAgesDaily() {
  try {
    const birds = await db.get("birds"); // get all birds
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize to start of day

    for (const bird of birds) {
      if (!bird.active) continue;

    const lastUpdate = toDate(bird.updatedAt);

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

    if (todayDate.toLocaleDateString() === lastUpdateDate.toLocaleDateString()) return;

    const birdAge = await calculateBirdAge(bird);

    if (isNaN(birdAge)) continue;
      
    /* ===== RESOLVE NEW PRICE ===== */
      const pricing = await resolveBirdPriceCore({
        typeId: bird.typeId,
        age: birdAge,
      });
      
      await db.update("birds", bird.id, {
        age: birdAge,
        price: pricing.price,
        currency: pricing.currency,
        updatedAt: today,
      });
    }

    console.log("✅ Bird ages updated");
  } catch (err) {
    console.error("Error updating bird ages:", err);
  }
}