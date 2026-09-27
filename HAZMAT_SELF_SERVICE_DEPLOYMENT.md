# Hazmat Self-Service v1 — Deployment Checklist

This branch is intentionally not live yet. It adds a self-service Hazmat ELDT enrollment flow while keeping FMCSA TPR submission manual.

## Student flow

1. Student opens `hazmat.html`.
2. Student completes `hazmat-signup.html` with driver and contact information.
3. The Google Apps Script backend creates a unique $50 Square-hosted checkout.
4. The student pays on Square.
5. BRELDT verifies the exact Square order/payment before activating the account.
6. The student signs in and completes the existing Hazmat modules and final test.
7. On the student's first passing test, the admin dashboard shows **TPR Pending**.
8. After the administrator submits the completion to FMCSA TPR, click **Mark Submitted**.

A five-minute Apps Script reconciliation trigger is also included so successful payments can be activated even if the student closes Square before being redirected to BRELDT.

Unpaid checkouts expire after 48 hours. Reconciliation verifies payment one last time, deletes the Square payment link (which cancels an unpaid order), retains the audit row as `expired`, clears the abandoned password, and releases the username. Re-entering the same username/password/email before expiry resumes the existing single-use checkout instead of creating a duplicate order. Each reconciliation run checks at most 25 records and rotates through the queue.

Checkout creation is provisional-first. Before Square is contacted, the backend durably writes a Student row with `paymentStatus=creating_checkout`, the Hazmat assignment, the SignupRequest, and a `provisional_enrollment_created` entry in the append-only `HazmatCheckoutAudit` sheet. The enrollment ID is then used as Square's stable idempotency key. A retry with the same username, password, and email reuses that enrollment ID instead of creating an unrelated order.

If Square creates a link but the normal Sheet update fails, the backend retries persistence as `checkout_recovery` and checks the Square order before attempting cleanup. A discovered payment is activated and is never deleted. If the order is unpaid, the backend attempts to delete the new payment link; successful cleanup archives the provisional enrollment so a retry can create a fresh checkout. If cleanup fails, the durable recovery row keeps the Square link/order IDs and a retry resumes that same checkout. If even the recovery metadata write fails, the provisional row and stable idempotency key remain; cleanup is deliberately not attempted, and a retry asks Square for the same link. These transitions are also appended to `HazmatCheckoutAudit`; audit-write failures are logged but never cause a legitimate payment record to be deleted.

## Google Apps Script Script Properties

Set these in the Apps Script project. Never place access tokens in GitHub or browser JavaScript.

### Sandbox testing

- `SQUARE_ENVIRONMENT` = `sandbox`
- `SQUARE_ACCESS_TOKEN` = Square Sandbox access token
- `SQUARE_LOCATION_ID` = Square Sandbox location ID
- `HAZMAT_REDIRECT_URL` = the HTTPS URL of the isolated staging copy of `hazmat-payment-complete.html` (**required in Sandbox**)
- `DATA_SPREADSHEET_ID` = the ID of an isolated copy/test spreadsheet (**required in Sandbox; never use the production Sheet ID**)

### Temporary cached-page compatibility during eventual rollout

The new frontend always uses POST login and `submitTestAnswers`. To avoid interrupting a student who already has the previous site open when the backend changes, the backend contains a narrow, time-bounded compatibility bridge. Before the backend rollout, set both properties:

- `ENABLE_LEGACY_ROLLOUT_COMPATIBILITY` = `true`
- `LEGACY_ROLLOUT_COMPATIBILITY_EXPIRES_AT` = a future ISO-8601 UTC timestamp, for example `2026-10-04T04:00:00Z`

Both values are required. A missing, invalid, or elapsed expiry disables the bridge automatically. While enabled, cached pages may use legacy GET student/admin login, and an authenticated old test page may submit its browser-calculated score only for a non-Hazmat class. The existing student token, active enrollment, class assignment, completed-module requirement, score range, and normal best-score rules still apply. Every compatibility use is recorded in Apps Script execution logs without logging a password.

Hazmat is excluded unconditionally: `logTest` rejects Hazmat even when the bridge is enabled, and Hazmat continues to use server-authoritative `submitTestAnswers` with answer keys confined to `app.js`/Sheets. The bridge does not change the new frontend, which continues to send credentials only by POST.

Choose an expiry that covers the planned propagation/open-page window (seven days is a conservative starting point), monitor the execution logs for legacy use, and do not extend it without a specific need. After the deadline, remove both Script Properties. Once there has been no legacy use through the agreed window, remove `legacyRolloutCompatibilityEnabled_`, the GET-login branches, and the non-Hazmat `logTest_` fallback in a separate reviewed change. GET login temporarily exposes credentials to URL/history/logging surfaces, which is why this bridge must remain short-lived.

The backend fails closed if `SQUARE_ENVIRONMENT` is absent. Sandbox also fails closed if either `HAZMAT_REDIRECT_URL` or `DATA_SPREADSHEET_ID` is absent. This prevents an incomplete Sandbox test from redirecting to the live site or writing the production student Sheet by accident.

### Production

After Sandbox testing succeeds:

- `SQUARE_ENVIRONMENT` = `production`
- Replace `SQUARE_ACCESS_TOKEN` with the production token.
- Replace `SQUARE_LOCATION_ID` with the production location ID.
- `DATA_SPREADSHEET_ID` can be omitted in production to preserve the existing Sheet, or set explicitly to the existing production Sheet ID after it is independently verified.

## Apps Script deployment

For Sandbox, use a separate Apps Script test project/deployment and isolated test spreadsheet. Do not update the live deployment or production Sheet during Sandbox preparation.

1. Put this branch's `app.js` in the isolated Apps Script test project.
2. Save the project.
3. Run `setupSheets_()` once from the Apps Script editor to ensure all required columns exist.
4. Run `installHazmatPaymentReconciliationTrigger()` once from the Apps Script editor.
5. Approve the Google authorization prompts for Sheets, email, external requests, and the time-driven trigger.
6. Create/update only the isolated test web-app deployment.
7. Configure the staging copy of `config.js` to point at the isolated deployment URL. Do not commit a production URL change merely for testing.

## Isolated staging (do not change live GitHub Pages)

Before the end-to-end Sandbox test, publish this branch's static files to a separate HTTPS staging origin. Use a separate GitHub Pages test repository/site or another isolated static preview; do not change the Pages source for `blueridgeeldt.com` and do not merge this branch merely to obtain a redirect URL.

1. Create the isolated static preview manually.
2. Confirm its `config.js` points to the Sandbox Apps Script test deployment, not the production deployment.
3. Set `HAZMAT_REDIRECT_URL` to `https://<staging-origin>/hazmat-payment-complete.html`.
4. Use only a Square Sandbox token and Sandbox location.
5. Run the test matrix below with synthetic student identity data.

No staging site or Apps Script deployment is created by this branch.

## Test before production

Use Square Sandbox and verify all of the following:

- Hazmat page displays $50.
- Enrollment form requires identity/contact fields.
- A unique Square checkout opens.
- An unpaid enrollment stays inactive.
- A completed Sandbox payment activates the account.
- The student can sign in with the credentials created at enrollment.
- Only the Hazmat class is assigned.
- Both Hazmat modules save progress.
- Final test remains locked until modules are complete.
- Passing score is 80%.
- A first passing test sets the student to TPR Pending.
- Admin can mark TPR Submitted.
- A payment completed without returning to BRELDT is picked up by the reconciliation trigger.
- Repeating verification does not send a second access email.
- A checkout can be resumed before 48 hours without creating a second order.
- A forced first post-Square Sheet write failure leaves a recoverable provisional enrollment and retry reuses the same Square idempotency key.
- A forced cleanup failure leaves `checkout_recovery` with its Square order/link IDs, and retry resumes it.
- A payment discovered during partial-failure recovery is activated and the Square link is not deleted.
- An unpaid checkout expires after 48 hours, its Square link is canceled, and the username can be used again.
- A submitted TPR record remains Submitted after status reads and repair runs.
- Run `repairHazmatTprStatuses()` and confirm it repairs a missing pending state without changing Submitted rows.

## Legacy authentication risk and migration plan

The existing system stores student and administrator passwords in plaintext in Google Sheets and returns student passwords to the authenticated admin page. This branch does not migrate authentication because active students depend on the current credentials and there is no password-reset workflow yet. Treat access to the spreadsheet and Apps Script project as access to every account.

Plan a separate migration before production hardening is considered complete:

1. Add salted, slow password hashes while retaining a temporary legacy-password fallback.
2. On each successful legacy login, replace that student's plaintext value with a hash.
3. Add a verified password-reset flow before removing the fallback.
4. Stop returning password fields from `listStudents` and remove password display from the admin UI.
5. Migrate administrator credentials separately and revoke old sessions.
6. After the migration window, remove remaining plaintext values and the fallback, then audit Sheet sharing and Apps Script editors.

The current module watch-percentage check is also enforced in browser JavaScript. A determined student can call the authenticated completion endpoint directly. Server-authoritative playback proof is not available from the present static-site/YouTube architecture; this remains a production risk and should be addressed separately (for example, server-timed module sessions with bounded heartbeats and review of anomalous completions).

The public checkout endpoint now uses a honeypot, strict input validation, short-lived CacheService limits (global plus username/email), checkout reuse, and expiry. Cache limits are lightweight and can be evicted; add a managed challenge such as Cloudflare Turnstile before launch or immediately after launch if public traffic/abuse warrants it. Keep monitoring Square link creation and Sheet growth.

## Go-live sequence

1. Finish Sandbox test.
2. Change Script Properties to production Square credentials/environment.
3. Complete human review of the branch and the Sandbox test evidence.
4. Set the two temporary legacy-compatibility properties with a reviewed future expiry before changing the backend.
5. Schedule the Apps Script and static-site rollout together so students do not receive a mismatched frontend/backend API.
6. Redeploy Apps Script.
7. Merge this branch to `main` only after the backend is ready.
8. Confirm GitHub Pages publishes the new Hazmat pages.
9. Perform one authorized real $50 end-to-end transaction and refund it through Square if desired.
10. After the compatibility deadline and log review, remove the temporary properties and schedule removal of the compatibility code.
