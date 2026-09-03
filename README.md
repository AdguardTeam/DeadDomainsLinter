# Dead Domains Linter

[![npm-badge]][npm-url] [![license-badge]][license-url]

<p align="center">
  A CLI tool that scans adblock filter lists for rules that reference dead
  domains and fixes them.
</p>

<!-- markdownlint-disable MD013 -->
<p align="center">
  <img src="https://cdn.adtidy.org/website/github.com/DeadDomainsLinter/default-config.png" alt="Dead Domains Linter in interactive mode" width="600">
</p>
<!-- markdownlint-enable MD013 -->

## Description

Dead Domains Linter is a command-line tool for maintainers of adblock filter
lists (AdGuard, uBlock Origin, ABP). Filter lists accumulate rules that
reference dead domains — domains that no longer resolve or are no longer
visited by anyone. Finding and cleaning up such rules by hand is tedious and
error-prone, which is what this tool automates.

The tool scans `*.txt` filter list files, extracts domains from each rule,
and checks them against the `urlfilter.adtidy.org` web service, which tracks
domains used by AdGuard DNS users within the last 24 hours. Domains absent
from that snapshot are treated as dead and, by default, double-checked with a
DNS query. For each affected rule the tool suggests a fix — remove the whole
rule or strip the dead domain from its pattern and modifiers — and applies it
interactively (with user confirmation), automatically (`--auto`), or not at
all (`--show`).

> **Note.** The tool is meant to be replaced by an [AGLint
> rule](https://github.com/AdguardTeam/AGLint/issues/194) in the future.

> **Note on repositories.** Active development happens in the private
> [AdGuardSoftwareLimited/filters-dead-domains-linter](https://github.com/AdGuardSoftwareLimited/filters-dead-domains-linter)
> repository; this public
> [AdguardTeam/DeadDomainsLinter](https://github.com/AdguardTeam/DeadDomainsLinter)
> repository is a read-only mirror that is updated automatically from it.

[npm-badge]: https://img.shields.io/npm/v/@adguard/dead-domains-linter
[npm-url]: https://www.npmjs.com/package/@adguard/dead-domains-linter
[license-badge]: https://img.shields.io/github/license/AdGuardTeam/DeadDomainsLinter
[license-url]: https://github.com/AdguardTeam/DeadDomainsLinter/blob/master/LICENSE

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Configuration](#configuration)
- [Documentation](#documentation)

---

## Installation

Dead Domains Linter is distributed as an npm package and requires
[Node.js](https://nodejs.org/) 18 or newer.

```bash
npm i -g @adguard/dead-domains-linter
```

> **Note.** npm users are unaffected by the package's `engines.pnpm` field.
> If you install with pnpm (`pnpm add -g @adguard/dead-domains-linter`), pnpm
> enforces that range on install, so you need pnpm 10.x (`>=10.33.4 <11`, as
> declared in the published `package.json`); other versions fail with
> `ERR_PNPM_UNSUPPORTED_ENGINE`.

The tool is then available as the `dead-domains-linter` command. To update an
existing installation:

```bash
npm update -g @adguard/dead-domains-linter
```

## Quick Start

Run the tool in the directory that contains your filter lists. By default it
scans all `*.txt` files in the current directory and its subdirectories:

```bash
dead-domains-linter
```

The tool asks you to confirm every suggested fix. To review suggestions
without changing anything, use `--show`; to apply all fixes without prompts,
use `--auto`. Print the complete reference with:

```bash
dead-domains-linter --help
```

## Usage

### Flags

| Flag                 | Default    | Description                                                                |
| -------------------- | ---------- | -------------------------------------------------------------------------- |
| `-i, --input <glob>` | `**/*.txt` | Glob expression that selects the files to scan.                            |
| `--dnscheck`         | `true`     | Double-check dead domains with a DNS query.                                |
| `--commentout`       | `false`    | Comment rules out instead of removing them.                                |
| `--export <file>`    | —          | Export the found dead domains to a file instead of modifying filter lists. |
| `--import <file>`    | —          | Import dead domains from a file and skip all other checks.                 |
| `--ignore <file>`    | —          | File with a list of domains to ignore.                                     |
| `-a, --auto`         | `false`    | Automatically apply suggested fixes without asking.                        |
| `-s, --show`         | `false`    | Show suggestions without applying them.                                    |
| `-v, --verbose`      | `false`    | Run with verbose logging.                                                  |
| `--version`          | —          | Show the version number.                                                   |
| `-h, --help`         | —          | Show help.                                                                 |

### Workflows

#### Scan Specific Files

Pass a glob expression with `-i` to limit the scan to particular files or
directories:

```bash
dead-domains-linter -i filter.txt
dead-domains-linter -i "**/filters/**/*.txt"
```

#### Apply Fixes Automatically

`--auto` applies all suggested fixes without prompting, which makes the tool
safe to run unattended (e.g., in CI):

```bash
dead-domains-linter --auto
```

#### Preview Suggestions Only

`--show` prints the suggested fixes without modifying any file:

```bash
dead-domains-linter --show
```

#### Comment Rules Out Instead of Removing Them

With `--commentout`, affected rules are commented out rather than deleted:

```bash
dead-domains-linter --commentout
```

#### Ignore Specific Domains

Provide a file with one domain per line (blank lines are skipped) to treat
those domains as valid:

```bash
dead-domains-linter --ignore=ignore.txt
```

#### Export the List of Dead Domains

Instead of modifying filter lists, `--export` writes the unique dead domains
to a file so you can review them:

```bash
dead-domains-linter -i filter.txt --export=domains.txt
```

#### Import a Reviewed List of Dead Domains

After reviewing and cleaning up the exported list, make the tool use it
exclusively — all other checks are skipped:

```bash
dead-domains-linter -i filter.txt --import=domains.txt --auto
```

#### Disable the DNS Double-Check

> **Important.** Please read this if you maintain a filter list with a large
> number of users.

The tool relies on an AdGuard DNS snapshot of the Internet domains that
represents all domains used by 100M+ AdGuard DNS users for the last 24 hours.
Using this snapshot is a good way to find dead domains, but it alone may not
be 100% accurate and can produce false positives for really rarely visited
domains. This is why the tool also double-checks dead domains with a DNS
query.

If your filter list does not have a large number of dead domains, we
recommend disabling that double-check:

```bash
dead-domains-linter --dnscheck=false
```

> **Note.** AdGuard [filter policy](https://adguard.com/kb/general/ad-filtering/filter-policy/)
> requires that a website be popular enough to be added to a filter list, so
> even if the tool produces a false positive with `--dnscheck=false`, the
> domain most likely does not qualify for the list anyway.

### Exit Codes

| Code | Meaning                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------ |
| `0`  | The tool finished successfully.                                                                                    |
| `1`  | A fatal error occurred — e.g., an unreadable `--import` or `--ignore` file, or a file that could not be processed. |

### Input and Output

- **Input**: filter list files selected by the `-i` glob expression (default
  `**/*.txt`), optionally a list of dead domains to import (`--import`) and a
  list of domains to ignore (`--ignore`).
- **Output**: suggested fixes are applied to the filter list files in place —
  rules are removed, commented out, or stripped of dead domains. With
  `--export`, the unique dead domains are written to the specified file
  instead, and the filter lists are left untouched. Progress, prompts, and
  summaries are printed to the console.

## Configuration

The tool is configured exclusively via command-line flags (see
[Flags](#flags)). There are no configuration files and no environment
variables.

---

## Documentation

- [Development](DEVELOPMENT.md) — how to set up and contribute
- [LLM agent rules](AGENTS.md) — AI-assisted development guidelines
- [Changelog](CHANGELOG.md) — version history
