import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const MINDSDB_HOST = process.env.MINDSDB_HOST || 'localhost';
const MINDSDB_PORT = process.env.MINDSDB_PORT || '47334';
const TRAINING_MODEL_NAME = process.env.TRAINING_MODEL_NAME || 'btc_price_predictor';

// MindsDB uses a MySQL-compatible interface, so we can use Sequelize to connect
const mindsdbSequelize = new Sequelize('mindsdb', 'mindsdb', '', {
  host: MINDSDB_HOST,
  port: parseInt(MINDSDB_PORT, 10),
  dialect: 'mysql', // MindsDB uses MySQL protocol
  logging: false,
});

interface MindsDBPrediction {
  predicted_close: number;
  [key: string]: any; // For other potential prediction columns
}

const connectMindsDB = async (): Promise<void> => {
  try {
    await mindsdbSequelize.authenticate();
    console.log('Connection to MindsDB has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to MindsDB:', error);
    // Do not exit process, MindsDB might start later
  }
};

const trainMindsDBModel = async (): Promise<void> => {
  try {
    // Ensure the MindsDB connection is active
    await mindsdbSequelize.authenticate();

    // Create a data source for the MariaDB database within MindsDB
    // This assumes MindsDB can reach the MariaDB container via its service name 'mariadb'
    const createDataSourceQuery = `
      CREATE DATABASE IF NOT EXISTS mariadb_datasource
      WITH ENGINE = 'mysql',
      PARAMETERS = {
        "host": "mariadb",
        "port": ${process.env.DB_PORT},
        "user": "${process.env.DB_USER}",
        "password": "${process.env.DB_PASSWORD}",
        "database": "${process.env.DB_NAME}"
      };
    `;
    await mindsdbSequelize.query(createDataSourceQuery);
    console.log('MindsDB data source for MariaDB created/verified.');

    // Train the model
    const trainModelQuery = `
      CREATE MODEL IF NOT EXISTS ${TRAINING_MODEL_NAME}
      FROM mariadb_datasource
      (SELECT timestamp, open, high, low, close, volume FROM btc_prices)
      PREDICT close
      ORDER BY timestamp
      GROUP BY NULL
      WINDOW 24
      HORIZON 1;
    `;
    await mindsdbSequelize.query(trainModelQuery);
    console.log(`MindsDB model '${TRAINING_MODEL_NAME}' training initiated/updated.`);
  } catch (error) {
    console.error('Error training MindsDB model:', error);
  }
};

const predictMindsDBPrice = async (): Promise<MindsDBPrediction | null> => {
  try {
    // Ensure the MindsDB connection is active
    await mindsdbSequelize.authenticate();

    // Get the latest data from btc_prices to use for prediction
    const latestPriceQuery = `
      SELECT timestamp, open, high, low, close, volume
      FROM mariadb_datasource.btc_prices
      ORDER BY timestamp DESC
      LIMIT 1;
    `;
    const [latestPriceResult] = await mindsdbSequelize.query(latestPriceQuery);

    if (!latestPriceResult || latestPriceResult.length === 0) {
      console.warn('No latest price data found for MindsDB prediction.');
      return null;
    }

    const latestData = latestPriceResult[0];

    // Predict using the trained model
    const predictQuery = `
      SELECT ${TRAINING_MODEL_NAME}.close as predicted_close
      FROM mariadb_datasource.btc_prices
      WHERE timestamp = '${new Date(latestData.timestamp).toISOString().slice(0, 19).replace('T', ' ')}';
    `;
    const [predictionResult] = await mindsdbSequelize.query(predictQuery);

    if (!predictionResult || predictionResult.length === 0) {
      console.warn('No prediction result from MindsDB.');
      return null;
    }

    return predictionResult[0] as MindsDBPrediction;
  } catch (error) {
    console.error('Error predicting with MindsDB model:', error);
    return null;
  }
};

export { connectMindsDB, trainMindsDBModel, predictMindsDBPrice, mindsdbSequelize };