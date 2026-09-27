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

## Google Apps Script Script Properties

Set these in the Apps Script project. Never place access tokens in GitHub or browser JavaScript.

### Sandbox testing

- `SQUARE_ENVIRONMENT` = `sandbox`
- `SQUARE_ACCESS_TOKEN` = Square Sandbox access token
- `SQUARE_LOCATION_ID` = Square Sandbox location ID
- `HAZMAT_REDIRECT_URL` = `https://blueridgeeldt.com/hazmat-payment-complete.html` (optional; this is the code default)

### Production

After Sandbox testing succeeds:

- `SQUARE_ENVIRONMENT` = `production`
- Replace `SQUARE_ACCESS_TOKEN` with the production token.
- Replace `SQUARE_LOCATION_ID` with the production location ID.

## Apps Script deployment

1. Replace the deployed project's backend source with this branch's `app.js`.
2. Save the project.
3. Run `setupSheets_()` once from the Apps Script editor to ensure all required columns exist.
4. Run `installHazmatPaymentReconciliationTrigger()` once from the Apps Script editor.
5. Approve the Google authorization prompts for Sheets, email, external requests, and the time-driven trigger.
6. Update the existing web-app deployment rather than creating a new URL when possible.
7. Confirm `config.js` still points at that deployment URL.

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

## Go-live sequence

1. Finish Sandbox test.
2. Change Script Properties to production Square credentials/environment.
3. Redeploy Apps Script.
4. Merge this branch to `main`.
5. Confirm GitHub Pages publishes the new Hazmat pages.
6. Perform one real $50 end-to-end transaction and refund it through Square if desired.
