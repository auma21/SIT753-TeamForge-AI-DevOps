# ============================================================
# TeamForge AI - Hardened PostgreSQL Runtime
# ============================================================
#
# Security design:
#   - retain the official PostgreSQL entrypoint;
#   - rebuild gosu 1.19 using a patched Go toolchain;
#   - replace the vulnerable upstream gosu binary;
#   - keep compiler/build dependencies out of runtime;
#   - bake TeamForge schema into the database image;
#   - require no runtime host bind mounts.
# ============================================================


# ------------------------------------------------------------
# Stage 1 - Build patched gosu
# ------------------------------------------------------------

FROM golang:1.25.14-alpine AS gosu-builder

ARG GOSU_VERSION=1.19

RUN test -n "${GOSU_VERSION}"

# Git is required only during the temporary builder stage.
RUN apk add --no-cache \
    git \
    ca-certificates

WORKDIR /src

# Fetch the exact vetted gosu release.
RUN git clone \
        --depth 1 \
        --branch "${GOSU_VERSION}" \
        https://github.com/tianon/gosu.git \
        .

# Build a static gosu binary using the patched Go toolchain.
RUN CGO_ENABLED=0 \
    go build \
        -trimpath \
        -ldflags="-s -w" \
        -o /out/gosu \
        .


# ------------------------------------------------------------
# Stage 2 - PostgreSQL runtime
# ------------------------------------------------------------

FROM postgres:17-alpine

LABEL org.opencontainers.image.title="TeamForge AI PostgreSQL"
LABEL org.opencontainers.image.description="Hardened PostgreSQL runtime for TeamForge AI"

USER root

# Replace the gosu binary inherited from postgres:17-alpine.
COPY --from=gosu-builder \
    /out/gosu \
    /usr/local/bin/gosu

RUN chmod 0755 /usr/local/bin/gosu \
    && /usr/local/bin/gosu --version \
    && /usr/local/bin/gosu nobody true

# TeamForge schema is initialized automatically when PostgreSQL
# creates a new, empty data directory.
COPY init.sql \
    /docker-entrypoint-initdb.d/01-init.sql