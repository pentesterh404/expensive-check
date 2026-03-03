# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Added global toast system and migrated mutation feedback from `alert/message` to toasts.
- Added Heroicons and replaced custom/emoji icons (notification bell + paging arrows).
- Added bell ring animation on notification icon when unread count is greater than 0.
- Added `/compare` page for month-to-month comparison.
- Added grouped vertical bar chart for category comparison in Compare Months.
- Added Bill ID search support in Expenses filters.

### Changed
- Reduced Telegram link code validity window from 10 minutes to 2 minutes.
- Automatically create 4 default categories (`Food`, `Cafe`, `Transport`, `Shopping`) for every newly created user (register + admin create account).
- `Delete DB` now restores 4 default categories after wiping a user's data.
- Added admin-only DB backup tools in `Settings`: `Export DB` (JSON download) and `Import DB` (restore from backup file).
- Added admin-only `Export SQL (pg_dump)` in `Settings` via `/api/admin/db-export-pgdump`.
- Removed `parseConfidence` from app data flow and DB usage.
- Expenses table updates:
  - removed confidence column
  - added Bill ID column (before description)
- Expense detail modal simplified to read-only with close action.
- Toast position moved to bottom-right.
- Compare Months menu moved to the end of the sidebar menu.
- UI responsiveness improvements for dashboard, expenses, pagination, and charts.

### Fixed
- Fixed `db-export-pgdump` response typing issue for Next.js build.

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
