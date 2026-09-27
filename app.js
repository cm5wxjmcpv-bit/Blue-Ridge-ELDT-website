// Blue Ridge Entry Level Driver Training
// Google Apps Script backend source
// Current curriculum + secure sessions + best-score retention + request-level Sheets caching.

const SPREADSHEET_ID = "1-aXjOP2bmhasz2E4KbyMg0ANNUrbEL7wJ41YWJVt0go";
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

const DEFAULT_CLASS_ID = "class-a-b";
const HAZMAT_CLASS_ID = "hazmat";
const HAZMAT_PRICE_CENTS = 5000;
const SQUARE_API_VERSION = "2026-09-16";
const HAZMAT_DEFAULT_REDIRECT_URL = "https://blueridgeeldt.com/hazmat-payment-complete.html";
const ADMIN_EMAIL = "Blueridgeeldt@gmail.com";
const BACKEND_VERSION = "2026-09-27-blue-ridge-v7-hazmat-checkout";

const STUDENT_HEADERS = [
  "username", "password", "updatedAt", "fullNameOnLicense", "firstName", "middleName", "lastName",
  "licenseNumber", "dob", "active", "archivedAt", "preferredContact", "email", "phone", "licenseState",
  "enrollmentId", "paymentStatus", "paymentOrderId", "paymentId", "paymentAmount", "paymentCompletedAt",
  "tprStatus", "trainingCompletedAt", "tprSubmittedAt"
];

const SIGNUP_REQUEST_HEADERS = [
  "createdAt", "enrollmentId", "fullNameOnLicense", "firstName", "middleName", "lastName",
  "licenseNumber", "dob", "requestedClassId", "requestedClassTitle", "status", "preferredContact",
  "email", "phone", "licenseState", "paymentStatus", "paymentOrderId", "paymentId", "paymentAmount",
  "paymentCompletedAt"
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

function doGet(e) {
  return withRequestCache_(function() {
    try {
      const p = (e && e.parameter) || {};
      const action = String(p.action || "").toLowerCase();
      let result;

      switch (action) {
        case "validatelogin":
          result = validateLogin_(p.username, p.password);
          break;
        case "adminlogin":
          result = adminLogin_(p.username, p.password);
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
          requireAnyToken_(p.studentToken, p.adminToken);
          result = listTestQuestions_(p.classId, p.activeOnly);
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
  if (!c.ss) c.ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
  const passingScore = Number(cls.passingScore || 80);

  matches.forEach(function(row) {
    const score = Number(row.obj.score);
    if (!isNaN(score) && (bestScore === "" || score > Number(bestScore))) bestScore = score;
    if (complete_(row.obj.passed) ||
        (complete_(row.obj.complete) && !isNaN(score) && score >= passingScore)) passedEver = true;
  });

  if (legacy) {
    const legacyScore = Number(legacy.testScore);
    if (legacy.testScore !== "" && !isNaN(legacyScore) && (bestScore === "" || legacyScore > Number(bestScore))) bestScore = legacyScore;
    if (legacy.testComplete) passedEver = true;
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
  const cls = requireAssignedClass_(username, id);
  const status = getStatus_(username, id);
  if (!allModulesComplete_(status.modules)) throw new Error("All modules for this class must be complete before logging the test");

  const numericScore = Number(score);
  if (isNaN(numericScore)) throw new Error("Missing score");
  const passed = !!complete && numericScore >= Number(cls.passingScore || 80);

  appendObject_(TEST_RESULTS_SHEET, { username: username, classId: id, complete: !!complete, score: numericScore, passed: passed, updatedAt: new Date() });

  if (id === DEFAULT_CLASS_ID) {
    const row = ensureStatusRow_(username);
    const sheet = sh_(STATUS_SHEET);
    const priorScore = status.testScore === "" ? null : Number(status.testScore);
    const bestScore = priorScore === null || isNaN(priorScore) ? numericScore : Math.max(priorScore, numericScore);
    const passedEver = !!status.testPassed || passed;
    setField_(sheet, row, "testComplete", passedEver ? "complete" : "");
    setField_(sheet, row, "testScore", bestScore);
    setField_(sheet, row, "updatedAt", new Date());
  }

  if (passed && !status.testPassed) {
    const completedAt = new Date();
    if (id === HAZMAT_CLASS_ID) markHazmatTprPending_(username, completedAt);
    sendTestEmail_(username, id, cls, numericScore, completedAt);
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
}

function scriptProperty_(name, required) {
  const value = String(PropertiesService.getScriptProperties().getProperty(name) || "").trim();
  if (required && !value) throw new Error("Missing required script property: " + name);
  return value;
}

function squareConfig_() {
  const environment = String(scriptProperty_("SQUARE_ENVIRONMENT", false) || "production").toLowerCase();
  if (["production", "sandbox"].indexOf(environment) === -1) {
    throw new Error("SQUARE_ENVIRONMENT must be production or sandbox.");
  }
  return {
    accessToken: scriptProperty_("SQUARE_ACCESS_TOKEN", true),
    locationId: scriptProperty_("SQUARE_LOCATION_ID", true),
    redirectUrl: scriptProperty_("HAZMAT_REDIRECT_URL", false) || HAZMAT_DEFAULT_REDIRECT_URL,
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
    const detail = parsed && parsed.errors && parsed.errors.length
      ? parsed.errors.map(function(error) { return error.detail || error.code || "Square API error"; }).join("; ")
      : "Square API request failed";
    throw new Error(detail);
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
  const sheet = sh_(SIGNUP_REQUESTS_SHEET);
  Object.keys(fields || {}).forEach(function(field) {
    if (headers_(sheet).indexOf(field) !== -1) setField_(sheet, item.row, field, fields[field]);
  });
}

function startHazmatCheckout_(data) {
  ensureHazmatHeaders_();

  ["username", "password", "firstName", "lastName", "licenseNumber", "licenseState", "dob", "email", "phone"].forEach(function(key) {
    if (!String(data[key] || "").trim()) throw new Error("Missing required field: " + key);
  });
  if (!data.certify) throw new Error("You must certify that the driver information is accurate.");

  const username = String(data.username).trim();
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

  const cls = classById_(HAZMAT_CLASS_ID, true);
  const enrollmentId = Utilities.getUuid().replace(/-/g, "");
  const cfg = squareConfig_();
  const redirectUrl = cfg.redirectUrl + (cfg.redirectUrl.indexOf("?") === -1 ? "?" : "&") +
    "enrollmentId=" + encodeURIComponent(enrollmentId);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    clearSheetCache_(STUDENTS_SHEET);
    if (findStudent_(username)) throw new Error("That username is already in use. Please choose another.");

    const paymentLinkResponse = squareRequest_("post", "/v2/online-checkout/payment-links", {
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
      pre_populated_data: {
        buyer_email: email
      },
      payment_note: "BRELDT Hazmat Enrollment " + enrollmentId
    });

    const link = paymentLinkResponse && paymentLinkResponse.payment_link;
    if (!link || !link.url || !link.order_id) throw new Error("Square did not return a usable checkout link.");

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
      paymentStatus: "awaiting_payment",
      paymentOrderId: link.order_id,
      paymentId: "",
      paymentAmount: "",
      paymentCompletedAt: "",
      tprStatus: "",
      trainingCompletedAt: ""
    });

    saveAssignments_(username, [HAZMAT_CLASS_ID]);

    appendObject_(SIGNUP_REQUESTS_SHEET, {
      createdAt: new Date(),
      enrollmentId: enrollmentId,
      fullNameOnLicense: fullName,
      firstName: firstName,
      middleName: middleName,
      lastName: lastName,
      licenseNumber: licenseNumber,
      dob: dob,
      requestedClassId: HAZMAT_CLASS_ID,
      requestedClassTitle: cls.title || "Hazmat Endorsement",
      status: "awaiting_payment",
      preferredContact: email,
      email: email,
      phone: phone,
      licenseState: licenseState,
      paymentStatus: "awaiting_payment",
      paymentOrderId: link.order_id
    });

    return {
      ok: true,
      enrollmentId: enrollmentId,
      checkoutUrl: link.url,
      orderId: link.order_id,
      amount: HAZMAT_PRICE_CENTS
    };
  } finally {
    lock.releaseLock();
  }
}

function verifyHazmatPayment_(enrollmentId) {
  ensureHazmatHeaders_();

  const student = findStudentByEnrollmentId_(enrollmentId);
  if (!student) return { ok: false, error: "Enrollment not found." };

  if (active_(student.obj.active) && String(student.obj.paymentStatus || "").toLowerCase() === "paid") {
    return { ok: true, paid: true, active: true, username: student.obj.username };
  }

  const orderId = String(student.obj.paymentOrderId || "").trim();
  if (!orderId) return { ok: false, error: "This enrollment does not have a Square order." };

  const cfg = squareConfig_();
  const orderResponse = squareRequest_("get", "/v2/orders/" + encodeURIComponent(orderId));
  const order = orderResponse && orderResponse.order;
  if (!order) return { ok: true, pending: true, paid: false, active: false };

  const total = order.total_money || {};
  if (Number(total.amount || 0) !== HAZMAT_PRICE_CENTS || String(total.currency || "") !== "USD") {
    throw new Error("Square order amount does not match the Hazmat course price.");
  }
  if (String(order.location_id || "") !== String(cfg.locationId)) {
    throw new Error("Square order location does not match the configured business location.");
  }

  const tenders = Array.isArray(order.tenders) ? order.tenders : [];
  if (!tenders.length) return { ok: true, pending: true, paid: false, active: false };

  let completedAmount = 0;
  const paymentIds = [];
  let completedAt = null;

  tenders.forEach(function(tender) {
    const paymentId = String(tender.payment_id || tender.id || "").trim();
    if (!paymentId) return;

    const paymentResponse = squareRequest_("get", "/v2/payments/" + encodeURIComponent(paymentId));
    const payment = paymentResponse && paymentResponse.payment;
    if (!payment) return;
    if (String(payment.order_id || "") !== orderId) return;
    if (String(payment.location_id || "") !== String(cfg.locationId)) return;
    if (String(payment.status || "").toUpperCase() !== "COMPLETED") return;

    const amount = Number(payment.amount_money && payment.amount_money.amount || 0);
    const refunded = Number(payment.refunded_money && payment.refunded_money.amount || 0);
    completedAmount += Math.max(0, amount - refunded);
    paymentIds.push(paymentId);
    if (payment.updated_at) completedAt = new Date(payment.updated_at);
  });

  if (completedAmount < HAZMAT_PRICE_CENTS) {
    return { ok: true, pending: true, paid: false, active: false };
  }

  const duplicate = rowObjs_(STUDENTS_SHEET).find(function(row) {
    return row.row !== student.row &&
      String(row.obj.paymentOrderId || "").trim() === orderId &&
      String(row.obj.paymentStatus || "").toLowerCase() === "paid";
  });
  if (duplicate) throw new Error("This Square order has already been used for another enrollment.");

  const now = completedAt && !isNaN(completedAt.getTime()) ? completedAt : new Date();
  const sheet = sh_(STUDENTS_SHEET);
  setField_(sheet, student.row, "active", true);
  setField_(sheet, student.row, "paymentStatus", "paid");
  setField_(sheet, student.row, "paymentId", paymentIds.join(","));
  setField_(sheet, student.row, "paymentAmount", HAZMAT_PRICE_CENTS / 100);
  setField_(sheet, student.row, "paymentCompletedAt", now);
  setField_(sheet, student.row, "updatedAt", new Date());
  ensureStatusRow_(student.obj.username);

  updateSignupRequestByEnrollmentId_(enrollmentId, {
    status: "paid",
    paymentStatus: "paid",
    paymentId: paymentIds.join(","),
    paymentAmount: HAZMAT_PRICE_CENTS / 100,
    paymentCompletedAt: now
  });

  sendHazmatAccessEmail_(student.obj.username);
  return { ok: true, paid: true, active: true, username: student.obj.username };
}

function sendHazmatAccessEmail_(username) {
  const student = findStudent_(username);
  if (!student) return;
  const email = String(student.obj.email || student.obj.preferredContact || "").trim();
  if (!validEmail_(email)) return;

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
}

function markHazmatTprPending_(username, completedAt) {
  ensureHazmatHeaders_();
  const student = findStudent_(username);
  if (!student) return;
  const sheet = sh_(STUDENTS_SHEET);
  setField_(sheet, student.row, "tprStatus", "pending");
  setField_(sheet, student.row, "trainingCompletedAt", completedAt || new Date());
  setField_(sheet, student.row, "tprSubmittedAt", "");
  setField_(sheet, student.row, "updatedAt", new Date());
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
