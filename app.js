function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function requireAuth() {
  const u = sessionStorage.getItem("username");
  if (!u) location.href = "index.html";
  return u;
}

async function login(username, password) {
  const url = `${APP_SCRIPT_URL}?action=validateLogin&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const r = await fetch(url, { method: "GET", cache: "no-store" });

  if (!r.ok) {
    throw new Error(`Login failed: ${r.status}`);
  }

  const data = await r.json();

  if (!data.ok) return false;

  sessionStorage.setItem("username", data.username);
  return true;
}

function logout() {
  sessionStorage.removeItem("username");
  location.href = "index.html";
}

async function apiGetStatus(username) {
  const url = `${APP_SCRIPT_URL}?action=getStatus&username=${encodeURIComponent(username)}`;
  const r = await fetch(url, { method: "GET", cache: "no-store" });

  if (!r.ok) {
    throw new Error(`GET status failed: ${r.status}`);
  }

  return await r.json();
}

async function apiLogModule(username, moduleId) {
  const r = await fetch(APP_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "logModule",
      username: username,
      moduleId: moduleId
    })
  });

  if (!r.ok) {
    throw new Error(`Log module failed: ${r.status}`);
  }

  return await r.json();
}

async function apiLogTest(username, complete, score) {
  const r = await fetch(APP_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "logTest",
      username: username,
      complete: complete,
      score: score
    })
  });

  if (!r.ok) {
    throw new Error(`Log test failed: ${r.status}`);
  }

  return await r.json();
}

function allModulesComplete(status) {
  for (let i = 1; i <= 10; i++) {
    if (!status.modules["m" + i]) return false;
  }
  return true;
}
