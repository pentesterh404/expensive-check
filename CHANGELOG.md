# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.3.0] - 2026-03-04

### Added
- Added global toast system and migrated mutation feedback from `alert/message` to toasts.
- Added Heroicons and replaced custom/emoji icons (notification bell + paging arrows).
- Added bell ring animation on notification icon when unread count is greater than 0.
- Added `/compare` page for month-to-month comparison.
- Added grouped vertical bar chart for category comparison in Compare Months.
- Added Bill ID search support in Expenses filters.
- Added Telegram link status API (`GET /api/telegram/link`) and status panel in Settings.
- Added Telegram unlink API (`DELETE /api/telegram/link`) and `Unlink Telegram` action in Settings.
- Added debug toggle support via `debug=true/false` query and `DEBUG=true/false` environment fallback.
- Added admin-only Telegram token verification API/UI (`GET /api/admin/telegram/verify-token`).
- Added admin-only runtime config API/UI to update:
  - `NEXT_PUBLIC_BASE_URL`
  - `TELEGRAM_BOT_USERNAME`
  - `TELEGRAM_BOT_TOKEN`
- Added direct Telegram action link (`Send To Telegram`) in Settings link flow.
- Added custom React description-edit dialog in Expenses table (replacing browser prompt).

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
- Improved Telegram webhook command parsing to support `/link CODE` and `/link@bot_username CODE`.
- Expenses filtering changed to month dropdown with months that have data only.
- Expenses search scope changed to Bill ID only (within selected month).
- Compare Months dropdown now starts from first month that has data (with swap action).
- User Details modal action layout updated: `Close` moved to bottom-right.

### Fixed

- Fixed `db-export-pgdump` response typing issue for Next.js build.
- Hardened Telegram ingest flow so unlinked chats cannot create expenses.
- Improved Telegram bot reply reliability with clearer failure logging and retry behavior.
- Telegram unlinked users now receive link guidance message with `{web}/settings`.
- Parsing of tag-only expense inputs now avoids leaking category tag prefix into description.

### UI / UX

- **Notifications:** Redesigned notification dropdown in topbar — badge count is now always visible and properly styled; notification detail modal uses React Portal with backdrop blur and correct z-index stacking.
- **Dashboard:** Full mobile responsiveness — metric cards and chart sections stack to a single column on screens ≤ 768px; charts adapt legend and pie layout based on viewport width; removed horizontal overflow.
- **Expenses:** Search bar and filter controls now wrap correctly on mobile (search icon stays inside the input, not on a separate line).
- **User Manager:** Toolbar search/filter layout wraps naturally on small screens; user detail modal uses React Portal and centers properly.
- **Categories:** Redesigned to a two-column masonry layout matching `/settings` style (`s-card` sections, `s-title`/`s-subtitle` headers). Color Identity swatches now flow horizontally and wrap to the next row when space is limited. Edit action replaced with a centered modal popup (same style as Delete confirmation). Delete confirmation popup now centers correctly on mobile.
- **Settings — Telegram:** "Generate Link Code" section switches from a fixed two-column grid to a responsive single-column layout on mobile (`settings-row` class).
- **Global CSS:** Added `@media (max-width: 768px)` overrides for dashboard grid layouts, main content padding, and card/hero spacing. Tables marked with `mobile-stack-table` display as stacked label/value pairs on mobile instead of scrolling horizontally.

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

[Unreleased]: https://github.com/<owner>/<repo>/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/<owner>/<repo>/releases/tag/v0.3.0
[0.2.0]: https://github.com/<owner>/<repo>/releases/tag/v0.2.0
