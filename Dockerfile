FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application source
COPY tsconfig.json ./
COPY src/ ./src/
COPY data/ ./data/

# Run daemon worker as non-root user
USER node

ENV NODE_ENV=production

CMD ["npm", "run", "daemon"]

