// ==============================
// BLUE RIDGE ELDT SITE CONFIG
// ==============================

// Independent Blue Ridge Google Apps Script deployment.
const APP_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbzarLXxVNC2b0HtRYxDMjKtU6_XvBv0MN7Lc4KwoU1rB3Opg8SK_Yz7I9HpUxiFZTw/exec";

// Backward compatibility.
const SHEETS_API_URL = APP_SCRIPT_URL;

const BUSINESS_NAME = "Blue Ridge Entry Level Driver Training";
const BUSINESS_SHORT_NAME = "Blue Ridge ELDT";
const BUSINESS_TAGLINE = "ELDT Compliance Training";

// ==============================
// DEMO USERS
// ==============================

const USERS = [
  {
    username: "student1",
    password: "1234",
    role: "student"
  },
  {
    username: "student2",
    password: "1234",
    role: "student"
  }
];

// ==============================
// DEFAULT CLASS A/B MODULES
// Matches the current Martinsville CDL curriculum.
// The live Google Sheet remains authoritative.
// ==============================

const MODULES = [
  {
    id: 1,
    title: "Module 1 — Introduction",
    youtubeId: "-qXt8htJ9h4"
  },
  {
    id: 2,
    title: "Module 2 — Safety & Inspection",
    youtubeId: "RS4K5FCL988"
  },
  {
    id: 3,
    title: "Module 3 — Basic Operations",
    youtubeId: "TLeq0WikSmU"
  },
  {
    id: 4,
    title: "Module 4 — Advanced Driving",
    youtubeId: "cMML4tQdVvY"
  }
];

// Percent of video required before completion.
const REQUIRED_WATCH_PERCENT = 0.9;

// ==============================
// BUSINESS BRANDING LAYER
// Keeps the copied portal code separate from the city-facing branding
// without duplicating the same wording across every page.
// ==============================

function applyBusinessBranding() {
  const replacements = [
    ["Martinsville CDL Training Admin", "Blue Ridge ELDT Training Admin"],
    ["Martinsville CDL Program", BUSINESS_NAME],
    ["CDL Training Portal", "Blue Ridge ELDT Training Portal"]
  ];

  let title = document.title || "";
  replacements.forEach(([from, to]) => {
    title = title.split(from).join(to);
  });
  document.title = title;

  if (document.body) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parentTag = node.parentElement ? node.parentElement.tagName : "";
      if (parentTag === "SCRIPT" || parentTag === "STYLE") continue;
      let value = node.nodeValue || "";
      replacements.forEach(([from, to]) => {
        value = value.split(from).join(to);
      });
      node.nodeValue = value;
    }

    document.querySelectorAll(".brand-logo").forEach((logo) => {
      logo.innerHTML = '<div class="brand-fallback" aria-label="Blue Ridge Entry Level Driver Training">BR</div>';
    });
  }

  const style = document.createElement("style");
  style.textContent = ".hero-card::after,.hero::after{background-image:none!important;}";
  document.head.appendChild(style);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyBusinessBranding);
} else {
  applyBusinessBranding();
}
