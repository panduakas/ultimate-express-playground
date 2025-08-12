import { Router } from 'express';
import {
  getLatestPrice,
  triggerMindsDBTraining,
  triggerMindsDBPrediction,
  getLatestSignal,
  syncHistoricalData,
} from '../controllers/price.controller';

const router = Router();

router.get('/price/latest', getLatestPrice);
router.post('/mindsdb/train', triggerMindsDBTraining);
router.post('/mindsdb/predict', triggerMindsDBPrediction);
router.get('/signal/latest', getLatestSignal);
router.post('/data/sync', syncHistoricalData);

export { router as apiRoutes };