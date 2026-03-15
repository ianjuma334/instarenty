import dotenv from 'dotenv';
import connectDB from './config/db.js';
import initializeServer from './services/server.js';
import { getLocalIp } from './utils/getLocalIp.js';
import config from './config/index.js';
import { loadAmenities } from './services/amenityService.js';

dotenv.config();

const PORT = config.server.port;
const HOST = config.server.host;

// Start server and connect to DB
(async () => {
   await initializeServer(PORT, HOST);
   await connectDB();

   // Initialize amenities cache after DB connection
   await loadAmenities();

   const localIp = getLocalIp();
   console.log(`Local: http://localhost:${PORT}`);
   console.log(`Network: http://${localIp}:${PORT}`);
 })();
