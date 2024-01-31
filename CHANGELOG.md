# Dead Domains Linter Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog][keepachangelog], and this project adheres to [Semantic Versioning][semver].

## [Unreleased][unreleased]

- Fixed the issue with some rarely visited domains marked as dead [#16][#16]

[#16]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/16
[unreleased]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.8...master

## [1.0.8] - 2024-01-31

### Fixed

- Fixed the issue with extracting domains from some URL patterns [#11][#11].
- Fixed the issue with testing custom TLD [#13][#13].

[#11]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/11
[#13]: https://github.com/AdguardTeam/DeadDomainsLinter/issues/13

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

[1.0.8]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.6...v1.0.8
[1.0.6]: https://github.com/AdguardTeam/DeadDomainsLinter/compare/v1.0.4...v1.0.6
[keepachangelog]: https://keepachangelog.com/en/1.0.0/
[semver]: https://semver.org/spec/v2.0.0.html
