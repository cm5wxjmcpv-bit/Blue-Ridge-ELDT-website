// Blue Ridge Entry Level Driver Training
// Google Apps Script backend source
// Current curriculum + secure sessions + best-score retention + request-level Sheets caching.

const DEFAULT_SPREADSHEET_ID = "1-aXjOP2bmhasz2E4KbyMg0ANNUrbEL7wJ41YWJVt0go";
const STATUS_SHEET = "Status";
const STUDENTS_SHEET = "Students";
const ADMINS_SHEET = "Admins";
const CLASSES_SHEET = "Classes";
const MODULES_SHEET = "Modules";
const TEST_QUESTIONS_SHEET = "TestQuestions";
const STUDENT_CLASSES_SHEET = "StudentClasses";
const PROGRESS_SHEET = "Progress";
const TEST_RESULTS_SHEET = "TestResults";
const SIGNUP_REQUESTS_SHEET = "SignupRequests";
const HAZMAT_CHECKOUT_AUDIT_SHEET = "HazmatCheckoutAudit";

const DEFAULT_CLASS_ID = "class-a-b";
const HAZMAT_CLASS_ID = "hazmat";
const HAZMAT_PRICE_CENTS = 5000;
const HAZMAT_CHECKOUT_TTL_MS = 48 * 60 * 60 * 1000;
const HAZMAT_RECONCILIATION_LIMIT = 25;
const SQUARE_API_VERSION = "2026-09-16";
const HAZMAT_DEFAULT_REDIRECT_URL = "https://blueridgeeldt.com/hazmat-payment-complete.html";
const ADMIN_EMAIL = "Blueridgeeldt@gmail.com";
const BACKEND_VERSION = "2026-09-27-blue-ridge-v8-hazmat-recovery";
const LEGACY_COMPATIBILITY_FLAG = "ENABLE_LEGACY_ROLLOUT_COMPATIBILITY";
const LEGACY_COMPATIBILITY_EXPIRY = "LEGACY_ROLLOUT_COMPATIBILITY_EXPIRES_AT";

const STUDENT_HEADERS = [
  "username", "password", "updatedAt", "fullNameOnLicense", "firstName", "middleName", "lastName",
  "licenseNumber", "dob", "active", "archivedAt", "preferredContact", "email", "phone", "licenseState",
  "enrollmentId", "paymentStatus", "paymentOrderId", "paymentId", "paymentAmount", "paymentCompletedAt",
  "paymentLinkId", "checkoutCreatedAt", "checkoutExpiresAt", "originalUsername",
  "checkoutError",
  "accessEmailSentAt", "accessEmailError", "completionEmailSentAt", "completionEmailClassIds", "completionEmailError",
  "tprStatus", "trainingCompletedAt", "tprSubmittedAt"
];

const SIGNUP_REQUEST_HEADERS = [
  "createdAt", "enrollmentId", "username", "fullNameOnLicense", "firstName", "middleName", "lastName",
  "licenseNumber", "dob", "requestedClassId", "requestedClassTitle", "status", "preferredContact",
  "email", "phone", "licenseState", "paymentStatus", "paymentOrderId", "paymentId", "paymentAmount",
  "paymentCompletedAt", "paymentLinkId", "checkoutExpiresAt", "checkoutError"
];
const HAZMAT_CHECKOUT_AUDIT_HEADERS = [
  "createdAt", "enrollmentId", "username", "event", "paymentLinkId", "paymentOrderId", "detail"
];
const AUTH_TTL_SECONDS = 21600;

const DEFAULT_CLASSES = [
  [DEFAULT_CLASS_ID, "Class A and B", "CDL Class A/B ELDT training", 80, 0.9, 1, true],
  ["class-b-to-a", "Class B to A Upgrade", "Upgrade training from Class B to Class A", 80, 0.9, 2, true],
  ["passenger", "Passenger and School Bus Endorsement", "Passenger and school bus endorsement training", 80, 0.9, 3, true],
  ["school-bus", "School Bus Endorsement", "School bus endorsement training", 80, 0.9, 4, false],
  ["tanker", "Tanker Endorsement", "Tanker endorsement training", 80, 0.9, 5, false],
  ["hazmat", "Hazmat Endorsement", "Hazmat endorsement training", 80, 0.9, 6, true]
];

const DEFAULT_MODULES = [
  ["1", DEFAULT_CLASS_ID, "Module 1 — Introduction", "-qXt8htJ9h4", 1, 0.9, true],
  ["2", DEFAULT_CLASS_ID, "Module 2 — Safety & Inspection", "RS4K5FCL988", 2, 0.9, true],
  ["3", DEFAULT_CLASS_ID, "Module 3 — Basic Operations", "TLeq0WikSmU", 3, 0.9, true],
  ["4", DEFAULT_CLASS_ID, "Module 4 — Advanced Driving", "cMML4tQdVvY", 4, 0.9, true],
  ["8", "hazmat", "Hazmat Module 1", "g8WOxP_PDJ8", 1, 0.9, true],
  ["9", "hazmat", "Hazmat Module 2", "CLIhc8MWFJ8", 2, 0.9, true],
  ["10", "class-b-to-a", "B to A Upgrade", "zeaHTafu4CY", 1, 0.9, true],
  ["11", "passenger", "Passenger and School Bus Module 1", "ocQxZ3-fk1M", 1, 0.9, true],
  ["12", "passenger", "Passenger and School Bus Module 2", "Z0V1nlzn2ks", 2, 0.9, true]
];

let REQUEST_CACHE_ = null;

function withRequestCache_(callback) {
  REQUEST_CACHE_ = { ss: null, sheets: {}, headers: {}, rows: {} };
  try {
    return callback();
  } finally {
    REQUEST_CACHE_ = null;
  }
}

function cache_() {
  if (!REQUEST_CACHE_) REQUEST_CACHE_ = { ss: null, sheets: {}, headers: {}, rows: {} };
  return REQUEST_CACHE_;
}

function clearSheetCache_(name) {
  const c = cache_();
  delete c.headers[name];
  delete c.rows[name];
}

function withScriptLock_(callback, timeoutMs) {
  const lock = LockService.getScriptLock();
  lock.waitLock(timeoutMs || 30000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return withRequestCache_(function() {
    try {
      const p = (e && e.parameter) || {};
      const action = String(p.action || "").toLowerCase();
      let result;

      switch (action) {
        case "validatelogin":
          if (!legacyRolloutCompatibilityEnabled_()) {
            result = { ok: false, error: "Login requests must use POST." };
            break;
          }
          noteLegacyCompatibilityUse_("student_get_login", p.username, "");
          result = addLegacyCompatibilityNotice_(validateLogin_(p.username, p.password));
          break;
        case "adminlogin":
          if (!legacyRolloutCompatibilityEnabled_()) {
            result = { ok: false, error: "Login requests must use POST." };
            break;
          }
          noteLegacyCompatibilityUse_("admin_get_login", p.username, "");
          result = addLegacyCompatibilityNotice_(adminLogin_(p.username, p.password));
          break;
        case "liststudents":
          requireAdminToken_(p.adminToken);
          result = listStudents_();
          break;
        case "getversion":
          result = { ok: true, version: BACKEND_VERSION };
          break;
        case "getstatus":
          requireStudentToken_(p.studentToken, p.username);
          result = getStatus_(p.username, p.classId);
          break;
        case "getstudentdashboard":
          requireStudentToken_(p.studentToken, p.username);
          result = getStudentDashboard_(p.username);
          break;
        case "listclasses":
          result = listClasses_(p.activeOnly);
          break;
        case "listmodules":
          result = listModules_(p.classId, p.activeOnly);
          break;
        case "listtestquestions":
          result = listTestQuestionsForRequest_(p);
          break;
        case "setupsheets":
          requireAdminToken_(p.adminToken);
          result = setupSheets_();
          break;
        case "migrateexistingdatatoclassa":
          requireAdminToken_(p.adminToken);
          result = { ok: true, message: "Legacy Status data maps to the default Class A/B course at read time." };
          break;
        default:
          result = { ok: false, error: "Unknown action" };
      }
      return json_(result);
    } catch (err) {
      return json_({ ok: false, error: String(err && err.message ? err.message : err) });
    }
  });
}

function doPost(e) {
  return withRequestCache_(function() {
    try {
      const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
      const action = String(data.action || "").toLowerCase();
      let result;

      switch (action) {
        case "validatelogin":
          result = validateLogin_(data.username, data.password);
          break;
        case "adminlogin":
          result = adminLogin_(data.username, data.password);
          break;
        case "addstudent":
          requireAdminToken_(data.adminToken);
          result = addStudent_(data);
          break;
        case "updatestudent":
          requireAdminToken_(data.adminToken);
          result = updateStudent_(data);
          break;
        case "deletestudent":
        case "archivestudent":
          requireAdminToken_(data.adminToken);
          result = archiveStudent_(data.username);
          break;
        case "approvestudent":
          requireAdminToken_(data.adminToken);
          result = approveStudent_(data.username);
          break;
        case "logmodule":
          requireStudentToken_(data.studentToken, data.username);
          result = logModule_(data.username, data.classId, data.moduleId);
          break;
        case "logtest":
          requireStudentToken_(data.studentToken, data.username);
          result = logTest_(data.username, data.classId, data.complete, data.score);
          break;
        case "submittestanswers":
          requireStudentToken_(data.studentToken, data.username);
          result = submitTestAnswers_(data.username, data.classId, data.answers);
          break;
        case "saveclass":
          requireAdminToken_(data.adminToken);
          result = saveClass_(data);
          break;
        case "deleteclass":
        case "deactivateclass":
          requireAdminToken_(data.adminToken);
          result = deactivateById_(CLASSES_SHEET, data.id);
          break;
        case "savemodule":
          requireAdminToken_(data.adminToken);
          result = saveModule_(data);
          break;
        case "deletemodule":
        case "deactivatemodule":
          requireAdminToken_(data.adminToken);
          result = deactivateById_(MODULES_SHEET, data.id);
          break;
        case "savetestquestion":
          requireAdminToken_(data.adminToken);
          result = saveTestQuestion_(data);
          break;
        case "deletetestquestion":
        case "deactivatetestquestion":
          requireAdminToken_(data.adminToken);
          result = deactivateById_(TEST_QUESTIONS_SHEET, data.id);
          break;
        case "starthazmatcheckout":
          result = startHazmatCheckout_(data);
          break;
        case "verifyhazmatpayment":
          result = verifyHazmatPayment_(data.enrollmentId);
          break;
        case "marktprsubmitted":
          requireAdminToken_(data.adminToken);
          result = markTprSubmitted_(data.username);
          break;
        case "submitsignuprequest":
          result = submitSignupRequest_(data);
          break;
        default:
          result = { ok: false, error: "Unknown action" };
      }
      return json_(result);
    } catch (err) {
      return json_({ ok: false, error: String(err && err.message ? err.message : err) });
    }
  });
}

function issueToken_(kind, username) {
  const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  CacheService.getScriptCache().put("auth:" + kind + ":" + token, String(username || ""), AUTH_TTL_SECONDS);
  return token;
}

function tokenUser_(kind, token) {
  if (!token) return "";
  return CacheService.getScriptCache().get("auth:" + kind + ":" + String(token)) || "";
}

function requireAdminToken_(token) {
  const username = tokenUser_("admin", token);
  if (!username) throw new Error("Admin session expired. Please log in again.");
  return username;
}

function requireStudentToken_(token, username) {
  const tokenUsername = tokenUser_("student", token);
  if (!tokenUsername ||
      String(tokenUsername).trim().toLowerCase() !== String(username || "").trim().toLowerCase()) {
    throw new Error("Student session expired. Please log in again.");
  }
  return tokenUsername;
}

function requireAnyToken_(studentToken, adminToken) {
  if (tokenUser_("admin", adminToken)) return true;
  if (tokenUser_("student", studentToken)) return true;
  throw new Error("Session expired. Please log in again.");
}

function ss_() {
  const c = cache_();
  if (!c.ss) {
    const properties = PropertiesService.getScriptProperties();
    const configuredId = String(properties.getProperty("DATA_SPREADSHEET_ID") || "").trim();
    const environment = String(properties.getProperty("SQUARE_ENVIRONMENT") || "").trim().toLowerCase();
    if (environment === "sandbox" && !configuredId) {
      throw new Error("DATA_SPREADSHEET_ID is required in Sandbox so production student data is not used.");
    }
    c.ss = SpreadsheetApp.openById(configuredId || DEFAULT_SPREADSHEET_ID);
  }
  return c.ss;
}

function sh_(name) {
  const c = cache_();
  if (!c.sheets[name]) c.sheets[name] = ss_().getSheetByName(name) || ss_().insertSheet(name);
  return c.sheets[name];
}

function headers_(sheet) {
  const name = sheet.getName();
  const c = cache_();
  if (c.headers[name]) return c.headers[name];
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) return [];
  c.headers[name] = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
    return String(value || "").trim();
  });
  return c.headers[name];
}

function ensureHeaders_(name, requiredHeaders) {
  const sheet = sh_(name);
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    clearSheetCache_(name);
    return sheet;
  }

  let current = headers_(sheet).slice();
  let changed = false;
  requiredHeaders.forEach(function(header) {
    if (current.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      current.push(header);
      changed = true;
    }
  });
  if (changed) clearSheetCache_(name);
  return sheet;
}

function rowObjs_(name) {
  const c = cache_();
  if (c.rows[name]) return c.rows[name];

  const sheet = sh_(name);
  const headers = headers_(sheet);
  const lastRow = sheet.getLastRow();
  if (!headers.length || lastRow < 2) {
    c.rows[name] = [];
    return c.rows[name];
  }

  c.rows[name] = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues().map(function(row, index) {
    const obj = {};
    headers.forEach(function(header, col) { obj[header] = row[col]; });
    return { row: index + 2, obj: obj };
  });
  return c.rows[name];
}

function appendObject_(sheetName, obj) {
  const sheet = sh_(sheetName);
  const headers = headers_(sheet);
  if (!headers.length) throw new Error("Missing headers for " + sheetName);
  sheet.appendRow(headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(obj, header) ? obj[header] : "";
  }));
  const newRow = sheet.getLastRow();
  clearSheetCache_(sheetName);
  return newRow;
}

function setField_(sheet, row, header, value) {
  const headers = headers_(sheet);
  const index = headers.indexOf(header);
  if (index === -1) throw new Error("Missing header: " + header);
  sheet.getRange(row, index + 1).setValue(value);
  clearSheetCache_(sheet.getName());
}

function setFields_(sheet, row, fields) {
  const headers = headers_(sheet);
  const range = sheet.getRange(row, 1, 1, headers.length);
  const values = range.getValues()[0];
  Object.keys(fields || {}).forEach(function(header) {
    const index = headers.indexOf(header);
    if (index !== -1) values[index] = fields[header];
  });
  range.setValues([values]);
  clearSheetCache_(sheet.getName());
}

function cloneObj_(obj) {
  return Object.assign({}, obj || {});
}

function active_(value) {
  if (value === "" || value === null || value === undefined) return true;
  if (value === true) return true;
  const text = String(value).trim().toLowerCase();
  return text === "true" || text === "yes" || text === "active" || text === "complete";
}

function activeOnly_(value) {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

function complete_(value) {
  if (value === true) return true;
  const text = String(value || "").trim().toLowerCase();
  return text === "true" || text === "complete" || text === "yes";
}

function normalizeWatchPercent_(value) {
  const n = Number(value);
  if (!n || isNaN(n)) return 0.9;
  return n > 1 ? n / 100 : n;
}

function setupSheets_() {
  ensureHeaders_(STUDENTS_SHEET, STUDENT_HEADERS);
  ensureHeaders_(ADMINS_SHEET, ["username", "password"]);
  ensureHeaders_(STATUS_SHEET, ["username", "m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10", "testComplete", "testScore", "updatedAt"]);
  ensureHeaders_(CLASSES_SHEET, ["id", "title", "description", "passingScore", "requiredWatchPercent", "sortOrder", "active", "updatedAt"]);
  ensureHeaders_(MODULES_SHEET, ["id", "classId", "title", "youtubeId", "sortOrder", "requiredWatchPercent", "active", "updatedAt"]);
  ensureHeaders_(TEST_QUESTIONS_SHEET, ["id", "classId", "question", "optionA", "optionB", "optionC", "optionD", "correctIndex", "sortOrder", "active", "updatedAt"]);
  ensureHeaders_(STUDENT_CLASSES_SHEET, ["username", "classId", "active", "updatedAt"]);
  ensureHeaders_(PROGRESS_SHEET, ["username", "classId", "moduleId", "complete", "updatedAt"]);
  ensureHeaders_(TEST_RESULTS_SHEET, ["username", "classId", "complete", "score", "passed", "updatedAt"]);
  ensureHeaders_(SIGNUP_REQUESTS_SHEET, SIGNUP_REQUEST_HEADERS);
  ensureHeaders_(HAZMAT_CHECKOUT_AUDIT_SHEET, HAZMAT_CHECKOUT_AUDIT_HEADERS);
  seedRows_(CLASSES_SHEET, DEFAULT_CLASSES);
  seedRows_(MODULES_SHEET, DEFAULT_MODULES);
  return { ok: true, version: BACKEND_VERSION };
}

function seedRows_(sheetName, rows) {
  const existing = {};
  rowObjs_(sheetName).forEach(function(row) { existing[String(row.obj.id)] = true; });
  rows.forEach(function(row) {
    if (!existing[String(row[0])]) {
      const headers = headers_(sh_(sheetName));
      const obj = {};
      headers.forEach(function(header, index) {
        if (index < row.length) obj[header] = row[index];
      });
      if (headers.indexOf("updatedAt") !== -1) obj.updatedAt = new Date();
      appendObject_(sheetName, obj);
      existing[String(row[0])] = true;
    }
  });
}

function findStudent_(username) {
  const key = String(username || "").trim().toLowerCase();
  if (!key) return null;
  return rowObjs_(STUDENTS_SHEET).find(function(row) {
    return String(row.obj.username || "").trim().toLowerCase() === key;
  }) || null;
}

function requireActiveStudent_(username) {
  const student = findStudent_(username);
  if (!student || !active_(student.obj.active)) {
    throw new Error("Student is archived, inactive, or not found");
  }
  return student;
}

function classById_(classId, requireActive) {
  const id = String(classId || DEFAULT_CLASS_ID);
  const row = rowObjs_(CLASSES_SHEET).find(function(item) {
    return String(item.obj.id) === id;
  });
  if (!row) throw new Error("Class not found");
  const obj = cloneObj_(row.obj);
  if (requireActive && !active_(obj.active)) throw new Error("Class is inactive");
  obj.passingScore = Number(obj.passingScore || 80);
  obj.requiredWatchPercent = normalizeWatchPercent_(obj.requiredWatchPercent);
  obj.sortOrder = Number(obj.sortOrder || 0);
  obj.active = active_(obj.active);
  return obj;
}

function assignmentRows_(username) {
  const key = String(username || "").trim().toLowerCase();
  return rowObjs_(STUDENT_CLASSES_SHEET).filter(function(row) {
    return String(row.obj.username || "").trim().toLowerCase() === key;
  });
}

function assignedClassIds_(username) {
  const rows = assignmentRows_(username);
  if (!rows.length) return [DEFAULT_CLASS_ID];
  return rows.filter(function(row) {
    return active_(row.obj.active);
  }).map(function(row) {
    return String(row.obj.classId);
  });
}

function requireAssignedClass_(username, classId) {
  requireActiveStudent_(username);
  const id = String(classId || DEFAULT_CLASS_ID);
  if (assignedClassIds_(username).indexOf(id) === -1) {
    throw new Error("Student is not assigned to this class");
  }
  return classById_(id, true);
}

function listClasses_(activeOnly) {
  const onlyActive = activeOnly_(activeOnly);
  const classes = rowObjs_(CLASSES_SHEET).map(function(row) {
    const obj = cloneObj_(row.obj);
    obj.passingScore = Number(obj.passingScore || 80);
    obj.requiredWatchPercent = normalizeWatchPercent_(obj.requiredWatchPercent);
    obj.sortOrder = Number(obj.sortOrder || 0);
    obj.active = active_(obj.active);
    return obj;
  }).filter(function(obj) {
    return !onlyActive || obj.active;
  }).sort(function(a, b) {
    return a.sortOrder - b.sortOrder;
  });
  return { ok: true, classes: classes };
}

function listModules_(classId, activeOnly) {
  const onlyActive = activeOnly_(activeOnly);
  const id = String(classId || "");
  const modules = rowObjs_(MODULES_SHEET).map(function(row) {
    const obj = cloneObj_(row.obj);
    obj.id = String(obj.id);
    obj.classId = String(obj.classId);
    obj.sortOrder = Number(obj.sortOrder || 0);
    obj.requiredWatchPercent = normalizeWatchPercent_(obj.requiredWatchPercent);
    obj.active = active_(obj.active);
    return obj;
  }).filter(function(obj) {
    return (!id || obj.classId === id) && (!onlyActive || obj.active);
  }).sort(function(a, b) {
    return a.sortOrder - b.sortOrder;
  });
  return { ok: true, modules: modules };
}

function listTestQuestions_(classId, activeOnly) {
  const onlyActive = activeOnly_(activeOnly);
  const id = String(classId || "");
  const questions = rowObjs_(TEST_QUESTIONS_SHEET).map(function(row) {
    const obj = cloneObj_(row.obj);
    obj.id = String(obj.id);
    obj.classId = String(obj.classId);
    obj.correctIndex = Number(obj.correctIndex || 0);
    obj.sortOrder = Number(obj.sortOrder || 0);
    obj.active = active_(obj.active);
    return obj;
  }).filter(function(obj) {
    return (!id || obj.classId === id) && (!onlyActive || obj.active);
  }).sort(function(a, b) {
    return a.sortOrder - b.sortOrder;
  });
  return { ok: true, questions: questions };
}

function listTestQuestionsForRequest_(params) {
  const p = params || {};
  if (tokenUser_("admin", p.adminToken)) {
    return listTestQuestions_(p.classId, p.activeOnly);
  }

  const username = tokenUser_("student", p.studentToken);
  if (!username) throw new Error("Student session expired. Please log in again.");

  const classId = String(p.classId || DEFAULT_CLASS_ID);
  requireAssignedClass_(username, classId);
  const status = getStatus_(username, classId);
  if (!allModulesComplete_(status.modules)) {
    throw new Error("All modules for this class must be complete before opening the test");
  }

  const questions = listTestQuestions_(classId, true).questions.map(function(question) {
    return {
      id: String(question.id),
      classId: String(question.classId),
      question: question.question,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      sortOrder: Number(question.sortOrder || 0),
      active: true
    };
  });
  return { ok: true, questions: questions };
}

function validateLogin_(username, password) {
  if (!username || !password) return { ok: false, error: "Missing username or password" };
  const student = findStudent_(username);
  if (!student ||
      String(student.obj.password || "") !== String(password) ||
      !active_(student.obj.active)) {
    return { ok: false, error: "Invalid username or password" };
  }
  return {
    ok: true,
    username: student.obj.username,
    token: issueToken_("student", student.obj.username)
  };
}

function adminLogin_(username, password) {
  if (!username || !password) return { ok: false, error: "Missing username or password" };
  const key = String(username).trim().toLowerCase();
  const admin = rowObjs_(ADMINS_SHEET).find(function(row) {
    return String(row.obj.username || "").trim().toLowerCase() === key &&
      String(row.obj.password || "") === String(password);
  });
  if (!admin) return { ok: false, error: "Invalid admin login" };
  return {
    ok: true,
    username: admin.obj.username,
    token: issueToken_("admin", admin.obj.username)
  };
}

function legacyStatus_(username) {
  const key = String(username || "").trim().toLowerCase();
  const row = rowObjs_(STATUS_SHEET).find(function(item) {
    return String(item.obj.username || "").trim().toLowerCase() === key;
  });
  const out = { modules: {}, testComplete: false, testScore: "" };
  for (let i = 1; i <= 10; i++) out.modules["m" + i] = false;
  if (!row) return out;
  for (let i = 1; i <= 10; i++) out.modules["m" + i] = complete_(row.obj["m" + i]);
  out.testComplete = complete_(row.obj.testComplete);
  out.testScore = row.obj.testScore || "";
  return out;
}

function getStatus_(username, classId) {
  const id = String(classId || DEFAULT_CLASS_ID);
  const cls = requireAssignedClass_(username, id);
  const modules = listModules_(id, true).modules;
  const progressRows = rowObjs_(PROGRESS_SHEET);
  const testRows = rowObjs_(TEST_RESULTS_SHEET);
  const legacy = id === DEFAULT_CLASS_ID ? legacyStatus_(username) : null;
  const key = String(username || "").trim().toLowerCase();

  const statusModules = modules.map(function(module) {
    const progressComplete = progressRows.some(function(row) {
      return String(row.obj.username || "").trim().toLowerCase() === key &&
        String(row.obj.classId) === id &&
        String(row.obj.moduleId) === String(module.id) &&
        complete_(row.obj.complete);
    });
    return {
      id: String(module.id),
      classId: id,
      title: module.title,
      youtubeId: module.youtubeId,
      sortOrder: Number(module.sortOrder || 0),
      requiredWatchPercent: normalizeWatchPercent_(module.requiredWatchPercent || cls.requiredWatchPercent),
      active: true,
      complete: !!progressComplete || !!(legacy && legacy.modules["m" + module.id])
    };
  });

  const matches = testRows.filter(function(row) {
    return String(row.obj.username || "").trim().toLowerCase() === key &&
      String(row.obj.classId) === id;
  });

  let bestScore = "";
  let passedEver = false;
  let firstPassedAt = null;
  const passingScore = Number(cls.passingScore || 80);

  matches.forEach(function(row) {
    const score = Number(row.obj.score);
    if (!isNaN(score) && (bestScore === "" || score > Number(bestScore))) bestScore = score;
    if (complete_(row.obj.passed) ||
        (complete_(row.obj.complete) && !isNaN(score) && score >= passingScore)) {
      passedEver = true;
      const passedAt = new Date(row.obj.updatedAt);
      if (!isNaN(passedAt.getTime()) && (!firstPassedAt || passedAt < firstPassedAt)) firstPassedAt = passedAt;
    }
  });

  if (legacy) {
    const legacyScore = Number(legacy.testScore);
    if (legacy.testScore !== "" && !isNaN(legacyScore) && (bestScore === "" || legacyScore > Number(bestScore))) bestScore = legacyScore;
    if (legacy.testComplete) passedEver = true;
  }

  if (id === HAZMAT_CLASS_ID && passedEver) {
    ensureHazmatTprPending_(username, firstPassedAt || new Date());
  }

  return {
    ok: true,
    username: username,
    classId: id,
    classInfo: cls,
    modules: statusModules,
    testComplete: passedEver,
    testScore: bestScore,
    testPassed: passedEver
  };
}

function getStudentDashboard_(username) {
  requireActiveStudent_(username);
  const assigned = assignedClassIds_(username);
  const classes = listClasses_(true).classes.filter(function(cls) {
    return assigned.indexOf(String(cls.id)) !== -1;
  }).map(function(cls) {
    const copy = cloneObj_(cls);
    copy.status = getStatus_(username, cls.id);
    return copy;
  });
  return { ok: true, username: username, classes: classes };
}

function listStudents_() {
  ensureHeaders_(STUDENTS_SHEET, STUDENT_HEADERS);
  const all = rowObjs_(STUDENTS_SHEET).map(function(row) {
    const obj = cloneObj_(row.obj);
    obj.classes = assignedClassIds_(obj.username);
    return obj;
  });
  return {
    ok: true,
    students: all.filter(function(obj) { return active_(obj.active); }),
    pendingStudents: all.filter(function(obj) {
      return !active_(obj.active) && !String(obj.archivedAt || "").trim();
    }),
    backendVersion: BACKEND_VERSION
  };
}

function addStudent_(data) {
  if (!data.username || !data.password) return { ok: false, error: "Missing username or password" };
  if (findStudent_(data.username)) return { ok: false, error: "Username already exists or is archived" };

  appendObject_(STUDENTS_SHEET, {
    username: String(data.username).trim(),
    password: data.password,
    updatedAt: new Date(),
    fullNameOnLicense: data.fullNameOnLicense || "",
    licenseNumber: data.licenseNumber || "",
    dob: data.dob || "",
    active: true,
    archivedAt: "",
    preferredContact: data.preferredContact || "",
    licenseState: normalizeLicenseState_(data.licenseState)
  });
  saveAssignments_(data.username, data.classes || [DEFAULT_CLASS_ID]);
  ensureStatusRow_(data.username);
  return { ok: true };
}

function updateStudent_(data) {
  const student = findStudent_(data.username);
  if (!student) return { ok: false, error: "Student not found" };
  if (!data.password) return { ok: false, error: "Missing password" };

  const assigned = assignedClassIds_(data.username);
  const requestedClasses = Array.isArray(data.classes) ? data.classes.map(String) : assigned;
  const selfServiceHazmat = !!String(student.obj.enrollmentId || "").trim() &&
    (assigned.indexOf(HAZMAT_CLASS_ID) !== -1 || requestedClasses.indexOf(HAZMAT_CLASS_ID) !== -1);
  if (selfServiceHazmat && String(student.obj.paymentStatus || "").toLowerCase() !== "paid") {
    return { ok: false, error: "Hazmat self-service enrollment cannot be activated until Square payment is confirmed." };
  }

  const sheet = sh_(STUDENTS_SHEET);
  setField_(sheet, student.row, "password", data.password);
  setField_(sheet, student.row, "updatedAt", new Date());
  setField_(sheet, student.row, "fullNameOnLicense", data.fullNameOnLicense || "");
  setField_(sheet, student.row, "licenseNumber", data.licenseNumber || "");
  setField_(sheet, student.row, "dob", data.dob || "");
  setField_(sheet, student.row, "preferredContact", data.preferredContact || "");
  setField_(sheet, student.row, "licenseState", normalizeLicenseState_(data.licenseState));
  setField_(sheet, student.row, "active", true);
  setField_(sheet, student.row, "archivedAt", "");
  saveAssignments_(data.username, data.classes || [DEFAULT_CLASS_ID]);
  ensureStatusRow_(data.username);
  return { ok: true };
}

function approveStudent_(username) {
  const student = findStudent_(username);
  if (!student) return { ok: false, error: "Student not found" };
  if (String(student.obj.archivedAt || "").trim()) return { ok: false, error: "Archived profiles cannot be approved" };
  if (String(student.obj.enrollmentId || "").trim() &&
      assignedClassIds_(username).indexOf(HAZMAT_CLASS_ID) !== -1 &&
      String(student.obj.paymentStatus || "").toLowerCase() !== "paid") {
    return { ok: false, error: "Hazmat self-service enrollment cannot be activated until Square payment is confirmed." };
  }
  const sheet = sh_(STUDENTS_SHEET);
  setField_(sheet, student.row, "active", true);
  setField_(sheet, student.row, "updatedAt", new Date());
  setField_(sheet, student.row, "archivedAt", "");
  ensureStatusRow_(student.obj.username);
  return { ok: true };
}

function archiveStudent_(username) {
  const student = findStudent_(username);
  if (!student) return { ok: false, error: "Student not found" };
  const sheet = sh_(STUDENTS_SHEET);
  setField_(sheet, student.row, "active", false);
  setField_(sheet, student.row, "archivedAt", new Date());
  setField_(sheet, student.row, "updatedAt", new Date());
  saveAssignments_(username, []);
  return { ok: true };
}

function saveAssignments_(username, classIds) {
  const sheet = sh_(STUDENT_CLASSES_SHEET);
  const rows = assignmentRows_(username);
  rows.forEach(function(row) {
    setField_(sheet, row.row, "active", false);
    setField_(sheet, row.row, "updatedAt", new Date());
  });
  const unique = {};
  (classIds || []).forEach(function(classId) { if (classId) unique[String(classId)] = true; });
  Object.keys(unique).forEach(function(classId) {
    classById_(classId, false);
    const existing = rows.find(function(row) { return String(row.obj.classId) === classId; });
    if (existing) {
      setField_(sheet, existing.row, "active", true);
      setField_(sheet, existing.row, "updatedAt", new Date());
    } else {
      appendObject_(STUDENT_CLASSES_SHEET, { username: username, classId: classId, active: true, updatedAt: new Date() });
    }
  });
}

function ensureStatusRow_(username) {
  const key = String(username || "").trim().toLowerCase();
  const existing = rowObjs_(STATUS_SHEET).find(function(row) {
    return String(row.obj.username || "").trim().toLowerCase() === key;
  });
  return existing ? existing.row : appendObject_(STATUS_SHEET, { username: username, updatedAt: new Date() });
}

function activeModuleForClass_(classId, moduleId) {
  const module = listModules_(classId, true).modules.find(function(item) {
    return String(item.id) === String(moduleId);
  });
  if (!module) throw new Error("Module not found for this class");
  return module;
}

function logModule_(username, classId, moduleId) {
  return withScriptLock_(function() {
    return logModuleUnderLock_(username, classId, moduleId);
  });
}

function logModuleUnderLock_(username, classId, moduleId) {
  const id = String(classId || DEFAULT_CLASS_ID);
  requireAssignedClass_(username, id);
  const module = activeModuleForClass_(id, moduleId);
  const sheet = sh_(PROGRESS_SHEET);
  const key = String(username || "").trim().toLowerCase();
  const existing = rowObjs_(PROGRESS_SHEET).find(function(row) {
    return String(row.obj.username || "").trim().toLowerCase() === key &&
      String(row.obj.classId) === id &&
      String(row.obj.moduleId) === String(module.id);
  });

  if (existing) {
    setField_(sheet, existing.row, "complete", true);
    setField_(sheet, existing.row, "updatedAt", new Date());
  } else {
    appendObject_(PROGRESS_SHEET, { username: username, classId: id, moduleId: String(module.id), complete: true, updatedAt: new Date() });
  }

  if (id === DEFAULT_CLASS_ID) {
    const statusRow = ensureStatusRow_(username);
    const statusSheet = sh_(STATUS_SHEET);
    const field = "m" + module.id;
    if (headers_(statusSheet).indexOf(field) !== -1) setField_(statusSheet, statusRow, field, "complete");
    setField_(statusSheet, statusRow, "updatedAt", new Date());
  }
  return getStatus_(username, id);
}

function allModulesComplete_(modules) {
  return Array.isArray(modules) && modules.length > 0 && modules.every(function(module) { return !!module.complete; });
}

function logTest_(username, classId, complete, score) {
  const id = String(classId || DEFAULT_CLASS_ID);
  if (id.trim().toLowerCase() === HAZMAT_CLASS_ID) {
    throw new Error("Hazmat tests are graded by the server. Refresh the test page and submit your answers again.");
  }
  if (!legacyRolloutCompatibilityEnabled_()) {
    throw new Error("Tests are graded by the server. Refresh the test page and submit your answers again.");
  }

  const numericScore = Number(score);
  if (!isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
    throw new Error("Invalid legacy test score");
  }

  return withScriptLock_(function() {
    const cls = requireAssignedClass_(username, id);
    noteLegacyCompatibilityUse_("non_hazmat_log_test", username, id);
    const result = recordTestAttempt_(username, id, complete_(complete), numericScore, cls);
    result.legacyCompatibility = true;
    result.legacyCompatibilityExpiresAt = scriptProperty_(LEGACY_COMPATIBILITY_EXPIRY, false);
    return result;
  });
}

function submitTestAnswers_(username, classId, answers) {
  const id = String(classId || DEFAULT_CLASS_ID);
  const submitted = answers && typeof answers === "object" && !Array.isArray(answers) ? answers : {};

  return withScriptLock_(function() {
    const cls = requireAssignedClass_(username, id);
    const status = getStatus_(username, id);
    if (!allModulesComplete_(status.modules)) {
      throw new Error("All modules for this class must be complete before submitting the test");
    }

    const questions = listTestQuestions_(id, true).questions;
    if (!questions.length) throw new Error("No active questions are configured for this class");

    let correctCount = 0;
    let answeredCount = 0;
    questions.forEach(function(question) {
      if (!Object.prototype.hasOwnProperty.call(submitted, String(question.id))) return;
      const selected = Number(submitted[String(question.id)]);
      if (!Number.isInteger(selected) || selected < 0 || selected > 3) return;
      answeredCount++;
      if (selected === Number(question.correctIndex)) correctCount++;
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const complete = answeredCount === questions.length;
    const result = recordTestAttempt_(username, id, complete, score, cls);
    result.attemptScore = score;
    result.correctCount = correctCount;
    result.answeredCount = answeredCount;
    result.totalQuestions = questions.length;
    result.attemptPassed = complete && score >= Number(cls.passingScore || 80);
    return result;
  });
}

function recordTestAttempt_(username, classId, complete, numericScore, knownClass) {
  const id = String(classId || DEFAULT_CLASS_ID);
  const cls = knownClass || requireAssignedClass_(username, id);
  const status = getStatus_(username, id);
  if (!allModulesComplete_(status.modules)) throw new Error("All modules for this class must be complete before logging the test");

  const passed = !!complete && numericScore >= Number(cls.passingScore || 80);
  const completedAt = new Date();
  appendObject_(TEST_RESULTS_SHEET, {
    username: username,
    classId: id,
    complete: !!complete,
    score: numericScore,
    passed: passed,
    updatedAt: completedAt
  });

  if (id === DEFAULT_CLASS_ID) {
    const row = ensureStatusRow_(username);
    const sheet = sh_(STATUS_SHEET);
    const priorScore = status.testScore === "" ? null : Number(status.testScore);
    const bestScore = priorScore === null || isNaN(priorScore) ? numericScore : Math.max(priorScore, numericScore);
    const passedEver = !!status.testPassed || passed;
    setField_(sheet, row, "testComplete", passedEver ? "complete" : "");
    setField_(sheet, row, "testScore", bestScore);
    setField_(sheet, row, "updatedAt", completedAt);
  }

  if (passed && !status.testPassed) {
    if (id === HAZMAT_CLASS_ID) ensureHazmatTprPending_(username, completedAt);
    sendTestEmailSafely_(username, id, cls, numericScore, completedAt);
  } else if (id === HAZMAT_CLASS_ID && (passed || status.testPassed)) {
    ensureHazmatTprPending_(username, completedAt);
  }
  return getStatus_(username, id);
}

function saveClass_(data) {
  return upsertById_(CLASSES_SHEET, {
    id: data.id || Utilities.getUuid(),
    title: data.title || "Untitled Class",
    description: data.description || "",
    passingScore: Number(data.passingScore || 80),
    requiredWatchPercent: normalizeWatchPercent_(data.requiredWatchPercent),
    sortOrder: Number(data.sortOrder || 99),
    active: data.active === false ? false : active_(data.active)
  }, ["id", "title", "description", "passingScore", "requiredWatchPercent", "sortOrder", "active"]);
}

function saveModule_(data) {
  const classId = String(data.classId || DEFAULT_CLASS_ID);
  classById_(classId, false);
  return upsertById_(MODULES_SHEET, {
    id: data.id || Utilities.getUuid(),
    classId: classId,
    title: data.title || "Untitled Module",
    youtubeId: extractYouTubeId_(data.youtubeId || data.youtubeUrl || ""),
    sortOrder: Number(data.sortOrder || 99),
    requiredWatchPercent: normalizeWatchPercent_(data.requiredWatchPercent),
    active: data.active === false ? false : active_(data.active)
  }, ["id", "classId", "title", "youtubeId", "sortOrder", "requiredWatchPercent", "active"]);
}

function saveTestQuestion_(data) {
  const classId = String(data.classId || DEFAULT_CLASS_ID);
  classById_(classId, false);
  return upsertById_(TEST_QUESTIONS_SHEET, {
    id: data.id || Utilities.getUuid(),
    classId: classId,
    question: data.question || "",
    optionA: data.optionA || "",
    optionB: data.optionB || "",
    optionC: data.optionC || "",
    optionD: data.optionD || "",
    correctIndex: Number(data.correctIndex || 0),
    sortOrder: Number(data.sortOrder || 99),
    active: data.active === false ? false : active_(data.active)
  }, ["id", "classId", "question", "optionA", "optionB", "optionC", "optionD", "correctIndex", "sortOrder", "active"]);
}

function upsertById_(sheetName, data, fields) {
  const sheet = sh_(sheetName);
  const existing = rowObjs_(sheetName).find(function(row) { return String(row.obj.id) === String(data.id); });
  if (existing) {
    fields.forEach(function(field) { setField_(sheet, existing.row, field, data[field]); });
    if (headers_(sheet).indexOf("updatedAt") !== -1) setField_(sheet, existing.row, "updatedAt", new Date());
  } else {
    appendObject_(sheetName, Object.assign({}, data, { updatedAt: new Date() }));
  }
  return { ok: true, id: data.id };
}

function deactivateById_(sheetName, id) {
  if (!id) return { ok: false, error: "Missing id" };
  const sheet = sh_(sheetName);
  const existing = rowObjs_(sheetName).find(function(row) { return String(row.obj.id) === String(id); });
  if (!existing) return { ok: false, error: "Not found" };
  setField_(sheet, existing.row, "active", false);
  if (headers_(sheet).indexOf("updatedAt") !== -1) setField_(sheet, existing.row, "updatedAt", new Date());
  return { ok: true };
}

function ensureHazmatHeaders_() {
  ensureHeaders_(STUDENTS_SHEET, STUDENT_HEADERS);
  ensureHeaders_(SIGNUP_REQUESTS_SHEET, SIGNUP_REQUEST_HEADERS);
  ensureHeaders_(HAZMAT_CHECKOUT_AUDIT_SHEET, HAZMAT_CHECKOUT_AUDIT_HEADERS);
}

function scriptProperty_(name, required) {
  const value = String(PropertiesService.getScriptProperties().getProperty(name) || "").trim();
  if (required && !value) throw new Error("Missing required script property: " + name);
  return value;
}

function legacyRolloutCompatibilityEnabled_(now) {
  if (String(scriptProperty_(LEGACY_COMPATIBILITY_FLAG, false)).toLowerCase() !== "true") return false;
  const expiresAt = dateOrNull_(scriptProperty_(LEGACY_COMPATIBILITY_EXPIRY, false));
  return !!expiresAt && expiresAt.getTime() > (now || new Date()).getTime();
}

function addLegacyCompatibilityNotice_(result) {
  const copy = cloneObj_(result);
  copy.legacyCompatibility = true;
  copy.legacyCompatibilityExpiresAt = scriptProperty_(LEGACY_COMPATIBILITY_EXPIRY, false);
  return copy;
}

function noteLegacyCompatibilityUse_(action, username, classId) {
  console.warn("Temporary legacy compatibility used: action=" + String(action || "") +
    ", username=" + String(username || "") + ", classId=" + String(classId || ""));
}

function squareConfig_() {
  const environment = String(scriptProperty_("SQUARE_ENVIRONMENT", true)).toLowerCase();
  if (["production", "sandbox"].indexOf(environment) === -1) {
    throw new Error("SQUARE_ENVIRONMENT must be production or sandbox.");
  }
  const configuredRedirect = scriptProperty_("HAZMAT_REDIRECT_URL", false);
  if (environment === "sandbox" && !configuredRedirect) {
    throw new Error("HAZMAT_REDIRECT_URL is required for Sandbox testing.");
  }
  const redirectUrl = configuredRedirect || HAZMAT_DEFAULT_REDIRECT_URL;
  if (!/^https:\/\//i.test(redirectUrl)) throw new Error("HAZMAT_REDIRECT_URL must use HTTPS.");
  return {
    accessToken: scriptProperty_("SQUARE_ACCESS_TOKEN", true),
    locationId: scriptProperty_("SQUARE_LOCATION_ID", true),
    redirectUrl: redirectUrl,
    environment: environment
  };
}

function squareRequest_(method, path, body) {
  const cfg = squareConfig_();
  const options = {
    method: String(method || "get").toLowerCase(),
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + cfg.accessToken,
      "Square-Version": SQUARE_API_VERSION,
      "Content-Type": "application/json"
    }
  };
  if (body !== undefined && body !== null) options.payload = JSON.stringify(body);

  const baseUrl = cfg.environment === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
  const response = UrlFetchApp.fetch(baseUrl + path, options);
  const code = response.getResponseCode();
  const text = response.getContentText() || "{}";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    parsed = { raw: text };
  }

  if (code < 200 || code >= 300) {
    const codes = parsed && parsed.errors && parsed.errors.length
      ? parsed.errors.map(function(error) { return error.code || "UNKNOWN"; }).join(",")
      : "UNKNOWN";
    console.error("Square API request failed with HTTP " + code + " (" + codes + ")");
    throw new Error("The payment service is temporarily unavailable. Please try again later.");
  }
  return parsed;
}

function validEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function validPhone_(value) {
  const text = String(value || "").trim();
  const digits = text.replace(/\D/g, "");
  return /^\+?[\d\s().-]+$/.test(text) && digits.length >= 10 && digits.length <= 15;
}

function dateOrNull_(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function checkoutExpiryDate_(student) {
  const explicit = dateOrNull_(student && student.checkoutExpiresAt);
  if (explicit) return explicit;
  const created = dateOrNull_(student && (student.checkoutCreatedAt || student.updatedAt));
  return created ? new Date(created.getTime() + HAZMAT_CHECKOUT_TTL_MS) : null;
}

function checkoutExpired_(student, now) {
  const expiresAt = checkoutExpiryDate_(student);
  return !!expiresAt && expiresAt.getTime() <= (now || new Date()).getTime();
}

function rateLimitKey_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || "").toLowerCase());
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, "").slice(0, 32);
}

function enforceHazmatCheckoutRateLimit_(username, email) {
  const cache = CacheService.getScriptCache();
  [
    { key: "hazmat-rate:global", limit: 30, ttl: 600 },
    { key: "hazmat-rate:user:" + rateLimitKey_(username), limit: 4, ttl: 3600 },
    { key: "hazmat-rate:email:" + rateLimitKey_(email), limit: 4, ttl: 3600 }
  ].forEach(function(rule) {
    const count = Number(cache.get(rule.key) || 0);
    if (count >= rule.limit) throw new Error("Too many checkout attempts. Please wait and try again later.");
    cache.put(rule.key, String(count + 1), rule.ttl);
  });
}

function findStudentByEnrollmentId_(enrollmentId) {
  const key = String(enrollmentId || "").trim();
  if (!key) return null;
  return rowObjs_(STUDENTS_SHEET).find(function(row) {
    return String(row.obj.enrollmentId || "").trim() === key;
  }) || null;
}

function updateSignupRequestByEnrollmentId_(enrollmentId, fields) {
  const key = String(enrollmentId || "").trim();
  if (!key) return;
  const item = rowObjs_(SIGNUP_REQUESTS_SHEET).find(function(row) {
    return String(row.obj.enrollmentId || "").trim() === key;
  });
  if (!item) return;
  setFields_(sh_(SIGNUP_REQUESTS_SHEET), item.row, fields);
}

function recordHazmatCheckoutAudit_(student, event, detail, link) {
  const obj = student && student.obj ? student.obj : (student || {});
  appendObject_(HAZMAT_CHECKOUT_AUDIT_SHEET, {
    createdAt: new Date(),
    enrollmentId: obj.enrollmentId || "",
    username: obj.username || obj.originalUsername || "",
    event: event,
    paymentLinkId: link && link.id || obj.paymentLinkId || "",
    paymentOrderId: link && link.order_id || obj.paymentOrderId || "",
    detail: String(detail || "").slice(0, 500)
  });
}

function recordHazmatCheckoutAuditSafely_(student, event, detail, link) {
  try {
    recordHazmatCheckoutAudit_(student, event, detail, link);
  } catch (err) {
    console.error("Hazmat checkout audit write failed for " + String(student && student.obj && student.obj.enrollmentId || "") +
      ": " + String(err && err.message ? err.message : err));
  }
}

function signupRequestByEnrollmentId_(enrollmentId) {
  const key = String(enrollmentId || "").trim();
  if (!key) return null;
  return rowObjs_(SIGNUP_REQUESTS_SHEET).find(function(row) {
    return String(row.obj.enrollmentId || "").trim() === key;
  }) || null;
}

function ensureHazmatProvisionalRecords_(student, classTitle) {
  const obj = student.obj;
  saveAssignments_(obj.username, [HAZMAT_CLASS_ID]);
  clearSheetCache_(SIGNUP_REQUESTS_SHEET);
  if (!signupRequestByEnrollmentId_(obj.enrollmentId)) {
    appendObject_(SIGNUP_REQUESTS_SHEET, {
      createdAt: obj.checkoutCreatedAt || obj.updatedAt || new Date(),
      enrollmentId: obj.enrollmentId,
      username: obj.username,
      fullNameOnLicense: obj.fullNameOnLicense,
      firstName: obj.firstName,
      middleName: obj.middleName,
      lastName: obj.lastName,
      licenseNumber: obj.licenseNumber,
      dob: obj.dob,
      requestedClassId: HAZMAT_CLASS_ID,
      requestedClassTitle: classTitle || "Hazmat Endorsement",
      status: "creating_checkout",
      preferredContact: obj.email || obj.preferredContact,
      email: obj.email || obj.preferredContact,
      phone: obj.phone,
      licenseState: obj.licenseState,
      paymentStatus: "creating_checkout",
      checkoutExpiresAt: obj.checkoutExpiresAt,
      checkoutError: ""
    });
  }
}

function persistHazmatCheckoutLink_(student, link, status, errorMessage) {
  const paymentStatus = status || "awaiting_payment";
  const now = new Date();
  setFields_(sh_(STUDENTS_SHEET), student.row, {
    paymentStatus: paymentStatus,
    paymentOrderId: link.order_id,
    paymentLinkId: link.id,
    checkoutError: String(errorMessage || "").slice(0, 500),
    updatedAt: now
  });
  updateSignupRequestByEnrollmentId_(student.obj.enrollmentId, {
    status: paymentStatus,
    paymentStatus: paymentStatus,
    paymentOrderId: link.order_id,
    paymentLinkId: link.id,
    checkoutError: String(errorMessage || "").slice(0, 500)
  });
}

function hazmatCheckoutResponse_(student, link, resumed) {
  return {
    ok: true,
    resumed: !!resumed,
    enrollmentId: student.obj.enrollmentId,
    checkoutUrl: link.url,
    orderId: link.order_id,
    amount: HAZMAT_PRICE_CENTS
  };
}

function recoverHazmatCheckoutPersistenceFailure_(student, link, cfg, persistenceError) {
  const detail = String(persistenceError && persistenceError.message ? persistenceError.message : persistenceError);
  recordHazmatCheckoutAuditSafely_(student, "checkout_persistence_failed", detail, link);

  try {
    persistHazmatCheckoutLink_(student, link, "checkout_recovery", detail);
  } catch (recoveryWriteError) {
    recordHazmatCheckoutAuditSafely_(student, "recovery_metadata_write_failed",
      String(recoveryWriteError && recoveryWriteError.message ? recoveryWriteError.message : recoveryWriteError), link);
    throw new Error("Checkout was created but could not be saved. Retry with the same username, password, and email; no new Square order will be created.");
  }

  const recoverable = Object.assign({}, student.obj, {
    paymentStatus: "checkout_recovery",
    paymentOrderId: link.order_id,
    paymentLinkId: link.id
  });
  let inspection;
  try {
    inspection = inspectHazmatPayment_(recoverable, cfg);
  } catch (inspectionError) {
    recordHazmatCheckoutAuditSafely_(student, "recovery_payment_check_failed",
      String(inspectionError && inspectionError.message ? inspectionError.message : inspectionError), link);
    throw new Error("Checkout recovery is pending. Retry with the same username, password, and email.");
  }

  clearSheetCache_(STUDENTS_SHEET);
  const durableStudent = findStudentByEnrollmentId_(student.obj.enrollmentId) || student;
  if (inspection.paid) {
    activateHazmatPayment_(durableStudent, inspection);
    recordHazmatCheckoutAuditSafely_(durableStudent, "payment_recovered_after_persistence_failure", "", link);
    return { ok: true, paid: true, active: true, username: durableStudent.obj.username };
  }

  try {
    squareRequest_("delete", "/v2/online-checkout/payment-links/" + encodeURIComponent(link.id));
  } catch (cleanupError) {
    const cleanupDetail = String(cleanupError && cleanupError.message ? cleanupError.message : cleanupError);
    try {
      persistHazmatCheckoutLink_(durableStudent, link, "checkout_recovery", "Cleanup failed: " + cleanupDetail);
    } catch (ignored) {}
    recordHazmatCheckoutAuditSafely_(durableStudent, "checkout_cleanup_failed", cleanupDetail, link);
    throw new Error("Checkout recovery is pending. Retry with the same username, password, and email to resume the existing Square checkout.");
  }

  recordHazmatCheckoutAuditSafely_(durableStudent, "unpaid_checkout_cleaned_up", detail, link);
  expireHazmatEnrollment_(durableStudent, true);
  throw new Error("The checkout could not be saved and was safely canceled. Retry to create a new checkout.");
}

function createOrRecoverHazmatPaymentLink_(student, email, cfg, resumed) {
  const link = createHazmatPaymentLink_(student.obj.enrollmentId, email, cfg);
  recordHazmatCheckoutAuditSafely_(student, resumed ? "square_link_recovered" : "square_link_created", "", link);
  try {
    persistHazmatCheckoutLink_(student, link, "awaiting_payment", "");
    recordHazmatCheckoutAuditSafely_(student, "checkout_ready", "", link);
    return hazmatCheckoutResponse_(student, link, resumed);
  } catch (err) {
    return recoverHazmatCheckoutPersistenceFailure_(student, link, cfg, err);
  }
}

function startHazmatCheckout_(data) {
  ensureHazmatHeaders_();

  ["username", "password", "firstName", "lastName", "licenseNumber", "licenseState", "dob", "email", "phone"].forEach(function(key) {
    if (!String(data[key] || "").trim()) throw new Error("Missing required field: " + key);
  });
  if (!data.certify) throw new Error("You must certify that the driver information is accurate.");

  if (String(data.website || "").trim()) throw new Error("Unable to start checkout.");

  const username = String(data.username).trim();
  if (!/^[A-Za-z0-9._-]{3,50}$/.test(username)) {
    throw new Error("Username must be 3-50 characters using letters, numbers, dots, dashes, or underscores.");
  }
  if (String(data.password).length < 6) throw new Error("Password must be at least 6 characters.");

  const firstName = String(data.firstName).trim();
  const middleName = String(data.middleName || "").trim();
  const lastName = String(data.lastName).trim();
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
  const licenseNumber = String(data.licenseNumber).trim();
  const licenseState = normalizeLicenseState_(data.licenseState);
  const email = String(data.email).trim();
  const phone = String(data.phone).trim();
  const dob = String(data.dob).trim();

  if (!validLicenseState_(licenseState)) throw new Error("Select a valid license state.");
  if (!validEmail_(email)) throw new Error("Enter a valid email address.");
  if (!validPhone_(phone)) throw new Error("Enter a valid cell phone number.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw new Error("Enter a valid date of birth.");
  const dobDate = new Date(dob + "T00:00:00Z");
  if (isNaN(dobDate.getTime()) || dobDate.toISOString().slice(0, 10) !== dob || dobDate > new Date()) {
    throw new Error("Enter a valid date of birth.");
  }

  const cls = classById_(HAZMAT_CLASS_ID, true);
  const cfg = squareConfig_();

  return withScriptLock_(function() {
    clearSheetCache_(STUDENTS_SHEET);
    let existing = findStudent_(username);
    if (existing) {
      const sameEnrollment = !!String(existing.obj.enrollmentId || "").trim();
      const credentialsMatch = String(existing.obj.password || "") === String(data.password) &&
        String(existing.obj.email || existing.obj.preferredContact || "").trim().toLowerCase() === email.toLowerCase();
      if (!sameEnrollment || !credentialsMatch) {
        throw new Error("That username is unavailable. Sign in or choose another username.");
      }

      const paymentStatus = String(existing.obj.paymentStatus || "").toLowerCase();
      if (paymentStatus === "paid" && active_(existing.obj.active)) {
        return { ok: true, paid: true, active: true, username: existing.obj.username };
      }
      if (paymentStatus === "paid") {
        const paidInspection = inspectHazmatPayment_(existing.obj, cfg);
        if (!paidInspection.paid) throw new Error("This payment requires manual review.");
        activateHazmatPayment_(existing, paidInspection);
        return { ok: true, paid: true, active: true, username: existing.obj.username };
      }
      if (active_(existing.obj.active)) throw new Error("This account requires manual review.");

      if (paymentStatus === "creating_checkout") {
        ensureHazmatProvisionalRecords_(existing, cls.title);
        recordHazmatCheckoutAuditSafely_(existing, "provisional_retry", "Reusing the stable enrollment idempotency key.");
        return createOrRecoverHazmatPaymentLink_(existing, email, cfg, true);
      }

      if (paymentStatus === "awaiting_payment" || paymentStatus === "checkout_recovery") {
        if (!String(existing.obj.paymentOrderId || "").trim() || !String(existing.obj.paymentLinkId || "").trim()) {
          ensureHazmatProvisionalRecords_(existing, cls.title);
          return createOrRecoverHazmatPaymentLink_(existing, email, cfg, true);
        }
        const inspection = inspectHazmatPayment_(existing.obj, cfg);
        if (inspection.paid) {
          activateHazmatPayment_(existing, inspection);
          recordHazmatCheckoutAuditSafely_(existing, "payment_recovered_on_retry", "");
          return { ok: true, paid: true, active: true, username: existing.obj.username };
        }
        if (!checkoutExpired_(existing.obj, new Date()) && !inspection.canceled) {
          const linkResponse = squareRequest_("get", "/v2/online-checkout/payment-links/" +
            encodeURIComponent(String(existing.obj.paymentLinkId || "")));
          const existingLink = linkResponse && linkResponse.payment_link;
          if (!existingLink || !existingLink.url || String(existingLink.order_id || "") !== String(existing.obj.paymentOrderId || "")) {
            throw new Error("The existing checkout could not be resumed. Please try again later.");
          }
          if (paymentStatus === "checkout_recovery") {
            persistHazmatCheckoutLink_(existing, existingLink, "awaiting_payment", "");
            recordHazmatCheckoutAuditSafely_(existing, "checkout_recovered_on_retry", "", existingLink);
          }
          return hazmatCheckoutResponse_(existing, existingLink, true);
        }

        const wasExpired = expireHazmatEnrollment_(existing, inspection.canceled);
        if (wasExpired === "manual_review") {
          throw new Error("This older checkout needs manual review. Please contact Blue Ridge ELDT.");
        }
        if (!wasExpired) {
          return { ok: true, paid: true, active: true, username: existing.obj.username };
        }
        existing = null;
      } else {
        throw new Error("That username is unavailable. Sign in or choose another username.");
      }
    }

    enforceHazmatCheckoutRateLimit_(username, email);
    const enrollmentId = Utilities.getUuid().replace(/-/g, "");
    const checkoutCreatedAt = new Date();
    const checkoutExpiresAt = new Date(checkoutCreatedAt.getTime() + HAZMAT_CHECKOUT_TTL_MS);

    appendObject_(STUDENTS_SHEET, {
      username: username,
      password: data.password,
      updatedAt: new Date(),
      fullNameOnLicense: fullName,
      firstName: firstName,
      middleName: middleName,
      lastName: lastName,
      licenseNumber: licenseNumber,
      dob: dob,
      active: false,
      archivedAt: "",
      preferredContact: email,
      email: email,
      phone: phone,
      licenseState: licenseState,
      enrollmentId: enrollmentId,
      paymentStatus: "creating_checkout",
      paymentOrderId: "",
      paymentLinkId: "",
      checkoutCreatedAt: checkoutCreatedAt,
      checkoutExpiresAt: checkoutExpiresAt,
      checkoutError: "",
      paymentId: "",
      paymentAmount: "",
      paymentCompletedAt: "",
      tprStatus: "",
      trainingCompletedAt: ""
    });

    clearSheetCache_(STUDENTS_SHEET);
    const provisional = findStudentByEnrollmentId_(enrollmentId);
    if (!provisional) throw new Error("The provisional enrollment could not be verified. Square was not contacted.");
    ensureHazmatProvisionalRecords_(provisional, cls.title);
    recordHazmatCheckoutAudit_(provisional, "provisional_enrollment_created", "Square has not been contacted yet.");
    return createOrRecoverHazmatPaymentLink_(provisional, email, cfg, false);
  });
}

function createHazmatPaymentLink_(enrollmentId, email, cfg) {
  const redirectUrl = cfg.redirectUrl + (cfg.redirectUrl.indexOf("?") === -1 ? "?" : "&") +
    "enrollmentId=" + encodeURIComponent(enrollmentId);
  const response = squareRequest_("post", "/v2/online-checkout/payment-links", {
    idempotency_key: "hazmat-" + enrollmentId,
    quick_pay: {
      name: "Hazmat Endorsement ELDT Training",
      price_money: { amount: HAZMAT_PRICE_CENTS, currency: "USD" },
      location_id: cfg.locationId
    },
    checkout_options: {
      allow_tipping: false,
      redirect_url: redirectUrl,
      merchant_support_email: ADMIN_EMAIL
    },
    pre_populated_data: { buyer_email: email },
    payment_note: "BRELDT Hazmat Enrollment " + enrollmentId
  });
  const link = response && response.payment_link;
  if (!link || !link.id || !link.url || !link.order_id) throw new Error("Square did not return a usable checkout link.");
  return link;
}

function inspectHazmatPayment_(student, knownConfig) {
  const orderId = String(student && student.paymentOrderId || "").trim();
  if (!orderId) throw new Error("This enrollment does not have a Square order.");
  const cfg = knownConfig || squareConfig_();
  const orderResponse = squareRequest_("get", "/v2/orders/" + encodeURIComponent(orderId));
  const order = orderResponse && orderResponse.order;
  if (!order) return { paid: false, pending: true, canceled: false };

  const total = order.total_money || {};
  if (Number(total.amount || 0) !== HAZMAT_PRICE_CENTS || String(total.currency || "").toUpperCase() !== "USD") {
    throw new Error("Square order amount does not match the Hazmat course price.");
  }
  if (String(order.location_id || "") !== String(cfg.locationId)) {
    throw new Error("Square order location does not match the configured business location.");
  }

  const tenders = Array.isArray(order.tenders) ? order.tenders : [];
  let completedAmount = 0;
  const paymentIds = [];
  let completedAt = null;
  tenders.forEach(function(tender) {
    const paymentId = String(tender.payment_id || tender.id || "").trim();
    if (!paymentId) return;
    const paymentResponse = squareRequest_("get", "/v2/payments/" + encodeURIComponent(paymentId));
    const payment = paymentResponse && paymentResponse.payment;
    if (!payment || String(payment.order_id || "") !== orderId) return;
    if (String(payment.location_id || "") !== String(cfg.locationId)) return;
    if (String(payment.status || "").toUpperCase() !== "COMPLETED") return;
    if (String(payment.amount_money && payment.amount_money.currency || "").toUpperCase() !== "USD") return;

    const amount = Number(payment.amount_money && payment.amount_money.amount || 0);
    const refunded = Number(payment.refunded_money && payment.refunded_money.amount || 0);
    completedAmount += Math.max(0, amount - refunded);
    paymentIds.push(paymentId);
    const paymentDate = dateOrNull_(payment.updated_at || payment.created_at);
    if (paymentDate && (!completedAt || paymentDate > completedAt)) completedAt = paymentDate;
  });

  if (completedAmount > HAZMAT_PRICE_CENTS) {
    throw new Error("Square payments exceed the expected Hazmat course price and require manual review.");
  }
  return {
    paid: completedAmount === HAZMAT_PRICE_CENTS,
    pending: completedAmount !== HAZMAT_PRICE_CENTS,
    canceled: String(order.state || "").toUpperCase() === "CANCELED" && completedAmount === 0,
    paymentIds: paymentIds,
    completedAt: completedAt,
    completedAmount: completedAmount
  };
}

function activateHazmatPayment_(student, inspection) {
  const orderId = String(student.obj.paymentOrderId || "").trim();
  const enrollmentId = String(student.obj.enrollmentId || "").trim();
  const duplicate = rowObjs_(STUDENTS_SHEET).find(function(row) {
    if (row.row === student.row || String(row.obj.paymentStatus || "").toLowerCase() !== "paid") return false;
    const sameOrder = String(row.obj.paymentOrderId || "").trim() === orderId;
    const knownIds = String(row.obj.paymentId || "").split(",").filter(Boolean);
    const samePayment = (inspection.paymentIds || []).some(function(id) { return knownIds.indexOf(id) !== -1; });
    return sameOrder || samePayment;
  });
  if (duplicate) throw new Error("This Square payment has already been used for another enrollment.");

  const now = inspection.completedAt || new Date();
  const sheet = sh_(STUDENTS_SHEET);
  setField_(sheet, student.row, "paymentStatus", "paid");
  setField_(sheet, student.row, "paymentId", inspection.paymentIds.join(","));
  setField_(sheet, student.row, "paymentAmount", HAZMAT_PRICE_CENTS / 100);
  setField_(sheet, student.row, "paymentCompletedAt", now);
  setField_(sheet, student.row, "updatedAt", new Date());
  ensureStatusRow_(student.obj.username);
  setField_(sheet, student.row, "active", true);

  updateSignupRequestByEnrollmentId_(enrollmentId, {
    status: "paid",
    paymentStatus: "paid",
    paymentId: inspection.paymentIds.join(","),
    paymentAmount: HAZMAT_PRICE_CENTS / 100,
    paymentCompletedAt: now
  });
  sendHazmatAccessEmailSafely_(student.obj.username);
}

function expireHazmatEnrollment_(student, alreadyCanceled) {
  const linkId = String(student.obj.paymentLinkId || "").trim();
  if (!alreadyCanceled) {
    if (!linkId) {
      const reviewAt = new Date();
      const reviewSheet = sh_(STUDENTS_SHEET);
      setField_(reviewSheet, student.row, "paymentStatus", "manual_review");
      setField_(reviewSheet, student.row, "updatedAt", reviewAt);
      updateSignupRequestByEnrollmentId_(student.obj.enrollmentId, { status: "manual_review", paymentStatus: "manual_review" });
      return "manual_review";
    }
    squareRequest_("delete", "/v2/online-checkout/payment-links/" + encodeURIComponent(linkId));
    const inspection = inspectHazmatPayment_(student.obj);
    if (inspection.paid) {
      activateHazmatPayment_(student, inspection);
      return false;
    }
  }

  const username = String(student.obj.username || "");
  const enrollmentId = String(student.obj.enrollmentId || "");
  const expiredAt = new Date();
  saveAssignments_(username, []);
  const sheet = sh_(STUDENTS_SHEET);
  setField_(sheet, student.row, "originalUsername", username);
  setField_(sheet, student.row, "username", "expired-" + enrollmentId.slice(0, 20));
  setField_(sheet, student.row, "password", "");
  setField_(sheet, student.row, "active", false);
  setField_(sheet, student.row, "archivedAt", expiredAt);
  setField_(sheet, student.row, "paymentStatus", "expired");
  setField_(sheet, student.row, "updatedAt", expiredAt);
  updateSignupRequestByEnrollmentId_(enrollmentId, { status: "expired", paymentStatus: "expired" });
  return true;
}

function verifyHazmatPayment_(enrollmentId) {
  ensureHazmatHeaders_();
  return withScriptLock_(function() {
    clearSheetCache_(STUDENTS_SHEET);
    const student = findStudentByEnrollmentId_(enrollmentId);
    if (!student) return { ok: false, error: "Enrollment not found." };
    if (active_(student.obj.active) && String(student.obj.paymentStatus || "").toLowerCase() === "paid") {
      sendHazmatAccessEmailSafely_(student.obj.username);
      return { ok: true, paid: true, active: true, username: student.obj.username };
    }
    if (String(student.obj.paymentStatus || "").toLowerCase() === "paid") {
      const paidInspection = inspectHazmatPayment_(student.obj);
      if (!paidInspection.paid) return { ok: false, error: "This payment requires manual review." };
      activateHazmatPayment_(student, paidInspection);
      return { ok: true, paid: true, active: true, username: student.obj.username };
    }
    const paymentStatus = String(student.obj.paymentStatus || "").toLowerCase();
    if (["awaiting_payment", "checkout_recovery"].indexOf(paymentStatus) === -1) {
      return { ok: false, expired: true, error: "This checkout is no longer active. Start a new enrollment checkout." };
    }

    const inspection = inspectHazmatPayment_(student.obj);
    if (!inspection.paid) {
      return { ok: true, pending: true, paid: false, active: false, canceled: inspection.canceled };
    }
    activateHazmatPayment_(student, inspection);
    return { ok: true, paid: true, active: true, username: student.obj.username };
  });
}

function runHazmatPaymentReconciliation() {
  let candidates = [];
  withRequestCache_(function() {
    ensureHazmatHeaders_();
    const allCandidates = rowObjs_(STUDENTS_SHEET).filter(function(row) {
      return !!String(row.obj.enrollmentId || "").trim() &&
        ["awaiting_payment", "checkout_recovery"].indexOf(String(row.obj.paymentStatus || "").toLowerCase()) !== -1 &&
        !active_(row.obj.active);
    }).sort(function(a, b) {
      const aTime = checkoutExpiryDate_(a.obj);
      const bTime = checkoutExpiryDate_(b.obj);
      return (aTime ? aTime.getTime() : 0) - (bTime ? bTime.getTime() : 0);
    });
    const properties = PropertiesService.getScriptProperties();
    const start = allCandidates.length ? Number(properties.getProperty("HAZMAT_RECONCILIATION_CURSOR") || 0) % allCandidates.length : 0;
    const rotated = allCandidates.slice(start).concat(allCandidates.slice(0, start));
    candidates = rotated.slice(0, HAZMAT_RECONCILIATION_LIMIT).map(function(row) {
      return {
        enrollmentId: String(row.obj.enrollmentId),
        expired: checkoutExpired_(row.obj, new Date())
      };
    });
    const next = allCandidates.length ? (start + candidates.length) % allCandidates.length : 0;
    properties.setProperty("HAZMAT_RECONCILIATION_CURSOR", String(next));
  });

  let activated = 0;
  let pending = 0;
  let expired = 0;
  let failed = 0;

  candidates.forEach(function(candidate) {
    try {
      const result = withRequestCache_(function() {
        const verified = verifyHazmatPayment_(candidate.enrollmentId);
        if (verified && verified.paid) return verified;
        if (candidate.expired || (verified && verified.canceled)) {
          return withScriptLock_(function() {
            clearSheetCache_(STUDENTS_SHEET);
            const student = findStudentByEnrollmentId_(candidate.enrollmentId);
            if (!student || ["awaiting_payment", "checkout_recovery"].indexOf(
              String(student.obj.paymentStatus || "").toLowerCase()) === -1) return verified;
            const wasExpired = expireHazmatEnrollment_(student, !!(verified && verified.canceled));
            if (wasExpired === "manual_review") return { ok: true, manualReview: true };
            return wasExpired ? { ok: true, expired: true } : { ok: true, paid: true, active: true };
          });
        }
        return verified;
      });
      if (result && result.paid && result.active) activated++;
      else if (result && result.expired) expired++;
      else if (result && result.manualReview) failed++;
      else pending++;
    } catch (err) {
      failed++;
      console.error("Hazmat payment reconciliation failed for " + candidate.enrollmentId + ": " +
        String(err && err.message ? err.message : err));
    }
  });

  return {
    ok: true,
    checked: candidates.length,
    activated: activated,
    pending: pending,
    expired: expired,
    failed: failed
  };
}

function installHazmatPaymentReconciliationTrigger() {
  const handler = "runHazmatPaymentReconciliation";
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === handler) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger(handler).timeBased().everyMinutes(5).create();
  return { ok: true, message: "Hazmat payment reconciliation will run every 5 minutes." };
}

function sendHazmatAccessEmailSafely_(username) {
  const student = findStudent_(username);
  if (!student) return;
  if (dateOrNull_(student.obj.accessEmailSentAt)) return;
  const email = String(student.obj.email || student.obj.preferredContact || "").trim();
  const sheet = sh_(STUDENTS_SHEET);
  if (!validEmail_(email)) {
    setField_(sheet, student.row, "accessEmailError", "Missing or invalid email address");
    return;
  }

  try {
    MailApp.sendEmail({
      to: email,
      subject: "Your Blue Ridge ELDT Hazmat course is ready",
      name: "Blue Ridge ELDT",
      body: [
        "Your $50 Hazmat ELDT payment has been confirmed and your training account is active.",
        "",
        "Username: " + String(student.obj.username || username),
        "Sign in: https://blueridgeeldt.com/",
        "",
        "Use the password you created during enrollment. For security, your password is not included in this email.",
        "",
        "After you complete both modules and pass the final assessment, Blue Ridge ELDT will submit your successful Hazmat theory completion to the FMCSA Training Provider Registry."
      ].join("\n")
    });
    setField_(sheet, student.row, "accessEmailSentAt", new Date());
    setField_(sheet, student.row, "accessEmailError", "");
  } catch (err) {
    const message = String(err && err.message ? err.message : err).slice(0, 250);
    setField_(sheet, student.row, "accessEmailError", message);
    console.error("Hazmat access email failed for enrollment " + String(student.obj.enrollmentId || "") + ": " + message);
  }
}

function ensureHazmatTprPending_(username, completedAt) {
  ensureHazmatHeaders_();
  const student = findStudent_(username);
  if (!student) return;
  const current = String(student.obj.tprStatus || "").trim().toLowerCase();
  if (current === "submitted") return;
  const sheet = sh_(STUDENTS_SHEET);
  if (current !== "pending") setField_(sheet, student.row, "tprStatus", "pending");
  if (!dateOrNull_(student.obj.trainingCompletedAt)) {
    setField_(sheet, student.row, "trainingCompletedAt", completedAt || new Date());
  }
  if (current !== "pending" || !dateOrNull_(student.obj.trainingCompletedAt)) {
    setField_(sheet, student.row, "updatedAt", new Date());
  }
}

function repairHazmatTprStatuses() {
  return withRequestCache_(function() {
    ensureHazmatHeaders_();
    const cls = classById_(HAZMAT_CLASS_ID, false);
    const passingScore = Number(cls.passingScore || 80);
    const passed = {};
    rowObjs_(TEST_RESULTS_SHEET).forEach(function(row) {
      if (String(row.obj.classId || "") !== HAZMAT_CLASS_ID) return;
      const score = Number(row.obj.score);
      if (!complete_(row.obj.passed) && !(complete_(row.obj.complete) && !isNaN(score) && score >= passingScore)) return;
      const key = String(row.obj.username || "").trim().toLowerCase();
      const when = dateOrNull_(row.obj.updatedAt) || new Date();
      if (!passed[key] || when < passed[key].completedAt) passed[key] = { username: row.obj.username, completedAt: when };
    });

    let repaired = 0;
    Object.keys(passed).forEach(function(key) {
      const student = findStudent_(passed[key].username);
      if (!student || String(student.obj.tprStatus || "").toLowerCase() === "submitted") return;
      if (String(student.obj.tprStatus || "").toLowerCase() !== "pending" || !dateOrNull_(student.obj.trainingCompletedAt)) repaired++;
      ensureHazmatTprPending_(passed[key].username, passed[key].completedAt);
    });
    return { ok: true, passedHazmatStudents: Object.keys(passed).length, repaired: repaired };
  });
}

function markTprSubmitted_(username) {
  ensureHazmatHeaders_();
  const student = findStudent_(username);
  if (!student) return { ok: false, error: "Student not found" };
  if (assignedClassIds_(username).indexOf(HAZMAT_CLASS_ID) === -1) {
    return { ok: false, error: "Student is not assigned to Hazmat training" };
  }
  if (String(student.obj.tprStatus || "").toLowerCase() !== "pending") {
    return { ok: false, error: "This student is not currently waiting for TPR submission" };
  }

  const now = new Date();
  const sheet = sh_(STUDENTS_SHEET);
  setField_(sheet, student.row, "tprStatus", "submitted");
  setField_(sheet, student.row, "tprSubmittedAt", now);
  setField_(sheet, student.row, "updatedAt", now);
  return { ok: true, username: student.obj.username, tprStatus: "submitted", tprSubmittedAt: now };
}

function submitSignupRequest_(data) {
  ["username", "password", "fullNameOnLicense", "licenseNumber", "licenseState", "preferredContact", "dob", "requestedClassId"].forEach(function(key) {
    if (!String(data[key] || "").trim()) throw new Error("Missing required field: " + key);
  });

  const username = String(data.username).trim();
  const contact = String(data.preferredContact).trim();
  const licenseState = normalizeLicenseState_(data.licenseState);
  if (!validLicenseState_(licenseState)) throw new Error("Select a valid license state.");
  if (!validPreferredContact_(contact)) throw new Error("Enter a valid email address or cell phone number.");

  const cls = classById_(data.requestedClassId, true);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    clearSheetCache_(STUDENTS_SHEET);
    if (findStudent_(username)) throw new Error("That username is already in use. Please choose another.");

    appendObject_(STUDENTS_SHEET, {
      username: username,
      password: data.password,
      updatedAt: new Date(),
      fullNameOnLicense: data.fullNameOnLicense,
      licenseNumber: data.licenseNumber,
      dob: data.dob,
      active: false,
      archivedAt: "",
      preferredContact: contact,
      licenseState: licenseState
    });
    saveAssignments_(username, [data.requestedClassId]);
    appendObject_(SIGNUP_REQUESTS_SHEET, {
      createdAt: new Date(),
      fullNameOnLicense: data.fullNameOnLicense,
      licenseNumber: data.licenseNumber,
      dob: data.dob,
      requestedClassId: data.requestedClassId,
      requestedClassTitle: cls.title || data.requestedClassId,
      status: "new",
      preferredContact: contact,
      licenseState: licenseState
    });
  } finally {
    lock.releaseLock();
  }

  if (ADMIN_EMAIL) {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: "New Blue Ridge ELDT training request - " + String(data.fullNameOnLicense || username),
      name: "Blue Ridge ELDT Website",
      body: [
        "A new training request was submitted.",
        "",
        "Submitted: " + formatEmailDate_(new Date()),
        "Full name on license: " + String(data.fullNameOnLicense || ""),
        "Username: " + String(username || ""),
        "Date of birth: " + String(data.dob || ""),
        "Preferred contact: " + String(contact || ""),
        "License number: " + String(data.licenseNumber || ""),
        "License state: " + String(licenseState || ""),
        "Requested training: " + String(cls.title || data.requestedClassId || ""),
        "Class ID: " + String(data.requestedClassId || ""),
        "Status: Pending approval",
        "",
        "For security, the student's password is not included in this email."
      ].join("\n")
    });
  }

  return { ok: true, username: username, pendingApproval: true, backendVersion: BACKEND_VERSION };
}

function normalizeLicenseState_(value) {
  return String(value || "").trim().toUpperCase();
}

function validLicenseState_(value) {
  const code = normalizeLicenseState_(value);
  const allowed = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC","PR","VI","GU","AS","MP"];
  return allowed.indexOf(code) !== -1;
}

function validPreferredContact_(value) {
  const contact = String(value || "").trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const digits = contact.replace(/\D/g, "");
  const phoneOk = /^\+?[\d\s().-]+$/.test(contact) && digits.length >= 10 && digits.length <= 15;
  return emailOk || phoneOk;
}

function formatEmailDate_(value) {
  const date = value instanceof Date ? value : new Date(value);
  const timezone = Session.getScriptTimeZone() || "America/New_York";
  return Utilities.formatDate(date, timezone, "MMMM d, yyyy 'at' h:mm a z");
}

function sendTestEmailSafely_(username, classId, cls, score, completedAt) {
  const student = findStudent_(username);
  if (!student) return;
  const sentClasses = String(student.obj.completionEmailClassIds || "").split(",").map(function(value) {
    return value.trim();
  }).filter(Boolean);
  if (sentClasses.indexOf(String(classId)) !== -1) return;

  const sheet = sh_(STUDENTS_SHEET);
  try {
    sendTestEmail_(username, classId, cls, score, completedAt);
    sentClasses.push(String(classId));
    setField_(sheet, student.row, "completionEmailClassIds", sentClasses.join(","));
    setField_(sheet, student.row, "completionEmailSentAt", new Date());
    setField_(sheet, student.row, "completionEmailError", "");
  } catch (err) {
    const message = String(err && err.message ? err.message : err).slice(0, 250);
    setField_(sheet, student.row, "completionEmailError", message);
    console.error("Training completion email failed for " + String(classId || "") + ": " + message);
  }
}

function sendTestEmail_(username, classId, cls, score, completedAt) {
  if (!ADMIN_EMAIL) return;

  const student = findStudent_(username);
  const info = student ? student.obj : {};
  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: "Blue Ridge ELDT training completed - " + String(info.fullNameOnLicense || username),
    name: "Blue Ridge ELDT Website",
    body: [
      "A student completed their assigned training and passed the final test.",
      "",
      "Completed: " + formatEmailDate_(completedAt),
      "Full name on license: " + String(info.fullNameOnLicense || ""),
      "Username: " + String(info.username || username || ""),
      "Date of birth: " + String(info.dob || ""),
      "Preferred contact: " + String(info.preferredContact || ""),
      "License number: " + String(info.licenseNumber || ""),
      "License state: " + String(info.licenseState || ""),
      "Training completed: " + String((cls && cls.title) || classId || ""),
      "Class ID: " + String(classId || ""),
      "Final test score: " + String(score) + "%",
      "Passing score: " + String((cls && cls.passingScore) || 80) + "%",
      "Result: Passed",
      "",
      "For security, the student's password is not included in this email."
    ].join("\n")
  });
}

function extractYouTubeId_(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;
  const match = text.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : text;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
