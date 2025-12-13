import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connectDB } from './config/db.js';

import path from 'path';
import { fileURLToPath } from 'url';

import userRouter from './routes/userRoute.js';
import cartRouter from './routes/cartRoute.js';
import itemRouter from './routes/itemRoute.js';
import orderRouter from './routes/orderRoute.js';

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ✅ CORS — FIXED */
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://plateful123.netlify.app',
      'https://platefuladmin.netlify.app' // 🔥 MISSING BEFORE
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

/* ✅ Preflight */
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ✅ MongoDB — MUST NOT EXIT */
connectDB().catch(err => {
  console.error('MongoDB connection error:', err.message);
  // ❌ DO NOT process.exit()
});

/* Routes */
app.use('/api/user', userRouter);
app.use('/api/cart', cartRouter);
app.use('/api/items', itemRouter);
app.use('/api/orders', orderRouter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* Health check */
app.get('/', (req, res) => {
  res.status(200).send('API WORKING');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
