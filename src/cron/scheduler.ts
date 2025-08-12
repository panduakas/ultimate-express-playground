import cron from 'node-cron';
import { getLatestBtcPrice, getHistoricalBtcPrices } from '../services/binance.service';
import { BtcPrice } from '../models/btcPrice.model';
import { trainMindsDBModel, predictMindsDBPrice } from '../services/mindsdb.service';
import { generateTradingSignal } from '../strategies/tradingStrategy.service';
import { Signal } from '../models/signal.model';
import dotenv from 'dotenv';

dotenv.config();

const CRON_EXPRESSION = process.env.CRON_EXPRESSION || '0 * * * *'; // Every hour

const runHourlyJob = async (): Promise<void> => {
  const jobTimestamp = new Date();
  console.log(`[${jobTimestamp.toISOString()}] Running hourly job...`);

  try {
    // 1. Ambil data harga terbaru dari Binance
    const latestPrice = await getLatestBtcPrice();
    if (!latestPrice) {
      console.error('Failed to fetch latest BTC price. Skipping job.');
      return;
    }

    // 2. Simpan data historis ke tabel btc_prices
    await BtcPrice.upsert(latestPrice); // Use upsert to avoid duplicates on timestamp
    console.log(`[${jobTimestamp.toISOString()}] Saved latest BTC price: ${latestPrice.close}`);

    // Fetch enough historical data for strategies (e.g., 200 hours for 200-period MA)
    const historicalPrices = await getHistoricalBtcPrices('1h', 200);
    if (historicalPrices.length === 0) {
      console.warn('No historical prices available for strategy calculation. Skipping signal generation.');
      return;
    }

    // 3. Jalankan training MindsDB (jika ada data baru)
    // MindsDB handles incremental training, so we just call train
    await trainMindsDBModel();
    console.log(`[${jobTimestamp.toISOString()}] MindsDB model training triggered.`);

    // 4. Prediksi harga
    const prediction = await predictMindsDBPrice();
    const predictedPrice = prediction ? prediction.predicted_close : parseFloat(latestPrice.close); // Fallback to current price if prediction fails
    console.log(`[${jobTimestamp.toISOString()}] Predicted price: ${predictedPrice.toFixed(2)}`);

    // 5. Hitung sinyal trading (AI + strategi teknikal)
    const { finalSignal, details } = generateTradingSignal(historicalPrices, predictedPrice);
    console.log(`[${jobTimestamp.toISOString()}] Generated signal: ${finalSignal}`);

    // 6. Simpan hasil ke tabel signals
    await Signal.upsert({
      timestamp: jobTimestamp,
      predictedPrice: predictedPrice.toFixed(8),
      signal: finalSignal,
      strategyDetails: JSON.stringify(details),
    });
    console.log(`[${jobTimestamp.toISOString()}] Saved signal to database.`);

    // 7. Log ke console
    console.log(`[${jobTimestamp.toISOString()}] Signal: ${finalSignal}, Predicted: ${predictedPrice.toFixed(2)}`);
  } catch (error) {
    console.error(`[${jobTimestamp.toISOString()}] Error during hourly job execution:`, error);
  }
};

const startScheduler = (): void => {
  console.log(`Starting scheduler with cron expression: '${CRON_EXPRESSION}'`);
  cron.schedule(CRON_EXPRESSION, runHourlyJob, {
    scheduled: true,
    timezone: 'UTC', // Ensure consistent timezone
  });
};

export { startScheduler, runHourlyJob }; // Export runHourlyJob for manual trigger via API