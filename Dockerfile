FROM node:23-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@11.7.0

# Copy manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.json wrangler.toml ./
COPY src/ ./src/

# Generate types
RUN npx wrangler types

FROM node:23-alpine
WORKDIR /app

# Copy from builder
COPY --from=builder /app /app

EXPOSE 5679

CMD ["npx", "wrangler", "dev", "--port", "5679", "--ip", "0.0.0.0"]
