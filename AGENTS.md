# AGENTS.md

## Table of Contents

- [Project Overview](#project-overview)
- [Technical Context](#technical-context)
- [Project Structure](#project-structure)
- [Build and Test Commands](#build-and-test-commands)
- [Contribution Instructions](#contribution-instructions)
- [Code Guidelines](#code-guidelines)
    - [System Design](#system-design)
    - [Architecture](#architecture)
    - [Code Quality](#code-quality)
    - [Testing](#testing)
    - [Dependency Management](#dependency-management)
    - [Configuration & Documentation](#configuration--documentation)
    - [Markdown Formatting](#markdown-formatting)
    - [Other](#other)

## Project Overview

Dead Domains Linter (`@adguard/dead-domains-linter`) is a CLI tool that scans
adblock filter lists (AdGuard/ABP rules in `*.txt` files) for rules that
reference dead domains and suggests fixes for them. See `README.md` for the
full description, usage instructions, and the complete list of flags.

## Technical Context

- **Language/Version**: JavaScript (CommonJS); the required pnpm range is
  declared in `engines.pnpm` in `package.json`. The published package supports
  Node.js >= 18, but the development toolchain (markdownlint in devDependencies)
  requires Node.js 22 or newer; see *Prerequisites* in `DEVELOPMENT.md`
  for the full toolchain requirements.
- **Primary Dependencies**: `@adguard/agtree` (filter-rule parsing and AST
  generation), `consola` (logging and interactive prompts), `glob` (file
  discovery), `node-fetch` (HTTP), `tldts` (domain parsing), `yargs` (CLI
  arguments).
- **Storage**: None. The tool reads and rewrites filter list files in place;
  no database.
- **Target Platform**: npm package installed globally; `src/cli.js` is
  exposed as the `dead-domains-linter` binary.
- **Project Type**: single package.
- **Performance Goals**: rules of a filter list are analyzed in parallel in
  chunks of 10 (`PARALLEL_CHUNK_SIZE` in `src/filelinter.js`); domain checks
  are batched into web-service requests of 25 domains and results are cached
  in memory (`domainsCheckCache` in `src/linter.js`).
- **Constraints**: depends on `urlfilter.adtidy.org` availability and DNS
  resolution; the web service rate-limits requests, so `Retry-After` headers
  are respected and requests are retried.
- **Scale/Scope**: used by the AdGuard filters team to lint filter lists.

## Project Structure

```text
├── .github/workflows/   # CI, release preparation, npm publish, mirroring
├── .husky/              # pre-commit hook (lint + tests)
├── .markdownlint.json   # markdownlint config (source of truth for the Markdown Formatting rules)
├── .markdownlintignore  # Files excluded from markdownlint
├── src/                 # Tool source (CommonJS)
│   ├── cli.js           # Entry point: flags, file discovery, orchestration
│   ├── filelinter.js    # File-level: parse list, confirm, apply fixes
│   ├── linter.js        # Rule-level: domain extraction, checks, AST fixes
│   ├── urlfilter.js     # Dead-domain detection via the web service
│   ├── fetchdomains.js  # HTTP with retries, Retry-After, DNS lookup cache
│   ├── dnscheck.js      # DNS A-record double-check (8.8.8.8)
│   └── utils.js         # Shared helpers: unique(), validDomain()
├── test/                # Jest tests
│   ├── mocked/          # Unit tests with mocked HTTP responses
│   ├── integration/     # Tests hitting real DNS and the web service
│   └── resources/       # Fixtures: filter.txt, empty.txt
├── AGENTS.md            # LLM agent rules (guidelines for AI-assisted development)
├── CHANGELOG.md         # Keep a Changelog; finalized by the release workflow
├── DEVELOPMENT.md       # Development workflow and toolchain requirements
├── Dockerfile           # Multi-stage build used by CI (base → deps → source → test / build)
├── jest.config.js       # Jest config (node environment, silent)
├── package.json         # Manifest, scripts, dependencies
└── README.md            # User-facing usage documentation
```

## Build and Test Commands

- `pnpm run lint` — run ESLint (with cache) and markdownlint.
- `pnpm run test` — run the full Jest suite (mocked and integration).

The full command reference — installing dependencies, running a single test
file, building the npm package, and running the tool locally — is in
`DEVELOPMENT.md` (*Getting Started* and *Development Workflow*).

## Contribution Instructions

- You MUST verify your changes with the linter. Run `pnpm run lint` and fix
  all reported errors and warnings.

  The project has no formatter or type checker — plain JavaScript, no
  TypeScript; formatting is enforced by ESLint rules (4-space indent,
  `max-len` 120). Do not introduce a formatter or type checker for the sake
  of it.

- You MUST update the unit tests for changed code.

- You MUST run `pnpm run test` to verify that your changes do not break
  existing functionality; all tests, mocked and integration, must pass.

- When making changes to the project structure, ensure the Project Structure
  section in `AGENTS.md` is updated and remains valid.

- If the prompt essentially asks you to refactor or improve existing code,
  check if you can phrase it as a code guideline. If it's possible, add it
  to the relevant Code Guidelines section in `AGENTS.md`.

- After completing the task you MUST verify that the code you've written
  follows the Code Guidelines in this file.

- You MUST update `CHANGELOG.md` (Keep a Changelog format) for user-visible
  changes; the `[Unreleased]` section is filled during development and
  finalized by the release workflow. Do NOT update it for changes that only
  affect CI or tests (workflow files, test files, test fixtures, build
  tooling) — such changes are not user-visible and must not be recorded.

- The pre-commit hook (`.husky/pre-commit`) runs `pnpm run lint` and
  `pnpm run test`, and CI runs the same checks in the Dockerfile `test`
  stage — keep both green before committing.

- You MUST prefix commit messages with the ticket number (`AG-XXX`) so they
  auto-link with the task tracker, followed by a short description in the
  present tense (e.g. `AG-1234 Fix login redirect`). Automated commits made
  by CI (e.g. the CHANGELOG finalization in the release PR) use a
  [Conventional Commits] prefix such as `docs:` instead.

[Conventional Commits]: https://www.conventionalcommits.org/en/v1.0.0/

## Code Guidelines

### System Design

Design for a command-line tool:

- The tool runs and exits — no long-lived state, no background daemons. All
  work happens in `main()` in `src/cli.js`; the process exits 0 on success
  and 1 on failure (`process.exit(1)` on errors).
- Use `consola` for all output: progress and prompts go to stdout, errors go
  to stderr. `--verbose` raises `consola.level` to 5 (trace level), which
  surfaces `consola.debug`/`consola.trace` diagnostics.
- Support `--help`, `--version`, and `--verbose` flags consistently (via
  `yargs`). Default to moderate output; add diagnostics on `--verbose`.
- Be scriptable: `--auto` applies fixes without prompts, `--show` only
  displays suggestions, and `--export`/`--import` decouple dead-domain
  detection from file modification. Interactive confirmation must remain
  skippable so the tool can run unattended (CI).
- Fail fast with clear messages — validate inputs early (e.g., unreadable
  `--import`/`--ignore` files) and exit with a non-zero code after logging
  the error with enough context to fix it.
- Keep startup time fast — do not do heavy work before arguments are parsed
  and the user's intent (flags) is known.
- The tool is not composable via stdin/stdout: it operates on filter list
  files in place. Do not add stdin-based flows unless the CLI contract
  changes.

### Architecture

The codebase follows these universal design principles:

- **Separation of Concerns** — each module handles one aspect: CLI
  orchestration, file processing, rule analysis, external checks.
- **Single Responsibility Principle** — every file has one reason to change;
  e.g., `urlfilter.js` only talks to the web service.
- **Dependency Direction** — dependencies point downward: entry point →
  orchestration → rule analysis → infrastructure; lower layers never import
  higher ones.
- **Explicit Boundaries** — modules expose narrow interfaces
  (`lintFile`/`applyFileChanges`, `lintRule`); internal helpers are not
  exported.
- **Data Flow Clarity** — a rule's AST flows through a predictable path:
  parse → extract domains → check → modify → regenerate text.
- **Minimize Coupling, Maximize Cohesion** — modules communicate through
  plain function signatures and documented JSDoc typedefs (`FileLintOptions`,
  `LinterResult`).
- **Make Invalid States Impossible** — `validDomain()` rejects IP addresses,
  TLD-only names, and unverifiable TLDs (`.onion`, etc.) before any check.
- **Observability Built-in** — progress and diagnostics go through `consola`
  at every step (per-rule verbose logs, progress every 100 rules, per-file
  summaries).
- **Keep It Boring** — plain CommonJS, standard Node.js APIs (`dns`, `fs`,
  `https`), no framework magic.

The easiest way to achieve these principles is **layered architecture**.
This project's layers, from top to bottom:

```text
Entry point (src/cli.js)
     ↓
File orchestration (src/filelinter.js)
     ↓
Rule analysis (src/linter.js)
     ├──→ Web service checks (src/urlfilter.js → src/fetchdomains.js)
     ├──→ DNS checks (src/dnscheck.js)
     └──→ Utilities (src/utils.js)
```

A layer may call any lower layer; no layer may depend on a layer above it.
`utils.js` is a shared bottom layer also used by `cli.js` directly.

**Known exclusions** (to be fixed):

- `domainsCheckCache` in `src/linter.js` is module-level shared mutable
  state. It is an intentional in-memory cache of check results, but it is
  not injectable and persists across tests in the same process.
- `PARALLEL_CHUNK_SIZE` in `src/filelinter.js`, `CHUNK_SIZE` in
  `src/urlfilter.js`, and the DNS server in `src/dnscheck.js` are hardcoded.
  The first and the last carry `TODO(ameshkov)` comments about making them
  configurable; in `src/urlfilter.js` the chunk size is already a parameter of
  `findDeadDomains` (defaulted to `CHUNK_SIZE`).

### Code Quality

- **Documentation**: every function has a JSDoc block with `@param` and
  `@returns`; option and result shapes are defined as JSDoc typedefs
  (`LintOptions`, `LinterResult`, `FileLintOptions`, `FileResult`,
  `AstResult`, `RuleDomain`). Keep typedefs in sync when signatures change.
- **Static analysis**: ESLint with `airbnb-base` and
  `plugin:jsdoc/recommended` (see `.eslintrc.js`); overrides: 4-space
  indent, `max-len` 120, `jsdoc/tag-lines` as warning. Do not add
  `eslint-disable` comments without justification — existing ones cover
  intentional patterns (`no-await-in-loop` in sequential loops,
  `import/no-unresolved` for `consola/utils`).
- **Error handling**: lower layers throw errors with context (e.g.,
  `fetchdomains.js` includes the status code and URL); orchestration layers
  catch and decide — `cli.js` logs with `consola.error` and exits 1,
  `filelinter.js` catches per-rule errors, logs a warning, and skips the
  offending line.
- **Naming**: camelCase for variables and functions; module files use short
  lowercase names (`dnscheck.js`, `fetchdomains.js`); docs and workflows
  use kebab-case. Modules export a single object of named functions.
- **Imports**: Node.js builtins first, then npm packages, then relative
  modules; CommonJS `require`/`module.exports`; no path aliases.
- **Comments**: use `TODO(author)` annotations (e.g., `TODO(ameshkov)`) for
  known limitations and planned work.

### Testing

- **Placement and naming**: tests live in `test/mocked/` and
  `test/integration/` as `<module>.test.js` files mirroring `src/` modules.
- **Mocked tests** (`test/mocked/`): unit tests that mock `node-fetch`
  (`jest.mock('node-fetch')`) and replay scripted responses built with the
  helpers in `test/mocked/mockresponse.js` (`createSuccessResponse`,
  `createRateLimitedResponse`). They must not make real network requests;
  pass `useDNS: false` when testing rule logic.
- **Integration tests** (`test/integration/`): verify behavior against real
  DNS and the real web service (e.g., `dnscheck.test.js` checks
  `example.org`). Pick stable, well-known domains so the tests do not flake.
- **Style**: BDD (`describe`/`it`); `beforeEach` resets mocks.
- **Verification**: all tests must pass before merge — see *Contribution
  Instructions*.
- **Test data**: fixture files live in `test/resources/` (`filter.txt`,
  `empty.txt`).

### Dependency Management

- **Pin all dependency versions explicitly** — do not use version ranges
  that allow automatic upgrades to untested versions. Every entry in
  `dependencies` and `devDependencies` is pinned to an exact version, and
  the version must match what `pnpm-lock.yaml` resolves (never downgrade
  below the locked version). When bumping a dependency, update the pinned
  version and run `pnpm install` so the lockfile stays in sync.
- **Prefer vanilla solutions** — use the language's standard library and
  built-in APIs when they adequately solve the problem. Only add a
  dependency when it provides significant value over a vanilla
  implementation.
- **Reputable sources only** — dependencies MUST come from well-established,
  actively maintained projects. Evaluate by download counts, repository
  activity, and known maintainers.
- **Avoid unpopular libraries** — do NOT add niche or obscure packages with
  limited community adoption. These pose security risks and may become
  unmaintained.
- **Minimize dependency count** — each new dependency increases attack
  surface, bundle size, and maintenance burden. Justify every addition.
- **Use the latest stable version** — when adding a new dependency,
  explicitly check the package registry for the latest stable release and
  use it. Do not copy outdated version numbers from memory, training data,
  or existing lock files of other projects. Note that "latest stable" is
  effectively "at least 7 days old": `pnpm-workspace.yaml` sets
  `minimumReleaseAge: 10080` (minutes), so `pnpm add` of a brand-new release
  is rejected. This is an intentional supply-chain guard — do not "fix" it by
  adding packages to `minimumReleaseAgeExclude` (which exists solely for the
  first-party `@adguard/*` scope).
- **Document deliberate downgrades** — if a dependency is pinned below the
  latest stable release on purpose, record the reason in this section so
  the pin reads as a conscious decision, not a policy violation. Example:
  `glob@10.4.5` is the last 10.x — `glob@11` requires Node.js >= 20, while
  the published package supports Node.js >= 18.
- **Package manager version** — `engines.pnpm` in `package.json` is the
  single source of truth for the required pnpm version; the docs and the
  Dockerfile sanity check reference it instead of restating the numbers. The
  `adguard/node-ssh` Docker base image ships a compatible pnpm; keep the
  engine range in sync with what the base image provides.

**Rationale**: Fewer, well-vetted dependencies reduce security
vulnerabilities, supply chain risks, and long-term maintenance costs.

### Configuration & Documentation

- The tool is configured exclusively via `yargs` CLI flags — the flag
  reference is the *Usage* section in `README.md`.
- No secrets are used by the project; never hardcode tokens or credentials.
- Keep documentation in sync with code changes:
    - `README.md` — user-facing usage, flags, and examples;
    - `CHANGELOG.md` — user-visible changes under `[Unreleased]` (Keep a
      Changelog + SemVer); finalized by the release workflow;
    - `AGENTS.md` — project structure and code guidelines.
- Avoid duplication across documentation files: each topic has a single
  home — `README.md` for usage, `AGENTS.md` for guidelines, `DEVELOPMENT.md`
  for the development workflow — and the other files only link to it.

### Markdown Formatting

All Markdown files MUST follow these formatting rules. They mirror
`.markdownlint.json` — the config is the source of truth, so when the config
changes, update this section to match it.

- **Line length**: Keep lines at most 120 characters — enforced by
  markdownlint (MD013). Do not overwrap the lines artificially short just
  to hit the limit; keep them close to 120 characters where possible. Table
  rows are exempt from the limit (`line-length.tables: false` in the config);
  lines inside fenced code blocks are NOT exempt (MD013 checks code blocks by
  default).
- **Unordered lists**: Use dashes (`-`) for bullet points. Indent nested
  list items by 4 spaces.
- **Continuation lines**: When a list item wraps to the next line,
  align the continuation with the first character of the item text,
  not the list marker. This applies to all list types (ordered and
  unordered).
- **Emphasis**: Use asterisks (`*`) for emphasis (`*italic*`,
  `**bold**`). Do NOT use underscores.
- **Headings**: Use title case — capitalize the first and last word and all
  principal words; keep articles, conjunctions, and short prepositions (`a`,
  `the`, `and`, `or`, `of`, `with`, ...) lowercase unless they start the
  heading. Duplicate heading names are allowed only among sibling
  headings (same parent level). Avoid duplicates across different levels.
- **Inline HTML**: Avoid raw HTML in Markdown; only the elements whitelisted
  in `no-inline-html.allowed_elements` in `.markdownlint.json` are permitted.
- **Trailing spaces**: Do NOT leave trailing whitespace on any line. Do
  NOT use two-space line breaks — use a blank line instead.
- **Bare URLs**: Bare URLs are permitted and do not need to be wrapped
  in angle brackets.
- **Table formatting**: Align table columns with padding so that the column
  separator pipes are vertically aligned. markdownlint MD060 enforces the
  `aligned` style, so the separator row's pipes must line up with the header
  row's as well.

  Example of correct layout:

  ```markdown
  | Col1   | Col2   |
  | ------ | ------ |
  | Value1 | Value2 |
  ```

  Do NOT use a compact style with a single space around cell content
  (`| Col1 | Col2 |`) — the linter rejects it.

**Rationale**: Uniform Markdown formatting improves readability for both
humans and AI agents that consume project documentation.

### Other

- **Logging**: use `consola` at all times — `consola.start` for
  long-running steps, `consola.info` for progress, `consola.debug` for
  per-rule diagnostics (visible with `--verbose`), `consola.warn` for skipped
  lines, `consola.error` for fatal failures, `consola.success` for completion.
  Never use `consola.verbose`: in consola 3.x its level is `Infinity`, so no
  finite `consola.level` ever prints it. Use `consolaUtils.colorize` and
  `consola.box` for user-facing summaries.
- **Filter rule editing**: never hand-edit rule text — always operate on the
  agtree AST and regenerate text with `agtree.RuleParser.generate()` so the
  original formatting is preserved.
