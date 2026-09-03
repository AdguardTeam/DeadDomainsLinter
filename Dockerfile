FROM adguard/node-ssh:22.22--0 AS base
SHELL ["/bin/bash", "-lc"]

WORKDIR /dead-domains-linter

ENV npm_config_store_dir=/pnpm-store

# ============================================================================
# Stage: deps
# Cached until package.json/pnpm-lock.yaml changes
# ============================================================================
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# --ignore-scripts prevents "prepare": "husky" from running in Docker
RUN --mount=type=cache,target=/pnpm-store,id=dead-domains-linter-pnpm \
    pnpm install --frozen-lockfile --ignore-scripts

# ============================================================================
# Stage: source
# Full source copy on top of installed deps
# ============================================================================
FROM deps AS source

COPY . .

# ============================================================================
# Stage: test
# Runs lint and tests; a non-zero exit fails the docker build (and CI)
# ============================================================================
FROM source AS test

RUN --mount=type=cache,target=/pnpm-store,id=dead-domains-linter-pnpm \
    pnpm run lint && \
    pnpm run test && \
    mkdir -p /out && \
    touch /out/test-passed.txt

FROM scratch AS test-output
COPY --from=test /out/ /

# ============================================================================
# Stage: build
# Packs the npm tarball into /out/artifacts
# ============================================================================
FROM source AS build

RUN --mount=type=cache,target=/pnpm-store,id=dead-domains-linter-pnpm \
    pnpm pack --out dead-domains-linter.tgz && \
    mkdir -p /out/artifacts && \
    mv dead-domains-linter.tgz /out/artifacts/

FROM scratch AS build-output
COPY --from=build /out/artifacts/ /
