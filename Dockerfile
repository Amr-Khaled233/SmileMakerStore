# ---- Build stage: install everything and build the frontend ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage: only prod deps + built assets + server source ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Built frontend (served by Express) + server source (run via tsx) + tsconfig
COPY --from=build /app/dist ./dist
COPY server ./server
COPY tsconfig.json ./

EXPOSE 3001
CMD ["npm", "run", "start"]
