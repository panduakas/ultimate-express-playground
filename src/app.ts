import express from 'ultimate-express';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { startScheduler } from './cron/scheduler';
import { apiRoutes } from './routes'; // Import the routes

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // For parsing application/json

// Routes
app.use('/api', apiRoutes);

// Basic health check
app.get('/', (_req, res) => {
  res.status(200).json({ message: 'Ultimate Express Playground API is running!' });
});

const startServer = async (): Promise<void> => {
  await connectDB(); // Connect to MariaDB
  // No need to connect to MindsDB here, it's handled within mindsdb.service
  startScheduler(); // Start the cron scheduler

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();