# Dead Domains Linter Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog], and this project adheres to [Semantic Versioning].

[Keep a Changelog]: https://keepachangelog.com/en/1.0.0/
[Semantic Versioning]: https://semver.org/spec/v2.0.0.html

## [1.0.23] - 2025-07-07

### Added
 - Option to add a file with domains to ignore when running [#33].

[1.0.23]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.22...v1.0.23
[#33]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/32

## [1.0.22] - 2024-12-26

### Fixed

- `consola.info is not a function` error [#32].

[1.0.22]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.19...v1.0.22
[#32]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/32

## [1.0.19] - 2024-02-08

### Changed

- Requests to the urlfilter service so that only domain info was checked
  without testing which lists match the domain, it should speed up the process.

[1.0.19]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.18...v1.0.19

## [1.0.18] - 2024-02-01

### Fixed

- Issue with importing a list of domains [#23].

[1.0.18]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.16...v1.0.18
[#23]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/23

## [1.0.16] - 2024-01-31

### Added

- Option to use a pre-defined list of dead domains from a file [#20].
- Option to export the list of dead domains to a file [#8].

### Fixed

- Issue with keeping negated domains in a network rule [#19].

[1.0.16]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.13...v1.0.16
[#8]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/8
[#19]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/19
[#20]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/20

## [1.0.13] - 2024-01-31

### Fixed

- Issue with some rarely visited domains marked as dead [#16].
- Issue with rules that target IP ranges [#17].
- Issue with checking FQDN in rules [#18].

[1.0.13]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.8...v1.0.13
[#16]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/16
[#17]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/17
[#18]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/18

## [1.0.8] - 2024-01-31

### Fixed

- Issue with extracting domains from some URL patterns [#11].
- Issue with testing custom TLD [#13].

[1.0.8]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.6...v1.0.8
[#11]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/11
[#13]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/13

## [1.0.6] - 2024-01-29

### Added

- Option to comment the rule out instead of removing it [#4].

### Changed

- Speed up the build by running several checks in parallel [#2].

### Fixed

- Issue with incorrect line numbers [#1].
- Issue with counting IPv4 addresses as dead domains [#5].
- Issue with suggesting removing TLDs and extension IDs [#6].

[1.0.6]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.4...v1.0.6
[#1]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/1
[#2]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/2
[#4]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/4
[#5]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/5
[#6]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/6
