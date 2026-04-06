import 'dotenv/config';
import express from 'express';
import vaccinationReminder from './controllers/vaccinationReminder.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import webRoutes from './routes/web.js';

setInterval(vaccinationReminder,  20 * 60 * 1000); // every 20 Minutes

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* ================= API ================= */
app.use('/api', webRoutes);

/* ================= STATIC ================= */
app.use(express.static(path.join(__dirname, '../dist')));

/* ================= SPA FALLBACK (EXPRESS 5 SAFE) ================= */
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
