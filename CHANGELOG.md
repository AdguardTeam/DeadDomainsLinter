# Dead Domains Linter Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog][keepachangelog], and this project adheres to [Semantic Versioning][semver].

## [1.0.5] - 2024-01-29

### Added

- Added an option to comment the rule out instead of removing it [#4].

### Changed

- Speed up the build by running several checks in parallel [#2].

### Fixed

- Fixed the issue with incorrect line numbers [#1].
- Fixed the issue with counting IPv4 addresses as dead domains [#5].
- Fixed the issue with suggesting removing TLDs and extension IDs [#6].

[1.0.5]: https://github.com/AdguardTeam/AGLint/compare/v1.0.4...v1.0.5
[keepachangelog]: https://keepachangelog.com/en/1.0.0/
[semver]: https://semver.org/spec/v2.0.0.html
