const SPREADSHEET_ID = "PASTE_BUSINESS_SPREADSHEET_ID_HERE";

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
const ADMIN_EMAIL = "PASTE_BUSINESS_NOTIFICATION_EMAIL_HERE";
const BACKEND_VERSION = "2026-07-30-request-contact-v1";
// Set this to the admin email address before deploying Apps Script to enable signup and test-completion notifications.

const DEFAULT_CLASSES = [
  [DEFAULT_CLASS_ID, "Class A and B", "CDL Class A/B ELDT training", 80, 0.9, 1, true],
  ["class-b-to-a", "Class B to A Upgrade", "Upgrade training from Class B to Class A", 80, 0.9, 2, true],
  ["passenger", "Passenger Endorsement", "Passenger endorsement training", 80, 0.9, 3, true],
  ["school-bus", "School Bus Endorsement", "School bus endorsement training", 80, 0.9, 4, true],
  ["tanker", "Tanker Endorsement", "Tanker endorsement training", 80, 0.9, 5, true],
  ["hazmat", "Hazmat Endorsement", "Hazmat endorsement training", 80, 0.9, 6, true]
];

const DEFAULT_MODULES = [
  ["1", DEFAULT_CLASS_ID, "Module 1 — Introduction", "-qXt8htJ9h4", 1, 0.9, true],
  ["2", DEFAULT_CLASS_ID, "Module 2 — Safety & Inspection", "RS4K5FCL988", 2, 0.9, true],
  ["3", DEFAULT_CLASS_ID, "Module 3 — Basic Operations", "TLeq0WikSmU", 3, 0.9, true],
  ["4", DEFAULT_CLASS_ID, "Module 4 — Advanced Driving", "cMML4tQdVvY", 4, 0.9, true]
];

const DEFAULT_TEST_QUESTIONS = [
  ["q1", DEFAULT_CLASS_ID, "What is the purpose of ELDT?", "Increase CDL costs", "Reduce crashes and standardize training", "Replace skills testing", "Eliminate permits", 1, 1, true],
  ["q2", DEFAULT_CLASS_ID, "What must be completed before taking the CDL skills test?", "Only driving hours", "Only classroom training", "ELDT theory and BTW training", "Medical exam only", 2, 2, true],
  ["q3", DEFAULT_CLASS_ID, "What is the minimum passing score for ELDT theory testing?", "70%", "75%", "80%", "85%", 2, 3, true],
  ["q4", DEFAULT_CLASS_ID, "Normal air pressure range for air brake systems is:", "50–75 PSI", "80–100 PSI", "100–125 PSI", "130–150 PSI", 2, 4, true],
  ["q5", DEFAULT_CLASS_ID, "What should you do if engine temperature is too high?", "Keep driving", "Increase speed", "Stop the vehicle", "Turn off lights", 2, 5, true],
  ["q6", DEFAULT_CLASS_ID, "What is the purpose of a pre-trip inspection?", "Save fuel", "Check route", "Ensure vehicle safety", "Clean the truck", 2, 6, true],
  ["q7", DEFAULT_CLASS_ID, "When should a driver complete a pre-trip inspection?", "Once a week", "Before every trip", "After fueling", "Only if problems occur", 1, 7, true],
  ["q8", DEFAULT_CLASS_ID, "What does DVIR stand for?", "Driver Vehicle Inspection Report", "Daily Vehicle Incident Record", "Driver Violation Information Report", "Department Vehicle Inspection Record", 0, 8, true],
  ["q9", DEFAULT_CLASS_ID, "Following distance should increase based on:", "Vehicle color", "Driver experience", "Vehicle weight and conditions", "Time of day only", 2, 9, true],
  ["q10", DEFAULT_CLASS_ID, "Mirrors should be checked approximately every:", "1–2 seconds", "5–8 seconds", "15–20 seconds", "30 seconds", 1, 10, true],
  ["q11", DEFAULT_CLASS_ID, "Off-tracking refers to:", "Losing control", "Trailer wheels following a tighter path", "Engine failure", "Tire wear", 1, 11, true],
  ["q12", DEFAULT_CLASS_ID, "What is the purpose of engine braking?", "Increase speed", "Reduce brake wear", "Improve fuel economy only", "Replace service brakes", 1, 12, true],
  ["q13", DEFAULT_CLASS_ID, "Double clutching is used to:", "Increase speed", "Match gear speeds", "Reduce fuel use", "Turn the vehicle", 1, 13, true],
  ["q14", DEFAULT_CLASS_ID, "What does GOAL stand for?", "Go Over And Leave", "Get Out And Look", "Get On And Load", "Go On And Learn", 1, 14, true],
  ["q15", DEFAULT_CLASS_ID, "Which type of backing is most dangerous?", "Straight", "Sight-side", "Blind-side", "Offset", 2, 15, true],
  ["q16", DEFAULT_CLASS_ID, "What is the safest driving approach?", "Aggressive driving", "Defensive driving", "Fast driving", "Minimal awareness", 1, 16, true],
  ["q17", DEFAULT_CLASS_ID, "What is required after 8 hours of driving time?", "Fuel stop", "30-minute break", "10-hour break", "Inspection", 1, 17, true],
  ["q18", DEFAULT_CLASS_ID, "Maximum driving time allowed under HOS rules is:", "10 hours", "11 hours", "12 hours", "14 hours", 1, 18, true],
  ["q19", DEFAULT_CLASS_ID, "What should you do during a tire blowout?", "Slam brakes", "Turn sharply", "Hold steering wheel and slow gradually", "Accelerate", 2, 19, true],
  ["q20", DEFAULT_CLASS_ID, "What is the first priority after a crash?", "Call employer", "Document damage", "Protect life and secure the scene", "Move vehicle immediately", 2, 20, true],
  ["q21", DEFAULT_CLASS_ID, "Which of the following is part of a proper pre-trip inspection?", "Checking radio stations", "Inspecting fluids, tires, and brakes", "Adjusting seat only", "Cleaning mirrors only", 1, 21, true],
  ["q22", DEFAULT_CLASS_ID, "Which of the following is a common sign of driver fatigue?", "Increased awareness", "Faster reaction time", "Yawning and drifting lanes", "Improved focus", 2, 22, true],
  ["q23", DEFAULT_CLASS_ID, "Which document must a CDL driver carry at all times?", "Birth certificate", "CDL license and medical card", "Social media account", "Insurance bill only", 1, 23, true],
  ["q24", DEFAULT_CLASS_ID, "What is the correct action during brake failure?", "Speed up", "Turn off engine immediately", "Downshift and use engine braking", "Jump out of the vehicle", 2, 24, true],
  ["q25", DEFAULT_CLASS_ID, "When must cargo be inspected during a trip?", "Only at the end of the trip", "Only if a problem occurs", "Before trip, within first 50 miles, and periodically", "Once per week", 2, 25, true]
];

function doGet(e) {
  try {
    const p = e.parameter || {};
    const action = String(p.action || "").toLowerCase();
    const actions = {
      validatelogin: function() { return validateLogin_(p.username, p.password); },
      adminlogin: function() { return adminLogin_(p.username, p.password); },
      liststudents: function() { return listStudents_(); },
      getversion: function() { return { ok: true, version: BACKEND_VERSION }; },
      getstatus: function() { return getStatus_(p.username, p.classId); },
      getstudentdashboard: function() { return getStudentDashboard_(p.username); },
      listclasses: function() { return listClasses_(p.activeOnly); },
      listmodules: function() { return listModules_(p.classId, p.activeOnly); },
      listtestquestions: function() { return listTestQuestions_(p.classId, p.activeOnly); },
      setupsheets: function() { return setupSheets_(); },
      migrateexistingdatatoclassa: function() { return migrateExistingDataToClassA_(); }
    };
    return json_((actions[action] || unknownAction_)());
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse((e.postData && e.postData.contents) || "{}");
    const action = String(data.action || "").toLowerCase();
    const actions = {
      addstudent: function() { return addStudent_(data); },
      updatestudent: function() { return updateStudent_(data); },
      deletestudent: function() { return archiveStudent_(data.username); },
      archivestudent: function() { return archiveStudent_(data.username); },
      approvestudent: function() { return approveStudent_(data.username); },
      logmodule: function() { return logModule_(data.username, data.classId, data.moduleId); },
      logtest: function() { return logTest_(data.username, data.classId, data.complete, data.score); },
      saveclass: function() { return saveClass_(data); },
      deleteclass: function() { return deactivateById_(CLASSES_SHEET, data.id); },
      deactivateclass: function() { return deactivateById_(CLASSES_SHEET, data.id); },
      savemodule: function() { return saveModule_(data); },
      deletemodule: function() { return deactivateById_(MODULES_SHEET, data.id); },
      deactivatemodule: function() { return deactivateById_(MODULES_SHEET, data.id); },
      savetestquestion: function() { return saveTestQuestion_(data); },
      deletetestquestion: function() { return deactivateById_(TEST_QUESTIONS_SHEET, data.id); },
      deactivatetestquestion: function() { return deactivateById_(TEST_QUESTIONS_SHEET, data.id); },
      submitsignuprequest: function() { return submitSignupRequest_(data); }
    };
    return json_((actions[action] || unknownAction_)());
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function unknownAction_() { return { ok: false, error: "Unknown action" }; }
function ss_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function sh_(name) { const ss = ss_(); return ss.getSheetByName(name) || ss.insertSheet(name); }
function headers_(sheet) { if (sheet.getLastRow() < 1) return []; return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(function(h) { return String(h || "").trim(); }); }
function ensureHeaders_(name, headers) { const sheet = sh_(name); if (sheet.getLastRow() < 1) { sheet.appendRow(headers); return sheet; } const existing = headers_(sheet); headers.forEach(function(header) { if (existing.indexOf(header) === -1) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header); }); return sheet; }
function rowObjs_(name) { const sheet = sh_(name); const headers = headers_(sheet); const lastRow = sheet.getLastRow(); if (lastRow < 2 || headers.length === 0) return []; return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues().map(function(row, index) { const obj = {}; headers.forEach(function(header, col) { obj[header] = row[col]; }); return { row: index + 2, raw: row, obj: obj }; }); }
function active_(value) { if (value === "" || value === null || value === undefined) return true; if (value === true) return true; return String(value).toLowerCase() === "true"; }
function activeFilter_(activeOnly) { return activeOnly === true || String(activeOnly || "").toLowerCase() === "true"; }
function normalizeWatchPercent_(value) { const n = Number(value); if (!n || isNaN(n)) return 0.9; return n > 1 ? n / 100 : n; }
function id_() { return Utilities.getUuid(); }

function setupSheets_() {
  ensureHeaders_(STUDENTS_SHEET, ["username", "password", "updatedAt", "fullNameOnLicense", "licenseNumber", "dob", "active", "archivedAt", "preferredContact"]);
  ensureHeaders_(ADMINS_SHEET, ["username", "password"]);
  ensureHeaders_(STATUS_SHEET, ["username", "m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10", "testComplete", "testScore", "updatedAt"]);
  ensureHeaders_(CLASSES_SHEET, ["id", "title", "description", "passingScore", "requiredWatchPercent", "sortOrder", "active", "updatedAt"]);
  ensureHeaders_(MODULES_SHEET, ["id", "classId", "title", "youtubeId", "sortOrder", "requiredWatchPercent", "active", "updatedAt"]);
  ensureHeaders_(TEST_QUESTIONS_SHEET, ["id", "classId", "question", "optionA", "optionB", "optionC", "optionD", "correctIndex", "sortOrder", "active", "updatedAt"]);
  ensureHeaders_(STUDENT_CLASSES_SHEET, ["username", "classId", "active", "updatedAt"]);
  ensureHeaders_(PROGRESS_SHEET, ["username", "classId", "moduleId", "complete", "updatedAt"]);
  ensureHeaders_(TEST_RESULTS_SHEET, ["username", "classId", "complete", "score", "passed", "updatedAt"]);
  ensureHeaders_(SIGNUP_REQUESTS_SHEET, ["createdAt", "fullNameOnLicense", "licenseNumber", "dob", "requestedClassId", "requestedClassTitle", "status", "preferredContact"]);
  seed_(CLASSES_SHEET, DEFAULT_CLASSES);
  seed_(MODULES_SHEET, DEFAULT_MODULES);
  seed_(TEST_QUESTIONS_SHEET, DEFAULT_TEST_QUESTIONS);
  return { ok: true };
}

function ensureContactColumns_() {
  ensureHeaders_(STUDENTS_SHEET, ["username", "password", "updatedAt", "fullNameOnLicense", "licenseNumber", "dob", "active", "archivedAt", "preferredContact"]);
  ensureHeaders_(SIGNUP_REQUESTS_SHEET, ["createdAt", "fullNameOnLicense", "licenseNumber", "dob", "requestedClassId", "requestedClassTitle", "status", "preferredContact"]);
}

function seed_(sheetName, rows) { const sheet = sh_(sheetName); const existing = {}; rowObjs_(sheetName).forEach(function(row) { existing[String(row.obj.id)] = true; }); rows.forEach(function(row) { if (!existing[String(row[0])]) sheet.appendRow(row.concat([new Date()])); }); }
function findStudent_(username) { const key = String(username || "").trim().toLowerCase(); if (!key) return null; return rowObjs_(STUDENTS_SHEET).find(function(row) { return String(row.obj.username || "").trim().toLowerCase() === key; }) || null; }
function requireActiveStudent_(username) { const student = findStudent_(username); if (!student || !active_(student.obj.active)) throw new Error("Student is archived or inactive"); return student; }
function classById_(classId, requireActive) { const cls = rowObjs_(CLASSES_SHEET).map(function(row) { return row.obj; }).find(function(item) { return String(item.id) === String(classId); }); if (!cls) throw new Error("Class not found"); if (requireActive && !active_(cls.active)) throw new Error("Class is inactive"); cls.requiredWatchPercent = normalizeWatchPercent_(cls.requiredWatchPercent); cls.passingScore = Number(cls.passingScore || 80); return cls; }
function explicitAssignmentRows_(username) { const key = String(username || "").trim().toLowerCase(); return rowObjs_(STUDENT_CLASSES_SHEET).filter(function(row) { return String(row.obj.username || "").trim().toLowerCase() === key; }); }
function assignedClassIds_(username) { const rows = explicitAssignmentRows_(username); const activeRows = rows.filter(function(row) { return active_(row.obj.active); }); if (rows.length === 0) return [DEFAULT_CLASS_ID]; return activeRows.map(function(row) { return String(row.obj.classId); }); }
function requireAssignedClass_(username, classId) { requireActiveStudent_(username); const cid = classId || DEFAULT_CLASS_ID; const assigned = assignedClassIds_(username); if (assigned.indexOf(String(cid)) === -1) throw new Error("Student is not assigned to this class"); return classById_(cid, true); }

function listClasses_(activeOnly) { const filterActive = activeFilter_(activeOnly); const classes = rowObjs_(CLASSES_SHEET).map(function(row) { const obj = row.obj; obj.requiredWatchPercent = normalizeWatchPercent_(obj.requiredWatchPercent); obj.passingScore = Number(obj.passingScore || 80); obj.sortOrder = Number(obj.sortOrder || 0); obj.active = active_(obj.active); return obj; }).filter(function(cls) { return !filterActive || active_(cls.active); }).sort(function(a, b) { return Number(a.sortOrder || 0) - Number(b.sortOrder || 0); }); return { ok: true, classes: classes }; }
function listModules_(classId, activeOnly) { const filterActive = activeFilter_(activeOnly); const modules = rowObjs_(MODULES_SHEET).map(function(row) { const obj = row.obj; obj.requiredWatchPercent = normalizeWatchPercent_(obj.requiredWatchPercent); obj.sortOrder = Number(obj.sortOrder || 0); obj.active = active_(obj.active); return obj; }).filter(function(module) { return (!classId || String(module.classId) === String(classId)) && (!filterActive || active_(module.active)); }).sort(function(a, b) { return Number(a.sortOrder || 0) - Number(b.sortOrder || 0); }); return { ok: true, modules: modules }; }
function listTestQuestions_(classId, activeOnly) { const filterActive = activeFilter_(activeOnly); const questions = rowObjs_(TEST_QUESTIONS_SHEET).map(function(row) { const obj = row.obj; obj.correctIndex = Number(obj.correctIndex); obj.sortOrder = Number(obj.sortOrder || 0); obj.active = active_(obj.active); return obj; }).filter(function(question) { return (!classId || String(question.classId) === String(classId)) && (!filterActive || active_(question.active)); }).sort(function(a, b) { return Number(a.sortOrder || 0) - Number(b.sortOrder || 0); }); return { ok: true, questions: questions }; }

function validateLogin_(username, password) { if (!username || !password) return { ok: false, error: "Missing username or password" }; const student = findStudent_(username); if (!student || String(student.obj.password) !== String(password) || !active_(student.obj.active)) return { ok: false, error: "Invalid username or password" }; return { ok: true, username: student.obj.username }; }
function adminLogin_(username, password) { if (!username || !password) return { ok: false, error: "Missing username or password" }; const key = String(username || "").trim().toLowerCase(); const admin = rowObjs_(ADMINS_SHEET).find(function(row) { return String(row.obj.username || "").trim().toLowerCase() === key && String(row.obj.password || "") === String(password || ""); }); return admin ? { ok: true, username: admin.obj.username } : { ok: false, error: "Invalid admin login" }; }

function getStatus_(username, classId) {
  const cid = classId || DEFAULT_CLASS_ID;
  const cls = requireAssignedClass_(username, cid);
  const modules = listModules_(cid, true).modules;
  const progressRows = rowObjs_(PROGRESS_SHEET);
  const testRows = rowObjs_(TEST_RESULTS_SHEET);
  const legacy = cid === DEFAULT_CLASS_ID ? legacyStatus_(username) : null;
  const moduleStatuses = modules.map(function(module) {
    const completeFromProgress = progressRows.some(function(row) { return String(row.obj.username) === String(username) && String(row.obj.classId) === String(cid) && String(row.obj.moduleId) === String(module.id) && active_(row.obj.complete); });
    const legacyComplete = legacy && legacy.modules["m" + module.id];
    return { id: String(module.id), classId: String(module.classId), title: module.title, youtubeId: module.youtubeId, sortOrder: Number(module.sortOrder || 0), requiredWatchPercent: normalizeWatchPercent_(module.requiredWatchPercent || cls.requiredWatchPercent), active: active_(module.active), complete: !!completeFromProgress || !!legacyComplete };
  });
  const matchingTestRows = testRows.filter(function(row) { return String(row.obj.username) === String(username) && String(row.obj.classId) === String(cid); });
  const latest = matchingTestRows.length ? matchingTestRows[matchingTestRows.length - 1].obj : null;
  return { ok: true, username: username, classId: cid, classInfo: cls, modules: moduleStatuses, testComplete: latest ? active_(latest.complete) : (legacy ? legacy.testComplete : false), testScore: latest ? latest.score : (legacy ? legacy.testScore : ""), testPassed: latest ? active_(latest.passed) : (legacy ? legacy.testComplete : false) };
}

function legacyStatus_(username) { const row = rowObjs_(STATUS_SHEET).find(function(item) { return String(item.obj.username || "").trim().toLowerCase() === String(username || "").trim().toLowerCase(); }); const out = { modules: {}, testComplete: false, testScore: "" }; for (let i = 1; i <= 10; i++) out.modules["m" + i] = false; if (!row) return out; for (let m = 1; m <= 10; m++) out.modules["m" + m] = String(row.obj["m" + m] || "").toLowerCase() === "complete"; out.testComplete = String(row.obj.testComplete || "").toLowerCase() === "complete"; out.testScore = row.obj.testScore || ""; return out; }
function getStudentDashboard_(username) { requireActiveStudent_(username); const assigned = assignedClassIds_(username); const activeClasses = listClasses_(true).classes.filter(function(cls) { return assigned.indexOf(String(cls.id)) !== -1; }); const classes = activeClasses.map(function(cls) { cls.status = getStatus_(username, cls.id); return cls; }); return { ok: true, username: username, classes: classes }; }
function listStudents_() {
  ensureContactColumns_();
  const assignmentRows = rowObjs_(STUDENT_CLASSES_SHEET);
  const profiles = rowObjs_(STUDENTS_SHEET).map(function(row) {
    const obj = row.obj;
    const key = String(obj.username || "").trim().toLowerCase();
    const rows = assignmentRows.filter(function(assignment) {
      return String(assignment.obj.username || "").trim().toLowerCase() === key;
    });
    obj.classes = rows.length === 0
      ? [DEFAULT_CLASS_ID]
      : rows.filter(function(assignment) { return active_(assignment.obj.active); }).map(function(assignment) { return String(assignment.obj.classId); });
    return obj;
  });
  const students = profiles.filter(function(student) { return active_(student.active); });
  const pendingStudents = profiles.filter(function(student) {
    return !active_(student.active) && !String(student.archivedAt || "").trim();
  });
  return { ok: true, students: students, pendingStudents: pendingStudents, backendVersion: BACKEND_VERSION };
}
function setCell_(sheet, row, headers, name, value) { const index = headers.indexOf(name); if (index === -1) throw new Error("Missing header: " + name); sheet.getRange(row, index + 1).setValue(value); }

function addStudent_(data) { ensureContactColumns_(); if (!data.username || !data.password) return { ok: false, error: "Missing username or password" }; if (findStudent_(data.username)) return { ok: false, error: "Username already exists or is archived" }; sh_(STUDENTS_SHEET).appendRow([data.username, data.password, new Date(), data.fullNameOnLicense || "", data.licenseNumber || "", data.dob || "", true, "", data.preferredContact || ""]); saveAssignments_(data.username, data.classes || [DEFAULT_CLASS_ID]); ensureStatusRow_(data.username); return { ok: true }; }
function updateStudent_(data) { ensureContactColumns_(); const student = findStudent_(data.username); if (!student) return { ok: false, error: "Student not found" }; if (!data.password) return { ok: false, error: "Missing password" }; const sheet = sh_(STUDENTS_SHEET); const headers = headers_(sheet); setCell_(sheet, student.row, headers, "password", data.password); setCell_(sheet, student.row, headers, "updatedAt", new Date()); setCell_(sheet, student.row, headers, "fullNameOnLicense", data.fullNameOnLicense || ""); setCell_(sheet, student.row, headers, "licenseNumber", data.licenseNumber || ""); setCell_(sheet, student.row, headers, "dob", data.dob || ""); setCell_(sheet, student.row, headers, "preferredContact", data.preferredContact || ""); setCell_(sheet, student.row, headers, "active", true); setCell_(sheet, student.row, headers, "archivedAt", ""); saveAssignments_(data.username, data.classes || [DEFAULT_CLASS_ID]); ensureStatusRow_(data.username); return { ok: true }; }
function saveAssignments_(username, classIds) { const sheet = sh_(STUDENT_CLASSES_SHEET); const rows = rowObjs_(STUDENT_CLASSES_SHEET); const key = String(username || "").trim().toLowerCase(); rows.forEach(function(row) { if (String(row.obj.username || "").trim().toLowerCase() === key) { sheet.getRange(row.row, 3).setValue(false); sheet.getRange(row.row, 4).setValue(new Date()); } }); const unique = {}; (classIds || []).forEach(function(classId) { if (classId) unique[String(classId)] = true; }); Object.keys(unique).forEach(function(classId) { classById_(classId, false); sheet.appendRow([username, classId, true, new Date()]); }); }
function approveStudent_(username) {
  const student = findStudent_(username);
  if (!student) return { ok: false, error: "Student not found" };
  if (String(student.obj.archivedAt || "").trim()) return { ok: false, error: "Archived profiles cannot be approved" };
  const sheet = sh_(STUDENTS_SHEET);
  const headers = headers_(sheet);
  setCell_(sheet, student.row, headers, "active", true);
  setCell_(sheet, student.row, headers, "updatedAt", new Date());
  setCell_(sheet, student.row, headers, "archivedAt", "");
  ensureStatusRow_(student.obj.username);
  return { ok: true };
}
function archiveStudent_(username) { const student = findStudent_(username); if (!student) return { ok: false, error: "Student not found" }; const sheet = sh_(STUDENTS_SHEET); const headers = headers_(sheet); setCell_(sheet, student.row, headers, "active", false); setCell_(sheet, student.row, headers, "archivedAt", new Date()); saveAssignments_(username, []); return { ok: true }; }

function logModule_(username, classId, moduleId) { const cid = classId || DEFAULT_CLASS_ID; requireAssignedClass_(username, cid); const module = activeModuleForClass_(cid, moduleId); upsertProgress_(username, cid, module.id); if (cid === DEFAULT_CLASS_ID) logLegacyModule_(username, module.id); return getStatus_(username, cid); }
function activeModuleForClass_(classId, moduleId) { const module = listModules_(classId, true).modules.find(function(item) { return String(item.id) === String(moduleId); }); if (!module) throw new Error("Module not found for this class"); return module; }
function upsertProgress_(username, classId, moduleId) { const sheet = sh_(PROGRESS_SHEET); const rows = rowObjs_(PROGRESS_SHEET); const hit = rows.find(function(row) { return String(row.obj.username) === String(username) && String(row.obj.classId) === String(classId) && String(row.obj.moduleId) === String(moduleId); }); if (hit) { const headers = headers_(sheet); setCell_(sheet, hit.row, headers, "complete", true); setCell_(sheet, hit.row, headers, "updatedAt", new Date()); } else { sheet.appendRow([username, classId, moduleId, true, new Date()]); } }
function logLegacyModule_(username, moduleId) { const row = ensureStatusRow_(username); const sheet = sh_(STATUS_SHEET); const headers = headers_(sheet); const moduleName = "m" + moduleId; if (headers.indexOf(moduleName) !== -1) setCell_(sheet, row, headers, moduleName, "complete"); if (headers.indexOf("updatedAt") !== -1) setCell_(sheet, row, headers, "updatedAt", new Date()); }
function ensureStatusRow_(username) { const sheet = sh_(STATUS_SHEET); const rows = rowObjs_(STATUS_SHEET); const hit = rows.find(function(row) { return String(row.obj.username || "").trim().toLowerCase() === String(username || "").trim().toLowerCase(); }); if (hit) return hit.row; const width = Math.max(sheet.getLastColumn(), 14); const newRow = new Array(width).fill(""); newRow[0] = username; sheet.appendRow(newRow); return sheet.getLastRow(); }

function logTest_(username, classId, complete, score) { const cid = classId || DEFAULT_CLASS_ID; const cls = requireAssignedClass_(username, cid); const status = getStatus_(username, cid); if (!allModulesComplete_(status.modules)) throw new Error("All modules for this class must be complete before logging the test"); const numericScore = Number(score); if (isNaN(numericScore)) throw new Error("Missing score"); const passed = !!complete && numericScore >= Number(cls.passingScore || 80); sh_(TEST_RESULTS_SHEET).appendRow([username, cid, !!complete, numericScore, passed, new Date()]); if (cid === DEFAULT_CLASS_ID) logLegacyTest_(username, !!complete, numericScore); sendTestEmail_(username, cid, cls.title, numericScore, passed); return getStatus_(username, cid); }
function allModulesComplete_(modules) { return Array.isArray(modules) && modules.length > 0 && modules.every(function(module) { return !!module.complete; }); }
function logLegacyTest_(username, complete, score) { const row = ensureStatusRow_(username); const sheet = sh_(STATUS_SHEET); const headers = headers_(sheet); if (headers.indexOf("testComplete") !== -1) setCell_(sheet, row, headers, "testComplete", complete ? "complete" : ""); if (headers.indexOf("testScore") !== -1) setCell_(sheet, row, headers, "testScore", score); if (headers.indexOf("updatedAt") !== -1) setCell_(sheet, row, headers, "updatedAt", new Date()); }

function saveClass_(data) { const payload = { id: data.id || id_(), title: data.title || "Untitled Class", description: data.description || "", passingScore: Number(data.passingScore || 80), requiredWatchPercent: normalizeWatchPercent_(data.requiredWatchPercent), sortOrder: Number(data.sortOrder || 99), active: data.active === false ? false : active_(data.active) }; return upsert_(CLASSES_SHEET, payload, ["id", "title", "description", "passingScore", "requiredWatchPercent", "sortOrder", "active"]); }
function saveModule_(data) { const classId = data.classId || DEFAULT_CLASS_ID; classById_(classId, false); const payload = { id: data.id || id_(), classId: classId, title: data.title || "Untitled Module", youtubeId: extractYouTubeId_(data.youtubeId || data.youtubeUrl || ""), sortOrder: Number(data.sortOrder || 99), requiredWatchPercent: normalizeWatchPercent_(data.requiredWatchPercent), active: data.active === false ? false : active_(data.active) }; return upsert_(MODULES_SHEET, payload, ["id", "classId", "title", "youtubeId", "sortOrder", "requiredWatchPercent", "active"]); }
function saveTestQuestion_(data) { const classId = data.classId || DEFAULT_CLASS_ID; classById_(classId, false); const payload = { id: data.id || id_(), classId: classId, question: data.question || "", optionA: data.optionA || "", optionB: data.optionB || "", optionC: data.optionC || "", optionD: data.optionD || "", correctIndex: Number(data.correctIndex || 0), sortOrder: Number(data.sortOrder || 99), active: data.active === false ? false : active_(data.active) }; return upsert_(TEST_QUESTIONS_SHEET, payload, ["id", "classId", "question", "optionA", "optionB", "optionC", "optionD", "correctIndex", "sortOrder", "active"]); }
function upsert_(sheetName, data, fields) { const sheet = sh_(sheetName); const headers = headers_(sheet); const hit = rowObjs_(sheetName).find(function(row) { return String(row.obj.id) === String(data.id); }); if (hit) { fields.forEach(function(field) { setCell_(sheet, hit.row, headers, field, data[field]); }); setCell_(sheet, hit.row, headers, "updatedAt", new Date()); } else { const row = fields.map(function(field) { return data[field]; }); row.push(new Date()); sheet.appendRow(row); } return { ok: true, id: data.id }; }
function deactivateById_(sheetName, id) { if (!id) return { ok: false, error: "Missing id" }; const sheet = sh_(sheetName); const headers = headers_(sheet); const hit = rowObjs_(sheetName).find(function(row) { return String(row.obj.id) === String(id); }); if (!hit) return { ok: false, error: "Not found" }; setCell_(sheet, hit.row, headers, "active", false); if (headers.indexOf("updatedAt") !== -1) setCell_(sheet, hit.row, headers, "updatedAt", new Date()); return { ok: true }; }

function submitSignupRequest_(data) {
  ["username", "password", "fullNameOnLicense", "licenseNumber", "preferredContact", "dob", "requestedClassId"].forEach(function(key) {
    if (!String(data[key] || "").trim()) throw new Error("Missing required field: " + key);
  });
  const username = String(data.username).trim();
  const preferredContact = String(data.preferredContact).trim();
  if (!validPreferredContact_(preferredContact)) throw new Error("Enter a valid email address or cell phone number.");
  const cls = classById_(data.requestedClassId, true);
  ensureContactColumns_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (findStudent_(username)) throw new Error("That username is already in use. Please choose another.");
    sh_(STUDENTS_SHEET).appendRow([username, data.password, new Date(), data.fullNameOnLicense, data.licenseNumber, data.dob, false, "", preferredContact]);
    saveAssignments_(username, [data.requestedClassId]);
    sh_(SIGNUP_REQUESTS_SHEET).appendRow([new Date(), data.fullNameOnLicense, data.licenseNumber, data.dob, data.requestedClassId, cls.title || data.requestedClassId, "new", preferredContact]);
  } finally {
    lock.releaseLock();
  }
  if (ADMIN_EMAIL) {
    MailApp.sendEmail(ADMIN_EMAIL, "New training request", "Training request\nUsername: " + username + "\nName: " + data.fullNameOnLicense + "\nLicense: " + data.licenseNumber + "\nContact: " + preferredContact + "\nDOB: " + data.dob + "\nTraining: " + (cls.title || data.requestedClassId) + "\nStatus: Pending approval");
  }
  return { ok: true, username: username, pendingApproval: true, backendVersion: BACKEND_VERSION };
}
function validPreferredContact_(value) { const contact = String(value || "").trim(); const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact); const digits = contact.replace(/\D/g, ""); const phoneOk = /^\+?[\d\s().-]+$/.test(contact) && digits.length >= 10 && digits.length <= 15; return emailOk || phoneOk; }
function sendTestEmail_(username, classId, title, score, passed) { if (!ADMIN_EMAIL) return; const student = findStudent_(username); const info = student ? student.obj : {}; MailApp.sendEmail(ADMIN_EMAIL, "Training test finished", "test finished\nscore: " + score + "\npass/fail: " + (passed ? "pass" : "fail") + "\nclass/training name: " + (title || classId) + "\nusername: " + username + "\nfull name on license: " + (info.fullNameOnLicense || "") + "\nlicense number: " + (info.licenseNumber || "")); }
function migrateExistingDataToClassA_() { return { ok: true, message: "Legacy Status maps to Class A and B at read time." }; }
function extractYouTubeId_(value) { const text = String(value || "").trim(); if (!text) return ""; const direct = text.match(/^[a-zA-Z0-9_-]{11}$/); if (direct) return text; const match = text.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/); return match ? match[1] : text; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
