import "dotenv/config";
import admin from "firebase-admin";
// import serviceAccount from "../config/serviceAccount2.json" with { type: "json" };

/* ===================== FIREBASE INIT ===================== */
// if(!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
//   })
// }

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const firestore = admin.firestore();
const auth = admin.auth();
const BATCH_SIZE = 50; 

function cleanUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}


/* ===================== HELPERS ===================== */
const add = async (collection, data, docId = null) => {
  try {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid data provided");
    }
  
    const payload = {
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
  
    const col = firestore.collection(collection);
  
    if (docId) {
      await col.doc(docId).set(payload);
      return { id: docId, ...data };
    }
  
    const docRef = await col.add(payload);
    return { id: docRef.id, ...data };
    
  } catch (error) {
    throw error
  }
};

const get = async (
  collection,
  field = null,
  value = null,
  options = {}
) => {
  try {
    const {
      orderByField = "createdAt",
      orderDirection = "desc",
      limit = BATCH_SIZE,
      page = 1,
    } = options;

    const col = firestore.collection(collection);

    /* ===== GET BY DOCUMENT ID ONLY ===== */
    if (field === "id" && value) {
      const doc = await col.doc(value).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    let query = col;

    /* ===== FILTER ===== */
    if (field && value !== null && value !== undefined) {
      query = query.where(field, "==", value);
    }

    /* ===== ORDER (ONLY WHEN NO FILTER) ===== */
    if (!field && orderByField) {
      query = query.orderBy(orderByField, orderDirection);
    }

    /* ===== PAGINATION ===== */
    if (limit) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
   throw err
  }
};




const update = async (collection, id, data) => {
  try {
    const cleanedData = cleanUndefined(data)
    await firestore.collection(collection).doc(id).update({
      ...cleanedData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
    
  } catch (error) {
    throw error
  }
};

const remove = async (collection, id) => {
  try {
    await firestore.collection(collection).doc(id).delete();
    return true;
    
  } catch (error) {
    throw error
  }
};

const exists = async (collection, field, value) => {
  try {
    if (field === "id") {
      const doc = await firestore.collection(collection).doc(value).get();
      return doc.exists;
    }
  
    const snap = await firestore
      .collection(collection)
      .where(field, "==", value)
      .limit(1)
      .get();
  
    return !snap.empty;
    
  } catch (error) {
    throw error
  }
};

/* ===================== EXPORT ===================== */
export default {
  add,
  get,
  update,
  remove,
  exists,
};

export { auth };
