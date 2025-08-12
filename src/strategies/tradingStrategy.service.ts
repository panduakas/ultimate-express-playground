import { BtcPriceData } from '../services/binance.service';
import { SignalType } from '../models/signal.model';

interface StrategyOutput {
  strategy: string;
  signal: SignalType;
  reason: string;
}

interface EnsembleResult {
  finalSignal: SignalType;
  details: StrategyOutput[];
}

// Helper to calculate Simple Moving Average (SMA)
const _calculateSMA = (prices: number[], period: number): number => {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
  return sum / period;
};

// Helper to calculate Exponential Moving Average (EMA)
const _calculateEMA = (prices: number[], period: number): number => {
  if (prices.length < period) return 0;
  const k = 2 / (period + 1);
  let ema = _calculateSMA(prices.slice(0, period), period); // Initialize with SMA

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * k + ema;
  }
  return ema;
};

// Helper to calculate Relative Strength Index (RSI)
const _calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 0; // Need at least period + 1 data points for first average gain/loss

  const priceChanges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    priceChanges.push(prices[i] - prices[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (priceChanges[i] > 0) {
      avgGain += priceChanges[i];
    } else {
      avgLoss += Math.abs(priceChanges[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < priceChanges.length; i++) {
    const change = priceChanges[i];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      avgGain = (avgGain * (period - 1)) / period;
    }
  }

  if (avgLoss === 0) return 100; // Avoid division by zero
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const movingAverageCrossover = (
  prices: BtcPriceData[],
  shortPeriod: number = 10,
  longPeriod: number = 50
): StrategyOutput => {
  const closes = prices.map((p) => parseFloat(p.close));
  if (closes.length < longPeriod) {
    return { strategy: 'MAC', signal: 'HOLD', reason: 'Insufficient data for MA Crossover.' };
  }

  const shortMA = _calculateSMA(closes, shortPeriod);
  const longMA = _calculateSMA(closes, longPeriod);

  // Check previous values to determine crossover
  const prevCloses = prices.slice(0, prices.length - 1).map((p) => parseFloat(p.close));
  const prevShortMA = _calculateSMA(prevCloses, shortPeriod);
  const prevLongMA = _calculateSMA(prevCloses, longPeriod);

  if (shortMA > longMA && prevShortMA <= prevLongMA) {
    return { strategy: 'MAC', signal: 'BUY', reason: 'Short MA crossed above Long MA.' };
  } else if (shortMA < longMA && prevShortMA >= prevLongMA) {
    return { strategy: 'MAC', signal: 'SELL', reason: 'Short MA crossed below Long MA.' };
  }
  return { strategy: 'MAC', signal: 'HOLD', reason: 'No MA crossover detected.' };
};

const rsiMomentum = (prices: BtcPriceData[], period: number = 14): StrategyOutput => {
  const closes = prices.map((p) => parseFloat(p.close));
  if (closes.length < period + 1) {
    return { strategy: 'RSI', signal: 'HOLD', reason: 'Insufficient data for RSI.' };
  }

  const rsi = _calculateRSI(closes, period);

  if (rsi > 70) {
    return { strategy: 'RSI', signal: 'SELL', reason: `RSI (${rsi.toFixed(2)}) is overbought.` };
  } else if (rsi < 30) {
    return { strategy: 'RSI', signal: 'BUY', reason: `RSI (${rsi.toFixed(2)}) is oversold.` };
  }
  return { strategy: 'RSI', signal: 'HOLD', reason: `RSI (${rsi.toFixed(2)}) is neutral.` };
};

// Simplified Scalping: Look for quick small price changes
const scalping = (prices: BtcPriceData[]): StrategyOutput => {
  if (prices.length < 2) {
    return { strategy: 'Scalping', signal: 'HOLD', reason: 'Insufficient data for scalping.' };
  }
  const latestClose = parseFloat(prices[prices.length - 1].close);
  const prevClose = parseFloat(prices[prices.length - 2].close);
  const priceChange = (latestClose - prevClose) / prevClose; // Percentage change

  const threshold = 0.0005; // 0.05% change

  if (priceChange > threshold) {
    return { strategy: 'Scalping', signal: 'BUY', reason: `Price increased by ${priceChange.toFixed(4)}%.` };
  } else if (priceChange < -threshold) {
    return { strategy: 'Scalping', signal: 'SELL', reason: `Price decreased by ${priceChange.toFixed(4)}%.` };
  }
  return { strategy: 'Scalping', signal: 'HOLD', reason: 'No significant short-term price change.' };
};

// Simplified Swing/Day Trading: Based on recent high/low
const swingDayTrading = (prices: BtcPriceData[], lookbackPeriod: number = 24): StrategyOutput => {
  if (prices.length < lookbackPeriod) {
    return { strategy: 'Swing/Day', signal: 'HOLD', reason: 'Insufficient data for Swing/Day Trading.' };
  }

  const recentPrices = prices.slice(-lookbackPeriod);
  const closes = recentPrices.map((p) => parseFloat(p.close));
  const highs = recentPrices.map((p) => parseFloat(p.high));
  const lows = recentPrices.map((p) => parseFloat(p.low));

  const currentClose = closes[closes.length - 1];
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);

  const resistanceThreshold = maxHigh * 0.99; // 1% below recent high
  const supportThreshold = minLow * 1.01; // 1% above recent low

  if (currentClose > resistanceThreshold) {
    return { strategy: 'Swing/Day', signal: 'SELL', reason: `Price (${currentClose.toFixed(2)}) near resistance (${maxHigh.toFixed(2)}).` };
  } else if (currentClose < supportThreshold) {
    return { strategy: 'Swing/Day', signal: 'BUY', reason: `Price (${currentClose.toFixed(2)}) near support (${minLow.toFixed(2)}).` };
  }
  return { strategy: 'Swing/Day', signal: 'HOLD', reason: 'Price is within recent range.' };
};

// Trend Following: Long-term MA crossover (similar to MAC but with longer periods)
const trendFollowing = (
  prices: BtcPriceData[],
  shortPeriod: number = 50,
  longPeriod: number = 200
): StrategyOutput => {
  const closes = prices.map((p) => parseFloat(p.close));
  if (closes.length < longPeriod) {
    return { strategy: 'TrendFollowing', signal: 'HOLD', reason: 'Insufficient data for Trend Following.' };
  }

  const shortMA = _calculateSMA(closes, shortPeriod);
  const longMA = _calculateSMA(closes, longPeriod);

  // Check previous values to determine crossover
  const prevCloses = prices.slice(0, prices.length - 1).map((p) => parseFloat(p.close));
  const prevShortMA = _calculateSMA(prevCloses, shortPeriod);
  const prevLongMA = _calculateSMA(prevCloses, longPeriod);

  if (shortMA > longMA && prevShortMA <= prevLongMA) {
    return { strategy: 'TrendFollowing', signal: 'BUY', reason: 'Short-term MA crossed above Long-term MA (bullish).' };
  } else if (shortMA < longMA && prevShortMA >= prevLongMA) {
    return { strategy: 'TrendFollowing', signal: 'SELL', reason: 'Short-term MA crossed below Long-term MA (bearish).' };
  }
  return { strategy: 'TrendFollowing', signal: 'HOLD', reason: 'No significant long-term trend change.' };
};

// Range/Reversal Trading: When price is within a defined range
const rangeReversalTrading = (
  prices: BtcPriceData[],
  rangePercentage: number = 0.02, // 2% range
  lookbackPeriod: number = 48 // 48 hours
): StrategyOutput => {
  if (prices.length < lookbackPeriod) {
    return { strategy: 'Range/Reversal', signal: 'HOLD', reason: 'Insufficient data for Range/Reversal Trading.' };
  }

  const recentCloses = prices.slice(-lookbackPeriod).map((p) => parseFloat(p.close));
  const maxPrice = Math.max(...recentCloses);
  const minPrice = Math.min(...recentCloses);
  const currentPrice = recentCloses[recentCloses.length - 1];

  const range = maxPrice - minPrice;
  const isRanging = range < (maxPrice * rangePercentage);

  if (isRanging) {
    // If ranging, buy near bottom, sell near top
    const lowerBound = minPrice + (range * 0.2); // 20% from bottom
    const upperBound = maxPrice - (range * 0.2); // 20% from top

    if (currentPrice <= lowerBound) {
      return { strategy: 'Range/Reversal', signal: 'BUY', reason: `Price (${currentPrice.toFixed(2)}) is near range bottom (${minPrice.toFixed(2)}).` };
    } else if (currentPrice >= upperBound) {
      return { strategy: 'Range/Reversal', signal: 'SELL', reason: `Price (${currentPrice.toFixed(2)}) is near range top (${maxPrice.toFixed(2)}).` };
    }
  }
  return { strategy: 'Range/Reversal', signal: 'HOLD', reason: 'Not in a clear range or no reversal opportunity.' };
};

// Ensemble Logic: Simple voting mechanism
const ensembleTradingSignals = (
  strategyOutputs: StrategyOutput[],
  predictedPrice: number,
  currentPrice: number
): EnsembleResult => {
  let buyVotes = strategyOutputs.filter((s) => s.signal === 'BUY').length;
  let sellVotes = strategyOutputs.filter((s) => s.signal === 'SELL').length;
  const holdVotes = strategyOutputs.filter((s) => s.signal === 'HOLD').length;

  let finalSignal: SignalType = 'HOLD';
  let reason = 'No clear consensus from strategies.';

  // Consider predicted price as a strong vote
  if (predictedPrice > currentPrice * 1.005) { // Predicted 0.5% higher
    buyVotes += 1;
    reason = 'Predicted price significantly higher.';
  } else if (predictedPrice < currentPrice * 0.995) { // Predicted 0.5% lower
    sellVotes += 1;
    reason = 'Predicted price significantly lower.';
  }

  if (buyVotes > sellVotes && buyVotes > holdVotes) {
    finalSignal = 'BUY';
    reason = 'Majority of strategies indicate BUY.';
  } else if (sellVotes > buyVotes && sellVotes > holdVotes) {
    finalSignal = 'SELL';
    reason = 'Majority of strategies indicate SELL.';
  } else if (buyVotes === sellVotes && buyVotes > 0) {
    finalSignal = 'HOLD'; // Tie-breaker, prefer HOLD
    reason = 'Strategies are split, resulting in HOLD.';
  }

  return { finalSignal, details: strategyOutputs };
};

const generateTradingSignal = (
  historicalPrices: BtcPriceData[],
  predictedPrice: number
): EnsembleResult => {
  const currentPrice = parseFloat(historicalPrices[historicalPrices.length - 1].close);

  const strategyOutputs: StrategyOutput[] = [
    movingAverageCrossover(historicalPrices),
    rsiMomentum(historicalPrices),
    scalping(historicalPrices),
    swingDayTrading(historicalPrices),
    trendFollowing(historicalPrices),
    rangeReversalTrading(historicalPrices),
  ];

  return ensembleTradingSignals(strategyOutputs, predictedPrice, currentPrice);
};

export { generateTradingSignal, StrategyOutput, EnsembleResult };