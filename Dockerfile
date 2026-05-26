FROM adguard/node-ssh:22.22--0 AS base
SHELL ["/bin/bash", "-lc"]

RUN npm install -g pnpm@10.7.0

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
# Runs lint and tests; captures exit code so Bamboo can report failures
# ============================================================================
FROM source AS test

ARG BUILD_RUN_ID=""

RUN --mount=type=cache,target=/pnpm-store,id=dead-domains-linter-pnpm \
    mkdir -p /out && \
    echo "${BUILD_RUN_ID}" > /out/.build-run-id && \
    set +e; \
    pnpm run lint && pnpm run test; \
    EXIT_CODE=$?; \
    echo "${EXIT_CODE}" > /out/exit-code.txt; \
    exit 0

FROM scratch AS test-output
COPY --from=test /out/ /

# ============================================================================
# Stage: build
# Generates build.txt and packs the npm tarball
# ============================================================================
FROM source AS build

ARG BUILD_RUN_ID=""

RUN --mount=type=cache,target=/pnpm-store,id=dead-domains-linter-pnpm \
    mkdir -p /out/artifacts && \
    echo "${BUILD_RUN_ID}" > /out/.build-run-id && \
    pnpm run build-txt && \
    cp dist/build.txt /out/artifacts/ && \
    pnpm pack --out dead-domains-linter.tgz && \
    mv dead-domains-linter.tgz /out/artifacts/

FROM scratch AS build-output
COPY --from=build /out/ /
