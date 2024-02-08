# Dead Domains Linter Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog][keepachangelog], and this project adheres to [Semantic Versioning][semver].

## [Unreleased][unreleased]

[unreleased]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.18...master

## [1.0.19] - 2024-02-08

### Changed

- Changed requests to the urlfilter service so that only domain info was checked
  without testing which lists match the domain, it should speed up the process.

[1.0.19]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.18...v1.0.19

## [1.0.18] - 2024-02-01

### Fixed

- Fixed an issue with importing a list of domains. [#23][#23]

[#23]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/23
[1.0.18]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.16...v1.0.18

## [1.0.16] - 2024-01-31

### Added

- Added an option to use a pre-defined list of dead domains from a file. [#20][#20]
- Added an option to export the list of dead domains to a file. [#8][#8]

### Fixed

- Fixed the issue with keeping negated domains in a network rule [#19][#19]

[#8]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/8
[#19]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/19
[#20]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/20
[1.0.16]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.13...v1.0.16

## [1.0.13] - 2024-01-31

### Fixed

- Fixed the issue with some rarely visited domains marked as dead [#16][#16]
- Fixed the issue with rules that target IP ranges [#17][#17]
- Fixed the issue with checking FQDN in rules [#18][#18]

[#16]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/16
[#17]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/17
[#18]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/18
[1.0.13]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.8...v1.0.13

## [1.0.8] - 2024-01-31

### Fixed

- Fixed the issue with extracting domains from some URL patterns [#11][#11].
- Fixed the issue with testing custom TLD [#13][#13].

[#11]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/11
[#13]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/13
[1.0.8]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.6...v1.0.8

## [1.0.6] - 2024-01-29

### Added

- Added an option to comment the rule out instead of removing it [#4][#4].

[#4]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/4

### Changed

- Speed up the build by running several checks in parallel [#2][#2].

[#2]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/2

### Fixed

- Fixed the issue with incorrect line numbers [#1][#1].
- Fixed the issue with counting IPv4 addresses as dead domains [#5][#5].
- Fixed the issue with suggesting removing TLDs and extension IDs [#6][#6].

[#1]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/1
[#5]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/5
[#6]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/6
[1.0.6]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.4...v1.0.6

[keepachangelog]: https://keepachangelog.com/en/1.0.0/
[semver]: https://semver.org/spec/v2.0.0.html
