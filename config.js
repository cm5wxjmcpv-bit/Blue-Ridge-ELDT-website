// ==============================
// TRAINING SITE CONFIG
// ==============================

// Google Apps Script API
const APP_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbzarLXxVNC2b0HtRYxDMjKtU6_XvBv0MN7Lc4KwoU1rB3Opg8SK_Yz7I9HpUxiFZTw/exec";

// backward compatibility
const SHEETS_API_URL = APP_SCRIPT_URL;


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
// MODULES
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
    title: "Module 3 (14.10mins)",
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


// percent of video required before completion
const REQUIRED_WATCH_PERCENT = 0.9;
