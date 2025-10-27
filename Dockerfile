# # -------------------------
# # 1️⃣ Build Stage
# # -------------------------
# FROM node:22 AS builder

# # Set working directory
# WORKDIR /usr/src/app

# # Copy package files first (for caching)
# COPY package*.json ./
# COPY prisma ./prisma

# # Install dependencies
# RUN npm install

# # Copy all project files
# COPY . .

# # Generate Prisma client (dummy env to allow generation)
# RUN DATABASE_URL="postgresql://postgres:password@localhost:5432/nest_database" npx prisma generate

# EXPOSE 3000

# CMD ["npm", "run", "start:dev"]


FROM node:22 AS builder

WORKDIR /usr/src/app

# Copy package files for caching
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Generate Prisma client (no real DB connection needed)
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
