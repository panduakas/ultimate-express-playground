import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface BinanceKlinesResponse {
  [key: number]: [
    number, // Open time
    string, // Open
    string, // High
    string, // Low
    string, // Close
    string, // Volume
    number, // Close time
    string, // Quote asset volume
    number, // Number of trades
    string, // Taker buy base asset volume
    string, // Taker buy quote asset volume
    string, // Ignore
  ];
}

interface BtcPriceData {
  timestamp: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

const BINANCE_API_URL = process.env.BINANCE_API_URL || 'https://api.binance.com/api/v3';

const getLatestBtcPrice = async (): Promise<BtcPriceData | null> => {
  try {
    // Fetch 1-minute klines to get the latest price, then take the last one
    const response = await axios.get<BinanceKlinesResponse>(
      `${BINANCE_API_URL}/klines?symbol=BTCUSDT&interval=1m&limit=1`
    );

    if (!response.data || response.data.length === 0) {
      console.warn('No data received from Binance API.');
      return null;
    }

    const kline = response.data[0];
    const [openTime, open, high, low, close, volume] = kline;

    return {
      timestamp: new Date(openTime),
      open,
      high,
      low,
      close,
      volume,
    };
  } catch (error) {
    console.error('Error fetching BTC price from Binance:', error);
    return null;
  }
};

const getHistoricalBtcPrices = async (
  interval: string = '1h',
  limit: number = 500
): Promise<BtcPriceData[]> => {
  try {
    const response = await axios.get<BinanceKlinesResponse>(
      `${BINANCE_API_URL}/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`
    );

    if (!response.data || response.data.length === 0) {
      console.warn('No historical data received from Binance API.');
      return [];
    }

    return response.data.map((kline) => {
      const [openTime, open, high, low, close, volume] = kline;
      return {
        timestamp: new Date(openTime),
        open,
        high,
        low,
        close,
        volume,
      };
    });
  } catch (error) {
    console.error('Error fetching historical BTC prices from Binance:', error);
    return [];
  }
};

export { getLatestBtcPrice, getHistoricalBtcPrices, BtcPriceData };