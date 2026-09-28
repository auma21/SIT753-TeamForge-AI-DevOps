# ============================================================
# TeamForge AI - Hardened Production Docker Image
# ============================================================
#
# Stage 1:
#   Install deterministic production dependencies.
#
# Stage 2:
#   Create a hardened production runtime.
#
# Security objectives:
#   - production dependencies only;
#   - npm/npx/Corepack/Yarn absent at runtime;
#   - no .env secrets baked into the image;
#   - application runs as non-root;
#   - application-level health monitoring.
# ============================================================


# ------------------------------------------------------------
# Stage 1 - Production dependencies
# ------------------------------------------------------------

FROM node:22-alpine AS dependencies

WORKDIR /app

# Copy dependency manifests first for Docker layer caching.
COPY package.json package-lock.json ./

# Install deterministic production dependencies only.
RUN npm ci --omit=dev \
    && npm cache clean --force


# ------------------------------------------------------------
# Stage 2 - Hardened production runtime
# ------------------------------------------------------------

FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app


# ------------------------------------------------------------
# Runtime hardening
# ------------------------------------------------------------
#
# TeamForge starts directly with:
#
#     node src/server.js
#
# Therefore npm, npx, Corepack and Yarn are unnecessary in the
# deployed production container.
#
# The final two test commands deliberately fail the Docker build
# if npm was not successfully removed.
# ------------------------------------------------------------

RUN echo "Removing production package-management tooling..." \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -rf /usr/local/lib/node_modules/corepack \
    && rm -rf /opt/yarn-v* \
    && rm -f /usr/local/bin/npm \
    && rm -f /usr/local/bin/npx \
    && rm -f /usr/local/bin/corepack \
    && rm -f /usr/local/bin/yarn \
    && rm -f /usr/local/bin/yarnpkg \
    && echo "Package-management tooling removed." \
    && test ! -e /usr/local/lib/node_modules/npm \
    && test ! -e /usr/local/bin/npm


# ------------------------------------------------------------
# TeamForge production application
# ------------------------------------------------------------

# Copy production dependencies from the build stage.
COPY --from=dependencies \
    --chown=node:node \
    /app/node_modules \
    ./node_modules

# Copy package metadata.
COPY --chown=node:node \
    package.json \
    package-lock.json \
    ./

# Copy application source.
COPY --chown=node:node src ./src

# Copy database initialization resources.
COPY --chown=node:node database ./database


# ------------------------------------------------------------
# Runtime security
# ------------------------------------------------------------

# Drop root privileges permanently.
USER node

EXPOSE 3000


# ------------------------------------------------------------
# Runtime health monitoring
# ------------------------------------------------------------

HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=20s \
    --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1));"


# Start TeamForge directly with Node.
CMD ["node", "src/server.js"]