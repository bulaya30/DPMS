import db, { auth } from "../db/db.js";
import jwt from "jsonwebtoken";

/* ===================== CONSTANTS ===================== */
const collectionName = "users";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "1d";

async function getUser(user, field = null, value = null) {
  
  if (user.role === 'admin') return await fetchUsers(field, value);
  return await fetchUsers('id', user.uid)
}
async function getEmployees(user) {

  if (user.role !== 'admin' && user.role !== 'manager') {
    throw new Error("Not authorized");
  }

  const users = await fetchUsers();

  return user.role === 'admin' ? users.filter(
    u => u.role !== 'admin') 
    : users.filter(u => u.role !== 'admin' && u.branchId === user.branchId);
}


/* ===================== GET USERS ===================== */
const fetchUsers = async (field = null, value = null) => {
  
  const data = await db.get(collectionName, field, value);

  /* ================= SINGLE USER ================= */
  if (!Array.isArray(data)) {
    let branchName = "Unknown branch";
    const branch = await db.get("branches", "id", data.branchId);
    if (branch) {
      branchName = `${branch.name} (${branch.district})`;
    }

    return {
      ...data,
      branchName,
    };
  }

  /* ================= LIST USERS ================= */
  if (!Array.isArray(data) || data.length === 0) return [];

  /* ================= FILTER DELETED ================= */
  const users = data.filter(u => !u.deleted);

  /* ================= COLLECT UNIQUE BRANCH IDS ================= */
  const branchIds = [...new Set(users.map(u => u.branchId).filter(Boolean))];

  /* ================= FETCH BRANCHES ================= */
  const branchCache = {};
  await Promise.all(
    branchIds.map(async id => {
      const branch = await db.get("branches", "id", id);
      branchCache[id] = branch
        ? `${branch.name} (${branch.district})`
        : "Unknown branch";
    })
  );

  /* ================= ENRICH USERS ================= */
  return users.map(u => ({
    ...u,
    branchName: branchCache[u.branchId] || "Unknown branch",
  }));
};


/* ===================== SYSTEM LOCK ===================== */
const isSystemLocked = async () => {
  try {
    const configs = await db.get("system");
    // If no configs or empty array, system is unlocked (first run)
    if (!Array.isArray(configs) || configs.length === 0) {
      return { locked: false };
    }

    return { locked: configs?.[0].locked === true };

  } catch (err) {
    throw err; // rethrow the original error
  }
};

const setUpAdmin = async (data) => {
  if (!data) throw new Error("No data provided");

  const { name, email, password } = data;
  if (!name || !email || !password) {
    throw new Error("Missing required fields");
  }

  // 🔐 Ensure system is NOT already locked
  const system = await isSystemLocked();
  if (system?.locked) {
    throw new Error("System already initialized");
  }

  // 📧 Prevent duplicate users
  const existing = await fetchUsers("email", email);
  if (existing.length) {
    throw new Error("Email already in use");
  }

  // 👤 Create Firebase Auth user
  const cred = await auth.createUser({ email, password });

  // 📄 Create Firestore user with UID as doc ID
  const userDoc = {
    uid: cred.uid,
    firstName: "",
    lastName: name,
    contact: "",
    address: "",
    gender: "",
    email,
    role: "admin",
    active: true,
    date: new Date(),
  };

  await db.add("users", userDoc, cred.uid);

  // 🔒 LOCK SYSTEM (SINGLE SOURCE OF TRUTH)
  await db.add("system", {
    adminInitialized: true,
    locked: true,
  });

  // 🔑 Issue JWT
  const payload = {
    uid: cred.uid,
    name,
    role: "admin",
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });

  return {
    token,
    user: { id: cred.uid, ...userDoc },
  };
};

/* ===================== ADD USER ===================== */
const addUser = async (data) => {
  if (!data) throw new Error("No data provided");
  const {
    branchId,
    firstName,
    lastName,
    contact,
    gender,
    email,
    password,
    role,
  } = data;

  if (!email || !password || !firstName || !lastName || !role || !branchId) {
    throw new Error("Missing required fields");
  }

  const existing = await fetchUsers("email", email);
  if (existing.length) {
    throw new Error("Email already in use");
  }

  /* ===== LOCKED SYSTEM ===== */
  if (!["manager", "employee"].includes(role)) {
    throw new Error("Invalid role");
  }

  if (role === "manager") {
    const usersInBranch = await fetchUsers("branchId", branchId);
    const managerExists = usersInBranch.some(
      u => u.role === "manager" && !u.deleted
    );
    if (managerExists) {
      throw new Error("This branch already has a manager");
    }
  }

  const cred = await auth.createUser({ email, password });

  return await db.add(collectionName, {
    uid: cred.uid,
    firstName,
    lastName,
    contact,
    email,
    role,
    gender,
    branchId,
    active: true,
    date: new Date(),
  }, cred.uid);
};

/* ===================== UPDATE USER ===================== */
const updateUser = async (id, data) => {
  const existing = await fetchUsers("id", id);
  if (!existing) throw new Error("No user found");

 return await db.update(collectionName, id, { ...existing, ...data });
 
};

/* ===================== LOGIN ===================== */
const login = async (data) => {
  try {
    const { idToken } = data;
    if (!idToken) throw new Error("No token provided");

    const decoded = await auth.verifyIdToken(idToken);
    
    const user = await fetchUsers("id", decoded.uid);

    if (!user) {
      throw new Error("No user found");
    }

    if (user.deleted || user.active === false) {
      throw new Error("User account disabled");
    }

    const payload = {
      uid: user.uid,
      name: `${user.firstName.charAt(0)}. ${user.lastName}`,
      role: user.role,
      branchId: user?.branchId || null,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES,
    });

    return { token, user };
  } catch (err) {
    throw new Error(err);
    ;
  }
};




const processUser = async (payload) => {
  const { action, data, id, user } = payload;

  if (action !== "login" && action !== "setup" && action !== "update" &&  user?.role !== "admin") {
    throw new Error("Only admin can manage users");
  }

  switch (action) {
    case "setup":
      return setUpAdmin(data);

    case "add":
      return addUser(data);

    case "login":
      return login(data); 
    case "update":
    case "delete":
    case "restore":
      return updateUser(id, data);

    default:
      throw new Error("Unknown action");
  }
};


/* ===================== EXPORT ===================== */
export default {
  getUser,
  getEmployees,
  isSystemLocked,
  process: processUser,
};
