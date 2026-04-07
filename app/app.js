import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

import vaccinationReminder from './controllers/vaccinationReminder.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import webRoutes from './routes/web.js';

/* ================= INTERVAL TASK ================= */
setInterval(vaccinationReminder, 20 * 60 * 1000); // every 20 Minutes

/* ================= PATH SETUP ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= APP INIT ================= */
const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* ================= API ================= */
app.use('/api', webRoutes);

/* ================= STATIC ================= */
app.use(express.static(path.join(__dirname, '../dist')));

/* ================= SPA FALLBACK ================= */
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

/* ================= SERVER + SOCKET.IO ================= */
const PORT = process.env.PORT || 5000;

// 👇 create HTTP server from Express app
const server = http.createServer(app);

// create Socket.IO serve  r
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
});

// handle socket connections
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

// 👇 export io so controllers can use it
export { io };

/* ================= START SERVER ================= */
server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});