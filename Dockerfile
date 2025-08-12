# Use the official Bun image as a base
FROM oven/bun:1.1.17-slim

# Set the working directory
WORKDIR /app

# Copy package.json and bun.lockb to leverage Bun's caching
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the TypeScript application
RUN bun run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["bun", "run", "start"]