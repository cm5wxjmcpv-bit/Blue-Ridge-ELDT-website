# Blue Ridge Entry Level Driver Training Website

This repository is the business copy of the CDL/ELDT training portal. It is intentionally separate from the City of Martinsville training website.

## Live site
- Custom domain: `blueridgeeldt.com`
- GitHub Pages branch: `main`

## Independent Google Sheet
The business data workbook is:
- **Blue Ridge ELDT website**
- Spreadsheet ID: `1-aXjOP2bmhasz2E4KbyMg0ANNUrbEL7wJ41YWJVt0go`

The original workbook already contains the legacy `Status`, `Students`, and `Admins` tabs. The newer backend adds and uses these additional tabs:
- `Classes`
- `Modules`
- `TestQuestions`
- `StudentClasses`
- `Progress`
- `TestResults`
- `SignupRequests`

## Apps Script
`app.js` contains the Google Apps Script backend source used by the newer portal. The Apps Script deployment must point to the Blue Ridge spreadsheet above, not the city spreadsheet.

The prior Blue Ridge web-app deployment URL is stored in `config.js`. When the Apps Script code is updated, update the existing deployment if possible so that URL can stay the same.

## Default Blue Ridge Class A/B modules
The seven video modules that existed in the Blue Ridge repository before the August 30, 2026 website copy were restored in `config.js`. They are also the intended seed list for the default Class A/B course.

## Branding
The copied portal pages are rebranded at runtime from `config.js`, allowing the shared portal layout to remain maintainable without tying the business site to City of Martinsville branding. The public `resources.html` page is business-specific and does not expose the copied city study-guide files.

## Safety backup
Before the September 4, 2026 separation work, the previous `main` state was preserved in:
- `backup-pre-business-separation-2026-09-04`
