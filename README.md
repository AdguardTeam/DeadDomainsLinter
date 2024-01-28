# Dead Domains Linter

[![NPM](https://nodei.co/npm/@adguard/dead-domains-linter.png?compact=true)](https://www.npmjs.com/package/@adguard/dead-domains-linter/)

This is a simple tool that checks adblock filtering rules for dead domains.

In the future, it should be replaced with an [AGLint rule][aglintrule].

[aglintrule]: https://github.com/AdguardTeam/AGLint/issues/194

## How to use

First of all, install the dead-domains-linter:

```shell
npm i -g @adguard/dead-domains-linter
```

By default it runs in interactive mode, scans the current directory and all it's subdirectories for `*.txt` files, and asks the user to apply suggested changes.

Just run it in the directory with your filter lists to see how it works:

```shell
dead-domains-linter
```

Here's how the interactive mode looks like:
![dead-domain-linter](https://cdn.adtidy.org/website/github.com/DeadDomainsLinter/default-config.png)

You can specify a custom glob expression to select files that the tool will scan:

```shell
dead-domains-linter -i filter.txt
```

You can allow it to automatically apply suggestions by passing the `--auto` flag:

```shell
dead-domains-linter --auto
```

Alternatively, you can run it in the "show only" mode:

```shell
dead-domains-linter --show
```

Full usage info:

```shell
Usage: cli.js [options]

Options:
  -i, --input    glob expression that selects files that the tool will scan.
                                                  [string] [default: "**/*.txt"]
  -a, --auto     Automatically apply suggested fixes without asking the user.
                                                      [boolean] [default: false]
  -s, --show     Show suggestions without applying them.
                                                      [boolean] [default: false]
  -v, --verbose  Run with verbose logging             [boolean] [default: false]
      --version  Show version number                                   [boolean]
  -h, --help     Show help                                             [boolean]

Examples:
  cli.js -i **/*.txt       scan all .txt files in the current directory and
                           subdirectories in the interactive mode
  cli.js -a -i filter.txt  scan filter.txt and automatically apply suggested
                           fixes
```

## How to develop

First, install [pnpm](https://pnpm.io/): `npm install -g pnpm`.

Then you can use the following commands:

* `pnpm install` - install dependencies.
* `pnpm run lint` - lint the code.
* `pnpm run test` - run the unit-tests.

## TODO

* [ ] Add cometic rules modifiers support, for now they are simply ignored
