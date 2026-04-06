
import db from "../db/db.js";
import { fetchBirds } from "./birdController.js";
import { fetchUsers } from "./userController.js";
import sendSMS from "../bundle/smsService.js";

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
    )


    if (alreadyRan) {
      console.log("⏭️ Vaccination reminder already ran today");
      return;
    }

    console.log("🚀 Running vaccination reminder...");

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

    console.log("✅ Vaccination reminder completed");

  } catch (err) {
    console.error("❌ Vaccination reminder error:", err);
  }
}