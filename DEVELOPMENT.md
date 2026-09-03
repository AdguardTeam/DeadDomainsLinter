# Dead Domains Linter — Development Guide

This guide explains how to set up the development environment for
`@adguard/dead-domains-linter`, run the project locally, and contribute
code. For usage instructions read `README.md`; for architecture and code
guidelines read `AGENTS.md`.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
    - [Branching and Pull Requests](#branching-and-pull-requests)
    - [Commit Message Convention](#commit-message-convention)
    - [Code Style](#code-style)
    - [Testing](#testing)
    - [Building the Package](#building-the-package)
    - [Releases](#releases)
- [Common Tasks](#common-tasks)
    - [Run the Tool Against a Filter List](#run-the-tool-against-a-filter-list)
    - [Debug with Verbose Logging](#debug-with-verbose-logging)
    - [Updating Dependencies](#updating-dependencies)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

## Prerequisites

- **Node.js** — version 22 or newer for development. The published package
  supports Node.js 18 or newer (`"engines": { "node": ">=18" }` in
  `package.json`), but the lint toolchain — markdownlint in
  devDependencies — requires Node.js 22, so use Node.js 22 (or newer) for
  local development. CI runs on Node.js 22 (the `adguard/node-ssh:22.22--0`
  Docker base image).
- **pnpm** — a version matching `engines.pnpm` in `package.json`, which is
  the single source of truth for the supported range (pnpm 10.x). The CI
  Docker image (`adguard/node-ssh:22.22--0`) bundles a compatible pnpm; if
  you need to install one locally, use `npm install -g pnpm@10`.
- **Git** — to clone the repository and create branches.

## Getting Started

1. Clone the development repository (the public
   `AdguardTeam/DeadDomainsLinter` is a read-only mirror of it — see
   `README.md`):

    ```shell
    git clone git@github.com:AdGuardSoftwareLimited/filters-dead-domains-linter.git
    cd filters-dead-domains-linter
    ```

2. Install dependencies. This also installs the Husky pre-commit hook via
   the `prepare` script:

    ```shell
    pnpm install
    ```

3. Run lint and tests to verify the environment:

    ```shell
    pnpm run lint
    pnpm run test
    ```

4. Run the tool locally from the source tree:

    ```shell
    node src/cli.js --help
    ```

    For a quick end-to-end check, scan the test fixture in show-only mode
    (no files are modified):

    ```shell
    node src/cli.js -i test/resources/filter.txt --show --dnscheck=false
    ```

## Development Workflow

### Branching and Pull Requests

- The default branch is `master`. Create a branch per task and name it after
  the Jira ticket, e.g. `fix/AG-58171`.
- Open a pull request against `master`. CI runs lint, tests, and the package
  build on every PR and push (`ci.yml`).
- Pushes to `master` are automatically mirrored to the public
  `AdguardTeam/DeadDomainsLinter` repository (`mirror.yml`). Never push
  directly to the public repository.

### Commit Message Convention

The full convention lives in *Contribution Instructions* in `AGENTS.md` —
prefix every commit message with the ticket number and a short present-tense
description, e.g. `AG-58171 Add markdown linter to filters-dead-domains-linter`.

### Code Style

- Markdown files are linted with markdownlint — `pnpm run lint` covers both,
  or run `pnpm run lint:md` for Markdown only.
- The full code guidelines — rules, JSDoc conventions, and dependency
  management — live in the *Code Guidelines* section of `AGENTS.md`.

### Testing

- Jest (node environment, `silent: true`), configured in `jest.config.js`.
- Tests live in `test/mocked/` and `test/integration/`; the *Testing*
  guidelines in `AGENTS.md` describe the split and how to write them.
- Run the full suite (mocked + integration):

  ```shell
  pnpm run test
  ```

- Run a single test file. Note that the `test` script ends with `.`, so
  passing a file through `pnpm run test --` does not filter; use `pnpm exec`
  instead:

  ```shell
  pnpm exec jest test/mocked/linter.test.js
  ```

### Building the Package

```shell
pnpm pack --out dead-domains-linter.tgz
```

The tarball is what CI produces and what gets published to npm.

### Releases

Releases are cut from `master` via GitHub workflows:

- `prepare-release.yml` — on manual dispatch with a tag (e.g. `v1.0.39`)
  opens a release PR that finalizes `CHANGELOG.md`.
- `publish-release.yml` — publishes the package to npm after the release PR
  is merged.

Update `CHANGELOG.md` under `[Unreleased]` for every user-visible change
(see *Contribution Instructions* in `AGENTS.md`); the release workflow
finalizes it.

## Common Tasks

### Run the Tool Against a Filter List

```shell
node src/cli.js -i filter.txt --show
```

Replace `--show` with `--auto` to apply fixes without prompts, or omit both
to run interactively — see the *Workflows* section of `README.md` for the
other modes (`--export`/`--import`, `--ignore`).

### Debug with Verbose Logging

```shell
node src/cli.js -i filter.txt --show --verbose
```

`--verbose` raises the `consola` log level to 5 (trace), which surfaces the
per-rule debug diagnostics printed while the tool processes a list. For
Node.js debugging, run with the inspector:

```shell
node --inspect-brk src/cli.js -i filter.txt --show
```

### Updating Dependencies

Follow the *Dependency Management* policy in `AGENTS.md`: every dependency
is pinned to an exact version and `pnpm-lock.yaml` must stay in sync. To
update a dependency:

1. Look up the latest stable version on the package registry:

    ```shell
    pnpm view <package> version
    ```

2. Update the pinned version in `package.json`, or install the new
   version directly with `pnpm add <package>@<version> --save-exact`
   (add `--save-dev` for devDependencies).

3. Run `pnpm install` so `pnpm-lock.yaml` is updated.

4. Run `pnpm run lint` and `pnpm run test` to verify the upgrade.

## Troubleshooting

- **`pnpm` is not installed** — install it with `npm install -g pnpm@10`;
  the exact supported range is declared in `engines.pnpm` in `package.json`.

- **The pre-commit hook does not run** — Husky is installed by the
  `prepare` script during `pnpm install`. If you installed with
  `--ignore-scripts`, run `pnpm run prepare` manually.

- **Lint errors about indentation or line length** — the project has no
  autoformatter; fix the style by hand (4 spaces, 120 characters max). If
  the ESLint cache is stale, run `pnpm exec eslint . --no-cache`.

- **Integration tests fail or are flaky** — `test/integration/` makes real
  network requests to `urlfilter.adtidy.org` and DNS. The web service
  rate-limits requests (the linter respects `Retry-After`), so tests can
  fail under heavy usage. Re-run them, or run only `test/mocked/` to verify
  logic without the network.

- **Tests are slow** — the full suite runs in-band (`--runInBand`) and the
  integration tests perform real DNS lookups; this is expected.

- **`consola.info is not a function`** — this happened historically when
  the `consola` dependency was upgraded (issue #32). `consola` is pinned
  exactly (`3.2.3`) on purpose; do not bump it without testing.

- **Docker build fails in the `test` stage** — the Dockerfile `test` stage
  runs `pnpm run lint && pnpm run test`. Reproduce the failure locally with
  the same commands.

## Additional Resources

- `README.md` — usage instructions and CLI flags reference
- `AGENTS.md` — architecture overview and code guidelines
- `CHANGELOG.md` — history of user-visible changes
- `Dockerfile` — multi-stage build used by CI
