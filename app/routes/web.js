import express from 'express';
import authMiddleware from '../middlewares/auth.js';

// Controllers
import branchController from '../controllers/branchController.js';
import typeController from '../controllers/typeController.js';
import birdController from '../controllers/birdController.js';
import feedController from '../controllers/feedController.js';
import eggController from '../controllers/eggController.js';
import vaccinationController from '../controllers/vaccinationController.js';
import scheduleController from '../controllers/vaccinScheduleController.js';
import saleController from '../controllers/saleController.js';
import inventoryController from '../controllers/inventoryController.js';
import userController from '../controllers/userController.js';
import stockController from '../controllers/stockController.js';
import lossController from '../controllers/lossController.js';
import priceController from '../controllers/priceController.js'

const router = express.Router();

/* ================= HELPERS ================= */
function getFieldAndValue(query) {
  const keys = Object.keys(query);
  if (keys.length === 1) {
    return { field: keys[0], value: query[keys[0]] };
  }
  return { field: null, value: null };
}

// tiny reusable GET route helper
function createGetRoute(router, path, controller, methodName, guard = authMiddleware()) {
  router.get(path, guard, async (req, res) => {
    try {
      const { field, value } = getFieldAndValue(req.query);
      const result = await controller[methodName](req.user, field, value);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
}


/* ================= SYSTEM ================= */
router.get('/system/lock-status', authMiddleware(false), async (_, res) => {
  try {
    const locked = await userController.isSystemLocked();
    res.json(locked);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= USERS ================= */
router.get('/users', authMiddleware(), async (req, res) => {
  try {
    const { field, value } = getFieldAndValue(req.query);
    const users = await userController.getUser(req.user, field, value);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/env', async (_, res) => {
  try {
    const env = await inventoryController.makeInventory({collection: 'bird', typeId: 'vjQqZxMLjsV2V1QHrkyi', branchId: 'G4QwDl4UekM37Fybunrp'});
    res.json(env);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
})
router.get('/employees', authMiddleware(), async (req, res) => {
  try {
    const users = await userController.getEmployees(req.user);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= CONTROLLERS TABLE ================= */
const tables = {
  branches: { controller: branchController, method: 'getBranches' },
  types: { controller: typeController, method: 'getTypes' },
  birds: { controller: birdController, method: 'getBirds' },
  feeds: { controller: feedController, method: 'getFeeds' },
  eggs: { controller: eggController, method: 'getEggs' },
  vaccinations: { controller: vaccinationController, method: 'getVaccinations' },
  schedules: { controller: scheduleController, method: 'getSchedules' },
  sales: { controller: saleController, method: 'getSales' },
  dailySales: { controller: saleController, method: 'getDailySales' },
  inventories: { controller: inventoryController, method: 'getInventories' },
  stocks: { controller: stockController, method: 'getStoks' },
  losses: { controller: lossController, method: 'getLosses' },
  ledgers: { controller: stockController, method: 'getLedgers' },
  prices: {controller: priceController, method: 'getPrices'}
};

/* ================= GENERIC TABLE ROUTES ================= */
Object.entries(tables).forEach(([path, { controller, method }]) => {
  createGetRoute(router, `/${path}`, controller, method);
});

/* ================= PROCESS ACTIONS ================= */
router.post('/process', async (req, res) => {
  const { action, collection } = req.body;
  try {
    const controller =
    collection === 'users'
    ? userController
    : tables[collection]?.controller;
    
    // return res.json(!controller);
    if (!controller) {
      return res.status(400).json({ message: 'Invalid collection' });
    }

    if (action === 'login' || action === 'setup') {
      const result = await controller.process({
        ...req.body,
        user: req.user?.[0],
      });
      return res.json(result);
    }

    authMiddleware()(req, res, async () => {
      try {
        const result = await controller.process({
          ...req.body,
          user: req.user,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= FALLBACK ================= */
router.use((_, res) => {
  res.status(404).json({ message: 'API route not found' });
});

export default router;
