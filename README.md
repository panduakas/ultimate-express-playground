# Ultimate Express TypeScript Microservice for BTC Trading Signals

This project is a full-fledged backend microservice built with TypeScript, designed to fetch Bitcoin price data, train an AI model using MindsDB, predict future prices, and generate automated trading signals based on a combination of AI output and popular trading strategies. It's fully Dockerized for easy setup and deployment.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Running with Docker Compose](#running-with-docker-compose)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Trading Strategies](#trading-strategies)
- [Scheduler (Cron)](#scheduler-cron)
- [MindsDB Integration](#mindsdb-integration)
- [Project Structure](#project-structure)
- [Linting and Formatting](#linting-and-formatting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Bitcoin Price Data Acquisition:** Fetches real-time and historical BTCUSDT price data from Binance API.
- **Historical Data Storage:** Persists historical price data in a MariaDB database.
- **AI-Powered Price Prediction:** Integrates with MindsDB to train and predict future Bitcoin prices based on historical data.
- **Automated Trading Signals:** Generates BUY, SELL, or HOLD signals by combining MindsDB predictions with multiple popular technical trading strategies.
- **Ensemble Logic:** Uses a voting mechanism to combine signals from various strategies for a robust final decision.
- **Scheduled Operations:** An hourly cron job automatically fetches data, updates the AI model, predicts prices, and generates signals.
- **RESTful API:** Provides endpoints for fetching latest data, triggering manual operations, and retrieving signals.
- **Dockerized:** Easy setup and deployment using `docker-compose` for the application, MariaDB, and MindsDB.
- **Clean Code:** Adheres to strict TypeScript, ESLint, and Prettier conventions for maintainability and consistency.
- **Comprehensive Documentation:** Markdown documentation for each module and a detailed `README.md`.

## Architecture

The microservice follows a layered architecture:

- **`src/app.ts`**: The entry point, setting up the Express server and initiating database connection and scheduler.
- **`src/config`**: Database connection configuration.
- **`src/models`**: Sequelize models defining the database schema (`btc_prices`, `signals`).
- **`src/services`**: Contains business logic for interacting with external APIs (Binance, MindsDB) and core functionalities.
- **`src/strategies`**: Implements various technical trading strategies and the ensemble logic for signal generation.
- **`src/cron`**: Manages the hourly scheduled tasks.
- **`src/controllers`**: Handles incoming API requests, orchestrating calls to services and models.
- **`src/routes`**: Defines API endpoints and maps them to controllers.
- **`src/utils`**: Utility functions (currently not explicitly used, but reserved for future common helpers).

## Tech Stack

- **Backend Framework:** Express.js
- **Language:** TypeScript
- **Runtime:** Bun (for development and Docker image)
- **ORM:** Sequelize
- **Database:** MariaDB
- **AI Integration:** MindsDB
- **Scheduler:** `node-cron`
- **HTTP Client:** Axios
- **Linting/Formatting:** ESLint, Prettier
- **Containerization:** Docker, Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on your system.
- Bun (optional, for local development outside Docker).

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ultimate-express-playground.git
    cd ultimate-express-playground
    ```

2.  **Create `.env` file:**
    Copy the `.env.example` file and rename it to `.env`.
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file with your desired configurations.

    ```env
    PORT=3000
    BINANCE_API_URL=https://api.binance.com/api/v3
    DB_HOST=mariadb # This should match the service name in docker-compose.yml
    DB_PORT=3306
    DB_USER=user
    DB_PASSWORD=password
    DB_NAME=btc_trading
    MINDSDB_HOST=mindsdb # This should match the service name in docker-compose.yml
    MINDSDB_PORT=47334
    CRON_EXPRESSION="0 * * * *" # Every hour (e.g., "*/5 * * * *" for every 5 minutes for testing)
    TRAINING_MODEL_NAME=btc_price_predictor
    ```

### Running with Docker Compose

This is the recommended way to run the entire stack (app, MariaDB, MindsDB).

1.  **Build and run the services:**
    ```bash
    docker-compose up --build -d
    ```
    - `--build`: Builds the Docker images (necessary on first run or after code changes).
    - `-d`: Runs the containers in detached mode (in the background).

2.  **Verify containers are running:**
    ```bash
    docker-compose ps
    ```
    You should see `app`, `mariadb`, and `mindsdb` containers in a healthy state.

3.  **Access the application:**
    The Express API will be available at `http://localhost:3000`.

4.  **View logs:**
    To see the application logs (including cron job output):
    ```bash
    docker-compose logs -f app
    ```

5.  **Stop the services:**
    ```bash
    docker-compose down
    ```
    This will stop and remove the containers, networks, and volumes (unless volumes are explicitly named and not removed with `-v`).

## Configuration

All configurable parameters are managed via environment variables in the `.env` file.

- `PORT`: Port for the Express API.
- `BINANCE_API_URL`: Base URL for the Binance API.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: MariaDB connection details.
- `MINDSDB_HOST`, `MINDSDB_PORT`: MindsDB connection details.
- `CRON_EXPRESSION`: Cron expression for the hourly scheduler (e.g., `"0 * * * *"` for every hour).
- `TRAINING_MODEL_NAME`: Name of the MindsDB model to be trained.

## API Endpoints

All endpoints are prefixed with `/api`.

- `GET /api/price/latest`: Get the latest stored Bitcoin price data.
  - Response: `{ success: true, data: BtcPriceObject }`
- `POST /api/mindsdb/train`: Manually trigger MindsDB model training.
  - Response: `{ success: true, message: "MindsDB model training triggered successfully." }`
- `POST /api/mindsdb/predict`: Manually trigger MindsDB price prediction.
  - Response: `{ success: true, data: { predictedPrice: number } }`
- `GET /api/signal/latest`: Get the latest generated trading signal.
  - Response: `{ success: true, data: SignalObject }`
- `POST /api/data/sync`: Manually trigger historical data synchronization and subsequent signal generation (runs the hourly job logic).
  - Response: `{ success: true, message: "Historical data synchronization and signal generation triggered." }`

## Trading Strategies

The `src/strategies/tradingStrategy.service.ts` file implements and combines the following strategies:

- **Moving Average Crossover (MAC):** Compares a short-period SMA/EMA with a long-period SMA/EMA.
- **RSI Momentum:** Uses the Relative Strength Index to identify overbought/oversold conditions.
- **Scalping:** Looks for small, rapid price changes.
- **Swing / Day Trading:** Identifies opportunities based on recent support and resistance levels.
- **Trend Following:** Uses longer-term moving average crossovers to identify prevailing trends.
- **Range / Reversal Trading:** Detects sideways markets and signals trades near range boundaries.

An **ensemble logic** (simple voting) combines the outputs of these strategies with the MindsDB prediction to generate a final `BUY`, `SELL`, or `HOLD` signal.

## Scheduler (Cron)

The `src/cron/scheduler.ts` module uses `node-cron` to run a job every hour (configurable via `CRON_EXPRESSION`). This job performs the following sequence:

1.  Fetches the latest Bitcoin price from Binance.
2.  Saves the price data to the `btc_prices` table.
3.  Triggers MindsDB model training (MindsDB handles incremental updates).
4.  Requests a price prediction from MindsDB.
5.  Calculates the final trading signal using AI prediction and technical strategies.
6.  Saves the generated signal to the `signals` table.
7.  Logs the signal and predicted price to the console.

## MindsDB Integration

MindsDB is integrated as a separate Docker service. The application connects to MindsDB using a MySQL-compatible interface (via Sequelize).

- **Data Source Creation:** MindsDB is configured to connect to the MariaDB database as a data source.
- **Model Training:** A `CREATE MODEL` query is used to train a predictor model (`btc_price_predictor` by default) on the `btc_prices` table, predicting the `close` price.
- **Prediction:** `SELECT FROM` queries are used to get predictions from the trained model based on the latest available data.

## Project Structure

```
ultimate-express-playground/
├── src/
│   ├── app.ts                  # Main Express application entry point
│   ├── config/
│   │   └── database.ts         # Sequelize database connection
│   ├── controllers/
│   │   └── price.controller.ts # API endpoint handlers
│   ├── cron/
│   │   └── scheduler.ts        # Node-cron scheduler for hourly jobs
│   ├── models/
│   │   ├── btcPrice.model.ts   # Sequelize model for BTC price data
│   │   └── signal.model.ts     # Sequelize model for trading signals
│   ├── routes/
│   │   └── index.ts            # API route definitions
│   ├── services/
│   │   ├── binance.service.ts  # Binance API integration
│   │   ├── mindsdb.service.ts  # MindsDB AI integration
│   │   └── tradingStrategy.service.ts # Trading strategy implementations
│   └── utils/                  # Utility functions (reserved)
├── .env.example                # Example environment variables
├── .eslintrc.js                # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── Dockerfile                  # Dockerfile for the Node.js application
├── docker-compose.yml          # Docker Compose for app, MariaDB, MindsDB
├── package.json                # Project dependencies and scripts
├── bun.lockb                   # Bun lock file
├── tsconfig.json               # TypeScript compiler configuration
├── README.md                   # Project documentation
└── .dockerignore               # Files/folders to ignore when building Docker image
```

## Linting and Formatting

- **Linting:**
  ```bash
  bun run lint
  ```
- **Formatting:**
  ```bash
  bun run format
  ```

These commands help maintain code quality and consistency.

## Contributing

Feel free to fork the repository, open issues, or submit pull requests.

## License

[MIT License](LICENSE) (You might want to create a `LICENSE` file with the MIT license text)