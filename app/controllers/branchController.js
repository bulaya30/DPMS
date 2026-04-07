
import db from "../db/db.js";
import { io } from "../app.js";
const col = 'branches';

async function getBranches(user, field = null, value = null) {
  // console.log(user)
  if (user.role === 'admin') return await fetchBranches(field, value);
  // console.log(user)
  return await fetchBranches('id', user.branchId, {includeInactive: false});
}


async function fetchBranches(
  field = "",
  value = "",
  options = { includeInactive: true }
) {
  try {
    let data;

    /* ---------- Fetch data ---------- */
    if (field) {
      data = await db.get(col, field, value);
    } else {
      data = await db.get(col);
    }

    /* ---------- Single branch by ID ---------- */
    if (field === "id") {
      if (!data) return null;

      if (!options.includeInactive && data.active === false) {
        return null;
      }

      const inUse = await isBranchInUse(data.id);

      return {
        ...data,
        inUse,
      };
    }

    /* ---------- Multiple branches ---------- */
    const filtered = data.filter(doc => {
      if (!options.includeInactive && doc.active === false) {
        return false;
      }
      return true;
    });

    const branchesWithUsage = await Promise.all(
      filtered.map(async (branch) => {
        const inUse = await isBranchInUse(branch.id);
        return {
          ...branch,
          inUse,
        };
      })
    );

    return branchesWithUsage;

  } catch (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
}

async function addBranch(branch) {
  if (!branch) {
    throw new Error("Invalid data");
  }

  const { name, district, city } = branch;

  if (!name || !district || !city) {
    throw new Error("Branch name, district, and city are required");
  }

  const branchKey = buildBranchKey(name, district, city);

  // 🔐 Single-field uniqueness check
  const exists = await db.exists(col, "branchKey", branchKey);

  if (exists) {
    throw new Error(
      "Branch already exists in this district and city"
    );
  }

  const payload = {
    ...branch,
    branchKey,
    active: true,
    date: new Date(),
    createdAt: new Date().toISOString(),
  };

  const docRef = await db.add(col, payload);

  io.emit("branchesUpdated");

  return { id: docRef.id, ...payload };
}

async function updateBranch(id, updates) {
  const { name, district, city } = updates;

  if (name && district && city) {
    const newKey = buildBranchKey(name, district, city);

    const exists = await db.exists(
      col,
      "branchKey",
      newKey,
    );

    if (exists) {
      throw new Error(
        "Another branch already exists in this location"
      );
    }
    if (exists.active === false && updates.restore !== true) {
      throw new Error('Cannot update an inactive type');
    }

    updates.branchKey = newKey;
  }
  delete updates.restore
  await db.update(col, id, updates);

  io.emit("branchesUpdated");

  return { id, ...updates };
}

async function deleteBranch(id) {
  if (!id) {
    throw new Error("Invalid branch id");
  }

  // 1. Confirm branch exists
  const branch = await db.exists(col, 'id', id);
  if (!branch) {
    throw new Error("Branch does not exist");
  }

  // 2. Prevent deletion if branch is in use
  const inUse = await isBranchInUse(id);
  if (inUse) {
    throw new Error(
      "Cannot delete branch because it is currently in use"
    );
  }

  // 3. Soft delete (deactivate)
  await db.update(col, id, {
    active: false,
    deletedAt: new Date().toISOString(),
  });


  io.emit("branchesUpdated");

  return {
    id,
    deleted: true,
  };
}


function buildBranchKey(name, district, city) {
  return `${name}_${district}_${city}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function isBranchInUse(branchId) {
  const checks = await Promise.all([
    db.exists("birds", "branchId", branchId),
    db.exists("eggs", "branchId", branchId),
    db.exists("feeds", "branchId", branchId),
    db.exists("inventories", "branchId", branchId),
    db.exists("sales", "branchId", branchId),
  ]);

  return checks.some(Boolean);
}



async function restoreBranch(id) {
  const branch = await db.update(col, id, {
    active: true,
    restoredAt: new Date().toISOString(),
  });

  io.emit("branchesUpdated");
  return { success: true}
}


async function process(payload) {
    if (!payload) { throw new Error('Invalid data'); }
    const {data, action, user, id} = payload;
    if ( user.role !== 'admin') {
      throw new Error('Only admin can manage branches');
    }

    // Process the data
    switch (action) {
        case 'add': {
          // return data
          return await addBranch(data);
        }
        break;
        case 'update':
          // return field.data
            return await updateBranch(id, data);
        break;
        case 'delete':
          return await deleteBranch(id);
          break;

        case 'restore':
          return await restoreBranch(id);
          break;

        default:
        break;
    }
    return payload;
}

export default {
    getBranches,
    process
};
