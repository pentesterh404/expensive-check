# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- Reduced Telegram link code validity window from 10 minutes to 2 minutes.
- Automatically create 4 default categories (`Food`, `Cafe`, `Transport`, `Shopping`) for every newly created user (register + admin create account).
- `Delete DB` now restores 4 default categories after wiping a user's data.
- Added admin-only DB backup tools in `Settings`: `Export DB` (JSON download) and `Import DB` (restore from backup file).

## [0.2.0] - 2026-02-27

### Changed
- Standardized loading states for major action buttons across the app.
- Updated `User Manager` actions to show action-specific states:
  - `Create User` -> `Creating...`
  - `Save` -> `Saving...`
  - `Delete User` -> `Deleting User...`
  - `Delete DB` -> `Deleting DB...`
  - `Delete DB (Admin)` -> `Deleting DB (Admin)...`
- Updated `Expenses` bulk actions:
  - `Bulk Confirm` -> `Confirming...`
  - `Bulk Delete` -> `Deleting...`
- Updated `Telegram Linking` button:
  - `Generate Link Code` -> `Generating...`
- Updated auth submit feedback:
  - Login -> `Signing in...`
  - Register/Create Account -> `Creating account...`

### Fixed
- Added safer async handling around user deletion and DB cleanup actions in `User Manager` to improve error reporting and avoid silent failures.

[Unreleased]: https://github.com/<owner>/<repo>/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/<owner>/<repo>/releases/tag/v0.2.0
