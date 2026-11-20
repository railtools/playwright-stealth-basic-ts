# Use Playwright v1.65.1 with noble (Ubuntu 24.04)
# Keep this tag in sync with the "playwright" version in package.json,
# otherwise the bundled browsers will not match and launch() fails.
FROM mcr.microsoft.com/playwright:v1.65.1-noble

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install exact dependency versions from package-lock.json
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Set environment variables
ENV NODE_ENV=production

# Start the application (run node directly so it receives stop signals)
CMD ["node", "dist/main.js"]
