const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

function makeContext() {
  const context = vm.createContext({
    console: { error() {}, warn() {}, log() {} },
    Date,
    JSON,
    Math,
    Number,
    Object,
    String,
    Array,
    RegExp,
    Error,
    isNaN,
    isFinite,
    encodeURIComponent,
  });
  vm.runInContext(source, context, { filename: "app.js" });
  context.withScriptLock_ = (callback) => callback();
  return context;
}

function questions(count = 25) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index + 1),
    classId: "hazmat",
    question: `Question ${index + 1}`,
    optionA: "A",
    optionB: "B",
    optionC: "C",
    optionD: "D",
    correctIndex: 1,
    sortOrder: index + 1,
    active: true,
  }));
}

function gradingHarness() {
  const context = makeContext();
  context.requireAssignedClass_ = () => ({ id: "hazmat", passingScore: 80 });
  context.getStatus_ = () => ({ ok: true, modules: [{ complete: true }], testPassed: false, testScore: "" });
  context.listTestQuestions_ = () => ({ ok: true, questions: questions() });
  context.recordTestAttempt_ = (_username, _classId, complete, score) => ({
    ok: true,
    testComplete: complete && score >= 80,
    testPassed: complete && score >= 80,
    testScore: score,
  });
  return context;
}

function answerSet(correct, answered = 25) {
  const answers = {};
  for (let index = 0; index < answered; index++) answers[String(index + 1)] = index < correct ? 1 : 0;
  return answers;
}

function testGrading() {
  const context = gradingHarness();

  let result = context.submitTestAnswers_("student", "hazmat", answerSet(19));
  assert.strictEqual(result.attemptScore, 76);
  assert.strictEqual(result.attemptPassed, false);

  result = context.submitTestAnswers_("student", "hazmat", answerSet(20));
  assert.strictEqual(result.attemptScore, 80);
  assert.strictEqual(result.attemptPassed, true);

  result = context.submitTestAnswers_("student", "hazmat", answerSet(23));
  assert.strictEqual(result.attemptScore, 92);
  assert.strictEqual(result.attemptPassed, true);

  result = context.submitTestAnswers_("student", "hazmat", answerSet(20, 20));
  assert.strictEqual(result.attemptScore, 80);
  assert.strictEqual(result.answeredCount, 20);
  assert.strictEqual(result.attemptPassed, false, "unanswered questions make the attempt incomplete");

  const manipulated = answerSet(0);
  manipulated.score = 100;
  manipulated.passed = true;
  result = context.submitTestAnswers_("student", "hazmat", manipulated);
  assert.strictEqual(result.attemptScore, 0, "client score/pass fields are ignored");
  assert.strictEqual(result.attemptPassed, false);
}

function paymentContext(order, payments = {}) {
  const context = makeContext();
  context.squareRequest_ = (_method, requestPath) => {
    if (requestPath.startsWith("/v2/orders/")) return { order };
    if (requestPath.startsWith("/v2/payments/")) {
      const id = decodeURIComponent(requestPath.split("/").pop());
      return payments[id] ? { payment: payments[id] } : {};
    }
    throw new Error("Unexpected Square request");
  };
  return context;
}

function baseOrder(overrides = {}) {
  return Object.assign({
    id: "order-1",
    location_id: "location-1",
    state: "OPEN",
    total_money: { amount: 5000, currency: "USD" },
    tenders: [],
  }, overrides);
}

function completedPayment(overrides = {}) {
  return Object.assign({
    id: "payment-1",
    order_id: "order-1",
    location_id: "location-1",
    status: "COMPLETED",
    amount_money: { amount: 5000, currency: "USD" },
    refunded_money: { amount: 0, currency: "USD" },
    updated_at: "2026-09-27T12:00:00Z",
  }, overrides);
}

function testPaymentInspection() {
  const config = { locationId: "location-1" };
  const student = { paymentOrderId: "order-1" };

  let context = paymentContext(baseOrder());
  assert.strictEqual(context.inspectHazmatPayment_(student, config).pending, true);

  context = paymentContext(
    baseOrder({ state: "COMPLETED", tenders: [{ payment_id: "payment-1" }] }),
    { "payment-1": completedPayment() },
  );
  assert.strictEqual(context.inspectHazmatPayment_(student, config).paid, true);

  context = paymentContext(baseOrder({ total_money: { amount: 4900, currency: "USD" } }));
  assert.throws(() => context.inspectHazmatPayment_(student, config), /amount/);

  context = paymentContext(baseOrder({ location_id: "wrong-location" }));
  assert.throws(() => context.inspectHazmatPayment_(student, config), /location/);

  context = paymentContext(
    baseOrder({ tenders: [{ payment_id: "payment-1" }] }),
    { "payment-1": completedPayment({ refunded_money: { amount: 5000, currency: "USD" } }) },
  );
  assert.strictEqual(context.inspectHazmatPayment_(student, config).paid, false);

  context = paymentContext(baseOrder({ tenders: [{ payment_id: "missing" }] }), {});
  assert.strictEqual(context.inspectHazmatPayment_(student, config).pending, true);

  context = makeContext();
  context.squareRequest_ = () => { throw new Error("Square unavailable"); };
  assert.throws(() => context.inspectHazmatPayment_(student, config), /Square unavailable/);
}

function testQuestionSanitization() {
  const context = makeContext();
  context.tokenUser_ = (kind) => kind === "student" ? "student" : "";
  context.requireAssignedClass_ = () => ({ passingScore: 80 });
  context.getStatus_ = () => ({ modules: [{ complete: true }] });
  context.listTestQuestions_ = () => ({ ok: true, questions: questions(1) });
  const result = context.listTestQuestionsForRequest_({ studentToken: "valid", classId: "hazmat" });
  assert.strictEqual(result.questions.length, 1);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(result.questions[0], "correctIndex"), false);
}

function testPaymentIdempotency() {
  const context = makeContext();
  const student = { row: 2, obj: { username: "student", enrollmentId: "enrollment-1", paymentStatus: "awaiting_payment", active: false } };
  context.ensureHazmatHeaders_ = () => {};
  context.clearSheetCache_ = () => {};
  context.findStudentByEnrollmentId_ = () => student;
  context.inspectHazmatPayment_ = () => ({ paid: true, paymentIds: ["payment-1"], completedAt: new Date() });
  let activations = 0;
  context.activateHazmatPayment_ = () => {
    activations++;
    student.obj.paymentStatus = "paid";
    student.obj.active = true;
  };
  context.sendHazmatAccessEmailSafely_ = () => {};

  assert.strictEqual(context.verifyHazmatPayment_("enrollment-1").paid, true);
  assert.strictEqual(context.verifyHazmatPayment_("enrollment-1").paid, true);
  assert.strictEqual(activations, 1, "repeat verification must not reactivate the account");
}

function testPaymentActivationAndDuplicateGuard() {
  const context = makeContext();
  const student = {
    row: 2,
    obj: {
      username: "student",
      enrollmentId: "enrollment-1",
      paymentOrderId: "order-1",
      paymentStatus: "awaiting_payment",
      active: false,
    },
  };
  context.rowObjs_ = () => [student];
  context.sh_ = () => ({});
  context.setField_ = (_sheet, _row, field, value) => { student.obj[field] = value; };
  context.ensureStatusRow_ = () => 2;
  let updatedEnrollment = "";
  context.updateSignupRequestByEnrollmentId_ = (enrollmentId) => { updatedEnrollment = enrollmentId; };
  context.sendHazmatAccessEmailSafely_ = () => {};

  context.activateHazmatPayment_(student, {
    paid: true,
    paymentIds: ["payment-1"],
    completedAt: new Date("2026-09-27T12:00:00Z"),
  });
  assert.strictEqual(student.obj.paymentStatus, "paid");
  assert.strictEqual(student.obj.active, true);
  assert.strictEqual(updatedEnrollment, "enrollment-1");

  context.rowObjs_ = () => [student, {
    row: 3,
    obj: { paymentStatus: "paid", paymentOrderId: "order-2", paymentId: "payment-duplicate" },
  }];
  assert.throws(() => context.activateHazmatPayment_(student, {
    paymentIds: ["payment-duplicate"],
    completedAt: new Date(),
  }), /already been used/);
}

function testTprTransition() {
  const context = makeContext();
  context.ensureHazmatHeaders_ = () => {};
  context.sh_ = () => ({});
  context.headers_ = () => [];
  context.clearSheetCache_ = () => {};

  const student = { row: 2, obj: { tprStatus: "", trainingCompletedAt: "" } };
  context.findStudent_ = () => student;
  context.setField_ = (_sheet, _row, field, value) => { student.obj[field] = value; };
  context.ensureHazmatTprPending_("student", new Date("2026-09-27T12:00:00Z"));
  assert.strictEqual(student.obj.tprStatus, "pending");

  student.obj.tprStatus = "submitted";
  const submittedAt = new Date("2026-09-28T12:00:00Z");
  student.obj.tprSubmittedAt = submittedAt;
  context.ensureHazmatTprPending_("student", new Date());
  assert.strictEqual(student.obj.tprStatus, "submitted");
  assert.strictEqual(student.obj.tprSubmittedAt, submittedAt);
}

function testCheckoutExpiry() {
  const context = makeContext();
  const now = new Date("2026-09-27T12:00:00Z");
  assert.strictEqual(context.checkoutExpired_({ checkoutExpiresAt: "2026-09-27T11:59:59Z" }, now), true);
  assert.strictEqual(context.checkoutExpired_({ checkoutExpiresAt: "2026-09-27T12:00:01Z" }, now), false);
  assert.strictEqual(context.checkoutExpired_({ checkoutCreatedAt: "2026-09-25T11:00:00Z" }, now), true);
  assert.strictEqual(context.hazmatReconciliationCandidate_({
    enrollmentId: "enrollment-1",
    paymentStatus: "creating_checkout",
    active: false,
    checkoutExpiresAt: "2026-09-27T11:59:59Z",
  }, now), true, "stale provisional records must be released by reconciliation");
  assert.strictEqual(context.hazmatReconciliationCandidate_({
    enrollmentId: "enrollment-1",
    paymentStatus: "creating_checkout",
    active: false,
    checkoutExpiresAt: "2026-09-27T12:00:01Z",
  }, now), false, "fresh provisional records wait for the student's retry");
}

function testLegacyRolloutCompatibility() {
  const context = makeContext();
  const properties = {
    ENABLE_LEGACY_ROLLOUT_COMPATIBILITY: "true",
    LEGACY_ROLLOUT_COMPATIBILITY_EXPIRES_AT: "2999-01-01T00:00:00Z",
  };
  context.scriptProperty_ = (name) => properties[name] || "";

  assert.strictEqual(
    context.legacyRolloutCompatibilityEnabled_(new Date("2026-09-27T12:00:00Z")),
    true,
  );
  properties.LEGACY_ROLLOUT_COMPATIBILITY_EXPIRES_AT = "2026-09-27T11:59:59Z";
  assert.strictEqual(
    context.legacyRolloutCompatibilityEnabled_(new Date("2026-09-27T12:00:00Z")),
    false,
    "the bridge must turn itself off at the configured deadline",
  );
  properties.LEGACY_ROLLOUT_COMPATIBILITY_EXPIRES_AT = "2999-01-01T00:00:00Z";

  context.json_ = (value) => value;
  context.validateLogin_ = (username, password) => ({ ok: username === "student" && password === "secret", token: "student-token" });
  context.adminLogin_ = (username, password) => ({ ok: username === "admin" && password === "secret", token: "admin-token" });
  let result = context.doGet({ parameter: { action: "validateLogin", username: "student", password: "secret" } });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.legacyCompatibility, true);
  result = context.doGet({ parameter: { action: "adminLogin", username: "admin", password: "secret" } });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.legacyCompatibility, true);

  let recorded = 0;
  context.requireAssignedClass_ = (_username, classId) => ({ id: classId, passingScore: 80 });
  context.recordTestAttempt_ = (_username, classId, complete, score) => {
    recorded++;
    return { ok: true, classId, complete, score };
  };
  result = context.logTest_("student", "passenger", true, 88);
  assert.strictEqual(result.score, 88);
  assert.strictEqual(result.legacyCompatibility, true);
  assert.strictEqual(recorded, 1);

  assert.throws(
    () => context.logTest_("student", "hazmat", true, 100),
    /Hazmat tests are graded by the server/,
    "Hazmat must never accept a browser-computed score, even while compatibility is enabled",
  );
  assert.throws(() => context.logTest_("student", " HAZMAT ", true, 100), /Hazmat tests are graded by the server/);
  assert.strictEqual(recorded, 1);

  properties.ENABLE_LEGACY_ROLLOUT_COMPATIBILITY = "false";
  assert.throws(() => context.logTest_("student", "passenger", true, 88), /graded by the server/);
  result = context.doGet({ parameter: { action: "validateLogin", username: "student", password: "secret" } });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /POST/);
}

function checkoutRecoveryHarness() {
  const context = makeContext();
  const student = {
    row: 2,
    obj: {
      username: "student",
      enrollmentId: "stable-enrollment-id",
      paymentStatus: "creating_checkout",
      active: false,
    },
  };
  const link = { id: "link-1", order_id: "order-1", url: "https://square.test/link-1" };
  context.recordHazmatCheckoutAuditSafely_ = () => {};
  context.findStudentByEnrollmentId_ = () => student;
  return { context, student, link };
}

function validHazmatSignup() {
  return {
    username: "student",
    password: "secret1",
    firstName: "Test",
    lastName: "Student",
    licenseNumber: "TEST123",
    licenseState: "VA",
    dob: "1990-01-01",
    email: "student@example.com",
    phone: "555-555-0100",
    certify: true,
  };
}

function testProvisionalEnrollmentPrecedesSquare() {
  const context = makeContext();
  const events = [];
  const provisional = {
    row: 2,
    obj: {
      username: "student",
      enrollmentId: "stable-enrollment-id",
      checkoutCreatedAt: new Date(),
      checkoutExpiresAt: new Date(),
    },
  };
  context.Utilities = { getUuid: () => "stable-enrollment-id" };
  context.ensureHazmatHeaders_ = () => {};
  context.classById_ = () => ({ title: "Hazmat Endorsement" });
  context.squareConfig_ = () => ({});
  context.clearSheetCache_ = () => {};
  context.findStudent_ = () => null;
  context.enforceHazmatCheckoutRateLimit_ = () => {};
  context.appendObject_ = (sheetName) => {
    events.push(`append:${sheetName}`);
    return 2;
  };
  context.findStudentByEnrollmentId_ = () => provisional;
  context.ensureHazmatProvisionalRecords_ = () => { events.push("provisional-related-records"); };
  context.recordHazmatCheckoutAudit_ = () => { events.push("provisional-audit"); };
  context.createOrRecoverHazmatPaymentLink_ = () => {
    events.push("square");
    return { ok: true };
  };

  assert.strictEqual(context.startHazmatCheckout_(validHazmatSignup()).ok, true);
  assert.deepStrictEqual(events, [
    "append:Students",
    "provisional-related-records",
    "provisional-audit",
    "square",
  ]);

  let squareCalls = 0;
  context.appendObject_ = () => { throw new Error("first provisional Sheet write failed"); };
  context.createOrRecoverHazmatPaymentLink_ = () => { squareCalls++; return { ok: true }; };
  assert.throws(() => context.startHazmatCheckout_(validHazmatSignup()), /provisional Sheet write failed/);
  assert.strictEqual(squareCalls, 0, "Square must not be contacted until the provisional enrollment is durable");
}

function testSquareSuccessThenPersistenceFailureAndRetry() {
  const { context, student, link } = checkoutRecoveryHarness();
  const enrollmentIds = [];
  context.createHazmatPaymentLink_ = (enrollmentId) => {
    enrollmentIds.push(enrollmentId);
    return link;
  };
  let writes = 0;
  context.persistHazmatCheckoutLink_ = () => {
    writes++;
    if (writes <= 2) throw new Error("Sheets unavailable");
    student.obj.paymentStatus = "awaiting_payment";
    student.obj.paymentOrderId = link.order_id;
    student.obj.paymentLinkId = link.id;
  };
  let cleanupCalls = 0;
  context.squareRequest_ = (method) => {
    if (method === "delete") cleanupCalls++;
    return {};
  };

  assert.throws(
    () => context.createOrRecoverHazmatPaymentLink_(student, "student@example.com", {}, false),
    /same username, password, and email/,
  );
  assert.strictEqual(cleanupCalls, 0, "an unrecorded link must not be deleted because the stable idempotency key is the recovery path");

  const result = context.createOrRecoverHazmatPaymentLink_(student, "student@example.com", {}, true);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.resumed, true);
  assert.deepStrictEqual(enrollmentIds, ["stable-enrollment-id", "stable-enrollment-id"]);
  assert.strictEqual(result.checkoutUrl, link.url);
}

function testCheckoutCleanupFailureRemainsRecoverable() {
  const { context, student, link } = checkoutRecoveryHarness();
  context.createHazmatPaymentLink_ = () => link;
  let writes = 0;
  context.persistHazmatCheckoutLink_ = (_student, persistedLink, status) => {
    writes++;
    if (writes === 1) throw new Error("first Sheets write failed");
    student.obj.paymentStatus = status;
    student.obj.paymentOrderId = persistedLink.order_id;
    student.obj.paymentLinkId = persistedLink.id;
  };
  context.inspectHazmatPayment_ = () => ({ paid: false, pending: true, canceled: false });
  context.squareRequest_ = (method) => {
    if (method === "delete") throw new Error("Square cleanup unavailable");
    return {};
  };
  let expired = 0;
  context.expireHazmatEnrollment_ = () => { expired++; };

  assert.throws(
    () => context.createOrRecoverHazmatPaymentLink_(student, "student@example.com", {}, false),
    /recovery is pending/,
  );
  assert.strictEqual(student.obj.paymentStatus, "checkout_recovery");
  assert.strictEqual(student.obj.paymentOrderId, "order-1");
  assert.strictEqual(expired, 0, "a failed cleanup must not discard the durable recovery record");
}

function testPaymentDiscoveredDuringPersistenceRecovery() {
  const { context, student, link } = checkoutRecoveryHarness();
  context.createHazmatPaymentLink_ = () => link;
  let writes = 0;
  context.persistHazmatCheckoutLink_ = (_student, persistedLink, status) => {
    writes++;
    if (writes === 1) throw new Error("first Sheets write failed");
    student.obj.paymentStatus = status;
    student.obj.paymentOrderId = persistedLink.order_id;
    student.obj.paymentLinkId = persistedLink.id;
  };
  context.inspectHazmatPayment_ = () => ({
    paid: true,
    pending: false,
    canceled: false,
    paymentIds: ["payment-1"],
    completedAt: new Date("2026-09-27T12:00:00Z"),
  });
  let deleted = 0;
  context.squareRequest_ = (method) => { if (method === "delete") deleted++; return {}; };
  let activations = 0;
  context.activateHazmatPayment_ = () => {
    activations++;
    student.obj.paymentStatus = "paid";
    student.obj.active = true;
  };

  const result = context.createOrRecoverHazmatPaymentLink_(student, "student@example.com", {}, false);
  assert.strictEqual(result.paid, true);
  assert.strictEqual(result.active, true);
  assert.strictEqual(activations, 1);
  assert.strictEqual(deleted, 0, "a paid Square order must never be cleaned up");
}

function testStableSquareIdempotencyKey() {
  const context = makeContext();
  const bodies = [];
  context.squareRequest_ = (_method, _path, body) => {
    bodies.push(body);
    return { payment_link: { id: "link-1", order_id: "order-1", url: "https://square.test/link-1" } };
  };
  const cfg = { redirectUrl: "https://staging.test/complete", locationId: "location-1" };
  context.createHazmatPaymentLink_("stable-enrollment-id", "student@example.com", cfg);
  context.createHazmatPaymentLink_("stable-enrollment-id", "student@example.com", cfg);
  assert.strictEqual(bodies[0].idempotency_key, "hazmat-stable-enrollment-id");
  assert.strictEqual(bodies[1].idempotency_key, bodies[0].idempotency_key);
}

testGrading();
testPaymentInspection();
testQuestionSanitization();
testPaymentIdempotency();
testPaymentActivationAndDuplicateGuard();
testTprTransition();
testCheckoutExpiry();
testLegacyRolloutCompatibility();
testProvisionalEnrollmentPrecedesSquare();
testSquareSuccessThenPersistenceFailureAndRetry();
testCheckoutCleanupFailureRemainsRecoverable();
testPaymentDiscoveredDuringPersistenceRecovery();
testStableSquareIdempotencyKey();
console.log("hardening tests passed");
