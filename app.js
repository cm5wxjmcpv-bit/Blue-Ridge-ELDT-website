// Blue Ridge Entry Level Driver Training
// Google Apps Script backend source

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
// Leave blank to disable email notifications. Add a business notification email later if desired.
const ADMIN_EMAIL = "";
const BACKEND_VERSION = "2026-09-04-blue-ridge-v1";

const DEFAULT_CLASSES = [
  [DEFAULT_CLASS_ID, "Class A and B", "CDL Class A/B ELDT training", 80, 0.9, 1, true],
  ["class-b-to-a", "Class B to A Upgrade", "Upgrade training from Class B to Class A", 80, 0.9, 2, true],
  ["passenger", "Passenger Endorsement", "Passenger endorsement training", 80, 0.9, 3, true],
  ["school-bus", "School Bus Endorsement", "School bus endorsement training", 80, 0.9, 4, true],
  ["tanker", "Tanker Endorsement", "Tanker endorsement training", 80, 0.9, 5, true],
  ["hazmat", "Hazmat Endorsement", "Hazmat endorsement training", 80, 0.9, 6, true]
];

// Restored from the Blue Ridge repository as it existed before the city-site copy.
const DEFAULT_MODULES = [
  ["1", DEFAULT_CLASS_ID, "Intro (5 mins)", "BGlWc4pvXSQ", 1, 0.9, true],
  ["2", DEFAULT_CLASS_ID, "Module 1 (18.5 mins)", "PKEVCzlIo6o", 2, 0.9, true],
  ["3", DEFAULT_CLASS_ID, "Module 2 (22.08 mins)", "pZPTGA1-CWg", 3, 0.9, true],
  ["4", DEFAULT_CLASS_ID, "Module 3 (14.10 mins)", "Qa5zqYHRqso", 4, 0.9, true],
  ["5", DEFAULT_CLASS_ID, "Module 4 (12 mins)", "2uCIkj693I8", 5, 0.9, true],
  ["6", DEFAULT_CLASS_ID, "Module 5 (25.25 mins)", "Od5tJW7NZK8", 6, 0.9, true],
  ["7", DEFAULT_CLASS_ID, "Module 6 (7.41 mins)", "Ch9WP4p5vGs", 7, 0.9, true]
];

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
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
      migrateexistingdatatoclassa: function() {
        return { ok: true, message: "Legacy Status data maps to the default Class A/B course at read time." };
      }
    };
    return json_((actions[action] || unknownAction_)());
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
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
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function unknownAction_() {
  return { ok: false, error: "Unknown action" };
}

function ss_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function sh_(name) {
  const ss = ss_();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function headers_(sheet) {
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
    return String(value || "").trim();
  });
}

function ensureHeaders_(name, requiredHeaders) {
  const sheet = sh_(name);
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return sheet;
  }
  let current = headers_(sheet);
  requiredHeaders.forEach(function(header) {
    if (current.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      current = headers_(sheet);
    }
  });
  return sheet;
}

function rowObjs_(name) {
  const sheet = sh_(name);
  const headers = headers_(sheet);
  const lastRow = sheet.getLastRow();
  if (!headers.length || lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function(row, index) {
    const obj = {};
    headers.forEach(function(header, col) {
      obj[header] = row[col];
    });
    return { row: index + 2, obj: obj };
  });
}

function appendObject_(sheetName, obj) {
  const sheet = sh_(sheetName);
  const headers = headers_(sheet);
  if (!headers.length) throw new Error("Missing headers for " + sheetName);
  sheet.appendRow(headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(obj, header) ? obj[header] : "";
  }));
  return sheet.getLastRow();
}

function setField_(sheet, row, header, value) {
  const headers = headers_(sheet);
  const index = headers.indexOf(header);
  if (index === -1) throw new Error("Missing header: " + header);
  sheet.getRange(row, index + 1).setValue(value);
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
  seedRows_(CLASSES_SHEET, DEFAULT_CLASSES);
  seedRows_(MODULES_SHEET, DEFAULT_MODULES);
  return { ok: true, version: BACKEND_VERSION };
}

function seedRows_(sheetName, rows) {
  const existing = {};
  rowObjs_(sheetName).forEach(function(row) {
    existing[String(row.obj.id)] = true;
  });
  rows.forEach(function(row) {
    if (!existing[String(row[0])]) {
      sh_(sheetName).appendRow(row.concat([new Date()]));
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
  if (requireActive && !active_(row.obj.active)) throw new Error("Class is inactive");
  const obj = row.obj;
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
  return rows.filter(function(row) { return active_(row.obj.active); }).map(function(row) {
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
    const obj = row.obj;
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
    const obj = row.obj;
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
    const obj = row.obj;
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
  if (!student || String(student.obj.password || "") !== String(password) || !active_(student.obj.active)) {
    return { ok: false, error: "Invalid username or password" };
  }
  return { ok: true, username: student.obj.username };
}

function adminLogin_(username, password) {
  if (!username || !password) return { ok: false, error: "Missing username or password" };
  const key = String(username).trim().toLowerCase();
  const admin = rowObjs_(ADMINS_SHEET).find(function(row) {
    return String(row.obj.username || "").trim().toLowerCase() === key &&
      String(row.obj.password || "") === String(password);
  });
  return admin ? { ok: true, username: admin.obj.username } : { ok: false, error: "Invalid admin login" };
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

  const statusModules = modules.map(function(module) {
    const progressComplete = progressRows.some(function(row) {
      return String(row.obj.username || "").trim().toLowerCase() === String(username || "").trim().toLowerCase() &&
        String(row.obj.classId) === id &&
        String(row.obj.moduleId) === String(module.id) &&
        complete_(row.obj.complete);
    });
    const legacyComplete = legacy ? legacy.modules["m" + module.id] : false;
    return {
      id: String(module.id),
      classId: id,
      title: module.title,
      youtubeId: module.youtubeId,
      sortOrder: Number(module.sortOrder || 0),
      requiredWatchPercent: normalizeWatchPercent_(module.requiredWatchPercent || cls.requiredWatchPercent),
      active: true,
      complete: !!progressComplete || !!legacyComplete
    };
  });

  const matches = testRows.filter(function(row) {
    return String(row.obj.username || "").trim().toLowerCase() === String(username || "").trim().toLowerCase() &&
      String(row.obj.classId) === id;
  });
  const latest = matches.length ? matches[matches.length - 1].obj : null;

  return {
    ok: true,
    username: username,
    classId: id,
    classInfo: cls,
    modules: statusModules,
    testComplete: latest ? complete_(latest.complete) : (legacy ? legacy.testComplete : false),
    testScore: latest ? latest.score : (legacy ? legacy.testScore : ""),
    testPassed: latest ? complete_(latest.passed) : (legacy ? legacy.testComplete : false)
  };
}

function getStudentDashboard_(username) {
  requireActiveStudent_(username);
  const assigned = assignedClassIds_(username);
  const classes = listClasses_(true).classes.filter(function(cls) {
    return assigned.indexOf(String(cls.id)) !== -1;
  }).map(function(cls) {
    const copy = Object.assign({}, cls);
    copy.status = getStatus_(username, cls.id);
    return copy;
  });
  return { ok: true, username: username, classes: classes };
}

function listStudents_() {
  ensureHeaders_(STUDENTS_SHEET, ["username", "password", "updatedAt", "fullNameOnLicense", "licenseNumber", "dob", "active", "archivedAt", "preferredContact"]);
  const studentsAll = rowObjs_(STUDENTS_SHEET).map(function(row) {
    const obj = row.obj;
    obj.classes = assignedClassIds_(obj.username);
    return obj;
  });
  const students = studentsAll.filter(function(obj) {
    return active_(obj.active);
  });
  const pendingStudents = studentsAll.filter(function(obj) {
    return !active_(obj.active) && !String(obj.archivedAt || "").trim();
  });
  return { ok: true, students: students, pendingStudents: pendingStudents, backendVersion: BACKEND_VERSION };
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
    preferredContact: data.preferredContact || ""
  });
  saveAssignments_(data.username, data.classes || [DEFAULT_CLASS_ID]);
  ensureStatusRow_(data.username);
  return { ok: true };
}

function updateStudent_(data) {
  const student = findStudent_(data.username);
  if (!student) return { ok: false, error: "Student not found" };
  if (!data.password) return { ok: false, error: "Missing password" };
  const sheet = sh_(STUDENTS_SHEET);
  setField_(sheet, student.row, "password", data.password);
  setField_(sheet, student.row, "updatedAt", new Date());
  setField_(sheet, student.row, "fullNameOnLicense", data.fullNameOnLicense || "");
  setField_(sheet, student.row, "licenseNumber", data.licenseNumber || "");
  setField_(sheet, student.row, "dob", data.dob || "");
  setField_(sheet, student.row, "preferredContact", data.preferredContact || "");
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
  const key = String(username || "").trim().toLowerCase();
  const rows = assignmentRows_(username);
  rows.forEach(function(row) {
    setField_(sheet, row.row, "active", false);
    setField_(sheet, row.row, "updatedAt", new Date());
  });

  const unique = {};
  (classIds || []).forEach(function(classId) {
    if (classId) unique[String(classId)] = true;
  });

  Object.keys(unique).forEach(function(classId) {
    classById_(classId, false);
    const existing = rows.find(function(row) {
      return String(row.obj.classId) === String(classId);
    });
    if (existing) {
      setField_(sheet, existing.row, "active", true);
      setField_(sheet, existing.row, "updatedAt", new Date());
    } else {
      appendObject_(STUDENT_CLASSES_SHEET, {
        username: username,
        classId: classId,
        active: true,
        updatedAt: new Date()
      });
    }
  });
}

function ensureStatusRow_(username) {
  const key = String(username || "").trim().toLowerCase();
  const existing = rowObjs_(STATUS_SHEET).find(function(row) {
    return String(row.obj.username || "").trim().toLowerCase() === key;
  });
  if (existing) return existing.row;
  return appendObject_(STATUS_SHEET, { username: username, updatedAt: new Date() });
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
    appendObject_(PROGRESS_SHEET, {
      username: username,
      classId: id,
      moduleId: String(module.id),
      complete: true,
      updatedAt: new Date()
    });
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
  return Array.isArray(modules) && modules.length > 0 && modules.every(function(module) {
    return !!module.complete;
  });
}

function logTest_(username, classId, complete, score) {
  const id = String(classId || DEFAULT_CLASS_ID);
  const cls = requireAssignedClass_(username, id);
  const status = getStatus_(username, id);
  if (!allModulesComplete_(status.modules)) throw new Error("All modules for this class must be complete before logging the test");
  const numericScore = Number(score);
  if (isNaN(numericScore)) throw new Error("Missing score");
  const passed = !!complete && numericScore >= Number(cls.passingScore || 80);

  appendObject_(TEST_RESULTS_SHEET, {
    username: username,
    classId: id,
    complete: !!complete,
    score: numericScore,
    passed: passed,
    updatedAt: new Date()
  });

  if (id === DEFAULT_CLASS_ID) {
    const row = ensureStatusRow_(username);
    const sheet = sh_(STATUS_SHEET);
    setField_(sheet, row, "testComplete", passed ? "complete" : "");
    setField_(sheet, row, "testScore", numericScore);
    setField_(sheet, row, "updatedAt", new Date());
  }

  sendTestEmail_(username, id, cls.title, numericScore, passed);
  return getStatus_(username, id);
}

function saveClass_(data) {
  const payload = {
    id: data.id || Utilities.getUuid(),
    title: data.title || "Untitled Class",
    description: data.description || "",
    passingScore: Number(data.passingScore || 80),
    requiredWatchPercent: normalizeWatchPercent_(data.requiredWatchPercent),
    sortOrder: Number(data.sortOrder || 99),
    active: data.active === false ? false : active_(data.active)
  };
  return upsertById_(CLASSES_SHEET, payload, ["id", "title", "description", "passingScore", "requiredWatchPercent", "sortOrder", "active"]);
}

function saveModule_(data) {
  const classId = String(data.classId || DEFAULT_CLASS_ID);
  classById_(classId, false);
  const payload = {
    id: data.id || Utilities.getUuid(),
    classId: classId,
    title: data.title || "Untitled Module",
    youtubeId: extractYouTubeId_(data.youtubeId || data.youtubeUrl || ""),
    sortOrder: Number(data.sortOrder || 99),
    requiredWatchPercent: normalizeWatchPercent_(data.requiredWatchPercent),
    active: data.active === false ? false : active_(data.active)
  };
  return upsertById_(MODULES_SHEET, payload, ["id", "classId", "title", "youtubeId", "sortOrder", "requiredWatchPercent", "active"]);
}

function saveTestQuestion_(data) {
  const classId = String(data.classId || DEFAULT_CLASS_ID);
  classById_(classId, false);
  const payload = {
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
  };
  return upsertById_(TEST_QUESTIONS_SHEET, payload, ["id", "classId", "question", "optionA", "optionB", "optionC", "optionD", "correctIndex", "sortOrder", "active"]);
}

function upsertById_(sheetName, data, fields) {
  const sheet = sh_(sheetName);
  const existing = rowObjs_(sheetName).find(function(row) {
    return String(row.obj.id) === String(data.id);
  });
  if (existing) {
    fields.forEach(function(field) { setField_(sheet, existing.row, field, data[field]); });
    if (headers_(sheet).indexOf("updatedAt") !== -1) setField_(sheet, existing.row, "updatedAt", new Date());
  } else {
    const obj = Object.assign({}, data);
    obj.updatedAt = new Date();
    appendObject_(sheetName, obj);
  }
  return { ok: true, id: data.id };
}

function deactivateById_(sheetName, id) {
  if (!id) return { ok: false, error: "Missing id" };
  const sheet = sh_(sheetName);
  const existing = rowObjs_(sheetName).find(function(row) {
    return String(row.obj.id) === String(id);
  });
  if (!existing) return { ok: false, error: "Not found" };
  setField_(sheet, existing.row, "active", false);
  if (headers_(sheet).indexOf("updatedAt") !== -1) setField_(sheet, existing.row, "updatedAt", new Date());
  return { ok: true };
}

function submitSignupRequest_(data) {
  ["username", "password", "fullNameOnLicense", "licenseNumber", "preferredContact", "dob", "requestedClassId"].forEach(function(key) {
    if (!String(data[key] || "").trim()) throw new Error("Missing required field: " + key);
  });
  const username = String(data.username).trim();
  const contact = String(data.preferredContact).trim();
  if (!validPreferredContact_(contact)) throw new Error("Enter a valid email address or cell phone number.");
  const cls = classById_(data.requestedClassId, true);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
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
      preferredContact: contact
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
      preferredContact: contact
    });
  } finally {
    lock.releaseLock();
  }

  if (ADMIN_EMAIL) {
    MailApp.sendEmail(
      ADMIN_EMAIL,
      "New Blue Ridge ELDT training request",
      "Training request\nUsername: " + username +
      "\nName: " + data.fullNameOnLicense +
      "\nLicense: " + data.licenseNumber +
      "\nContact: " + contact +
      "\nDOB: " + data.dob +
      "\nTraining: " + (cls.title || data.requestedClassId) +
      "\nStatus: Pending approval"
    );
  }

  return { ok: true, username: username, pendingApproval: true, backendVersion: BACKEND_VERSION };
}

function validPreferredContact_(value) {
  const contact = String(value || "").trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const digits = contact.replace(/\D/g, "");
  const phoneOk = /^\+?[\d\s().-]+$/.test(contact) && digits.length >= 10 && digits.length <= 15;
  return emailOk || phoneOk;
}

function sendTestEmail_(username, classId, title, score, passed) {
  if (!ADMIN_EMAIL) return;
  const student = findStudent_(username);
  const info = student ? student.obj : {};
  MailApp.sendEmail(
    ADMIN_EMAIL,
    "Blue Ridge ELDT test finished",
    "Test finished\nScore: " + score +
    "\nPass/fail: " + (passed ? "pass" : "fail") +
    "\nClass/training: " + (title || classId) +
    "\nUsername: " + username +
    "\nFull name on license: " + (info.fullNameOnLicense || "") +
    "\nLicense number: " + (info.licenseNumber || "")
  );
}

function extractYouTubeId_(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;
  const match = text.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : text;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
