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
// Restored from the original Blue Ridge site.
// ==============================

const MODULES = [
  {
    id: 1,
    title: "Intro (5 mins)",
    youtubeId: "BGlWc4pvXSQ"
  },
  {
    id: 2,
    title: "Module 1 (18.5 mins)",
    youtubeId: "PKEVCzlIo6o"
  },
  {
    id: 3,
    title: "Module 2 (22.08 mins)",
    youtubeId: "pZPTGA1-CWg"
  },
  {
    id: 4,
    title: "Module 3 (14.10 mins)",
    youtubeId: "Qa5zqYHRqso"
  },
  {
    id: 5,
    title: "Module 4 (12 mins)",
    youtubeId: "2uCIkj693I8"
  },
  {
    id: 6,
    title: "Module 5 (25.25 mins)",
    youtubeId: "Od5tJW7NZK8"
  },
  {
    id: 7,
    title: "Module 6 (7.41 mins)",
    youtubeId: "Ch9WP4p5vGs"
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
