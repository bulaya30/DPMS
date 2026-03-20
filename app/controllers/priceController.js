import db from "../db/db.js";

const collectionName = "pricing_rules";

async function resolveBirdPriceCore({ typeId, age = 0 }) {
  if (!typeId) throw new Error("Item type required");

  const rules = await db.get(collectionName, "typeId", typeId);
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

async function getPrices(user, field = null, value = null) {
  try {
    if (!user && user.role !== 'admin' && user.role !== 'manager') {
      throw new Error("Unauthorized");
    }
    return await fetchPrice(user, field, value);

  } catch (error) {
    throw new Error(error);
  }
}

// GET Price(s) — Admin Only
async function fetchPrice(user, field = null, value = null) {
  try {
    /* ================= AUTHORIZATION ================= */
    if (!user || !["admin", "manager"].includes(user.role)) {
      throw new Error("Not authorized");
    }
    
    /* ================= FETCH PRICES ================= */
    const prices = await db.get(collectionName, field, value);
    
    if (!prices || (Array.isArray(prices) && prices.length === 0)) {
      return field === "id" ? null : [];
    }

    /* ================= FETCH TYPES ================= */
    const types = await db.get("types");
    const typeMap = {};

    (types || []).forEach(t => {
      typeMap[t.id] = t.name;
    });

    /* ================= MAP TYPE NAME ================= */
    const mapType = p => ({
      ...p,
      typeName: typeMap[p.typeId] || "Unknown",
    });

    /* ================= RETURN RESULTS ================= */
    if (field === "id") {
      return prices ? mapType(prices) : null;
    }

    // Multiple prices - ensure it's an array
    const pricesArray = Array.isArray(prices) ? prices : [prices];
    
    return pricesArray.map(mapType);

  } catch (err) {
    throw new Error(err.message || err);
  }
}

/* ================= CREATE PRICING RULE ================= */
export async function addPricingRule(user, data) {
  if (user.role !== "admin") throw new Error("Access denied");

  const { item, typeId, ranges } = data;

  if (!item || !typeId) {
    throw new Error("Missing required pricing fields");
  }

  if (!Array.isArray(ranges) || ranges.length === 0) {
    throw new Error("No age ranges provided");
  }

  /* ===================== FETCH EXISTING RULES ===================== */
  const prices = (await fetchPrice(user, "typeId", typeId)) || [];
  const existing = prices.filter(p => p.item === item);

  /* ===================== RANGE COLLISION CHECK ===================== */
  for (const newRange of ranges) {
    const { minAge, maxAge, price } = newRange;

    if (minAge == null || maxAge == null || price == null) {
      throw new Error("Invalid age or price in range data");
    }

    if (Number(minAge) >= Number(maxAge)) {
      throw new Error("Min age must be less than max age");
    }

    for (const rule of existing) {
      for (const oldRange of rule.ranges || []) {
        const overlap =
          Number(minAge) <= Number(oldRange.maxAge) &&
          Number(maxAge) >= Number(oldRange.minAge);

        if (overlap) {
          throw new Error(
            `Conflicting pricing range: ${minAge}-${maxAge} overlaps with existing ${oldRange.minAge}-${oldRange.maxAge}`
          );
        }
      }
    }
  }

  /* ===================== SAVE RULE ===================== */
  const payload = {
    item,
    typeId,
    active: true,
    ranges: ranges.map(r => ({
      minAge: Number(r.minAge),
      maxAge: Number(r.maxAge),
      price: Number(r.price),
      currency: r.currency || "UGX",
    })),
    date: new Date(),
    createdAt: new Date(),
    createdBy: user.uid || null,
  };

  const docRef = await db.add(collectionName, payload);

  /* ===================== AUTO-REPRICE EXISTING BIRDS ===================== */
  if (item === "bird") {
    const birds = await db.get("birds", "typeId", typeId);

    for (const bird of birds || []) {
      if (!bird.active) continue;

      const age = Number(bird.age);
      if (isNaN(age)) continue;

      const pricing = await resolveBirdPriceCore({
        typeId,
        age,
      });

      if (pricing?.price != null) {
        await db.update("birds", bird.id, {
          price: pricing.price,
          currency: pricing.currency || "UGX",
          priceUpdatedAt: new Date(),
        });
      }
    }
  }

  return { id: docRef.id, ...payload };
}
/* ================= UPDATE PRICING RULE ================= */
export async function updatePricingRule(user, id, payload) {
  /* ================= AUTH ================= */
  if (user.role !== "admin") {
    throw new Error("Access denied");
  }

  const { item, typeId, ranges } = payload;

  if (!item || !typeId) {
    throw new Error("Missing required pricing fields");
  }

  if (!Array.isArray(ranges) || ranges.length === 0) {
    throw new Error("No age ranges provided");
  }

  /* ================= FETCH CURRENT ================= */
  const existing = await fetchPrice(user, "id", id);
  if (!existing) throw new Error("Pricing rule not found");

  /* ================= FETCH OTHER RULES ================= */
  const prices = (await fetchPrice(user, "typeId", typeId)) || [];
  const others = prices.filter(p => p.id !== id && p.item === item);

  /* ================= RANGE COLLISION CHECK ================= */
  for (const newRange of ranges) {
    const { minAge, maxAge } = newRange;

    if (minAge == null || maxAge == null) {
      throw new Error("Invalid age range data");
    }

    if (Number(minAge) >= Number(maxAge)) {
      throw new Error("Min age must be less than max age");
    }

    for (const rule of others) {
      for (const oldRange of rule.ranges || []) {
        const overlap =
          Number(minAge) <= Number(oldRange.maxAge) &&
          Number(maxAge) >= Number(oldRange.minAge);

        if (overlap) {
          throw new Error(
            `Conflicting pricing range: ${minAge}-${maxAge} overlaps with existing ${oldRange.minAge}-${oldRange.maxAge}`
          );
        }
      }
    }
  }

  /* ================= UPDATE RULE ================= */
  const updated = {
    ...existing,
    ...payload,
    ranges: ranges.map(r => ({
      minAge: Number(r.minAge),
      maxAge: Number(r.maxAge),
      price: Number(r.price),
      currency: r.currency || "UGX",
    })),
    updatedAt: new Date(),
    updatedBy: user?.uid || null,
  };

  await db.update(collectionName, id, updated);

  /* ================= AUTO-REPRICE EXISTING BIRDS ================= */
  if (item === "bird") {
    const birds = await db.get("birds", "typeId", typeId);

    for (const bird of birds || []) {
      if (!bird.active) continue;

      const age = Number(bird.age);
      if (isNaN(age)) continue;

      const pricing = await resolveBirdPriceCore({
        typeId,
        age,
      });

      if (pricing?.price != null) {
        await db.update("birds", bird.id, {
          price: pricing.price,
          currency: pricing.currency || "UGX",
          priceUpdatedAt: new Date(),
        });
      }
    }
  }

  return updated;
}




/* ================= DELETE PRICING RULE ================= */
export async function deletePricingRule(user, id) {
  // 🔐 Admin-only
  if (user.role !== "admin") {
    throw new Error("Access denied");
  }

  /* ================= FETCH RULE ================= */
  const existing = await fetchPrice(user, "id", id);

  if (!existing) {
    throw new Error("Pricing rule not found");
  }

  const { item, typeId } = existing;

  /* ================= CHECK SALES DEPENDENCY ================= */
  const sales = await fetchSalesByItemType(user, item, typeId);

  if (sales.length > 0) {
    throw new Error(
      "Cannot delete pricing rule. Sales already exist for this item type."
    );
  }

  /* ================= SOFT DELETE ================= */
  const updated = {
    ...existing,
    active: false,
    deletedAt: new Date(),
    deletedBy: user?.uid || null,
  };

  await db.update(collectionName, id, updated);

  return true;
}


async function fetchSalesByItemType(user, item, typeId) {

  if(user.role !== "admin") throw new Error("Access denied");

  const data = await db.get("sales", 'typeId', typeId);

  return (data || []).filter( s => s.item === item );
}

/* ===================== PROCESS ===================== */
async function process(payload) {
  if (!payload) throw new Error("Invalid data");
  const { data, action, id, user } = payload;
  if (!user || user.role !== 'admin') throw new Error("No user authenticated");
  switch (action) {
    case "add":
      return addPricingRule(user, data);
    case "update":
      return updatePricingRule(user, id, data);
    case "delete":
      return deletePricingRule(user, id);
    // case "restore":
    //   return restoreBird(user, id);
    default:
      throw new Error("Unknown action");
  }
}

/* ===================== EXPORT DEFAULT ===================== */
export default {
  getPrices,
 process,
};
