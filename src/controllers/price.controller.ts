import { Request, Response } from 'express';
import { BtcPrice } from '../models/btcPrice.model';
import { Signal } from '../models/signal.model';
import { trainMindsDBModel, predictMindsDBPrice } from '../services/mindsdb.service';
import { runHourlyJob } from '../cron/scheduler'; // For manual trigger

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const getLatestPrice = async (_req: Request, res: Response<ApiResponse<BtcPrice>>): Promise<void> => {
  try {
    const latestPrice = await BtcPrice.findOne({
      order: [['timestamp', 'DESC']],
    });

    if (!latestPrice) {
      res.status(404).json({ success: false, message: 'No BTC price data found.' });
      return;
    }

    res.status(200).json({ success: true, data: latestPrice });
  } catch (error) {
    console.error('Error fetching latest price:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const triggerMindsDBTraining = async (_req: Request, res: Response<ApiResponse<null>>): Promise<void> => {
  try {
    await trainMindsDBModel();
    res.status(200).json({ success: true, message: 'MindsDB model training triggered successfully.' });
  } catch (error) {
    console.error('Error triggering MindsDB training:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger MindsDB training.' });
  }
};

const triggerMindsDBPrediction = async (_req: Request, res: Response<ApiResponse<{ predictedPrice: number }>>): Promise<void> => {
  try {
    const prediction = await predictMindsDBPrice();
    if (!prediction) {
      res.status(500).json({ success: false, message: 'Failed to get prediction from MindsDB.' });
      return;
    }
    res.status(200).json({ success: true, data: { predictedPrice: prediction.predicted_close } });
  } catch (error) {
    console.error('Error triggering MindsDB prediction:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger MindsDB prediction.' });
  }
};

const getLatestSignal = async (_req: Request, res: Response<ApiResponse<Signal>>): Promise<void> => {
  try {
    const latestSignal = await Signal.findOne({
      order: [['timestamp', 'DESC']],
    });

    if (!latestSignal) {
      res.status(404).json({ success: false, message: 'No trading signal data found.' });
      return;
    }

    res.status(200).json({ success: true, data: latestSignal });
  } catch (error) {
    console.error('Error fetching latest signal:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const syncHistoricalData = async (_req: Request, res: Response<ApiResponse<null>>): Promise<void> => {
  try {
    // This will trigger the full hourly job logic, including fetching historical data
    // and saving it, then training/predicting/signaling.
    // For a true "sync historical data" endpoint, we might want to fetch more than just the latest.
    // For simplicity, we'll reuse the hourly job logic which fetches 200 hours.
    await runHourlyJob();
    res.status(200).json({ success: true, message: 'Historical data synchronization and signal generation triggered.' });
  } catch (error) {
    console.error('Error syncing historical data:', error);
    res.status(500).json({ success: false, error: 'Failed to sync historical data.' });
  }
};

export {
  getLatestPrice,
  triggerMindsDBTraining,
  triggerMindsDBPrediction,
  getLatestSignal,
  syncHistoricalData,
};