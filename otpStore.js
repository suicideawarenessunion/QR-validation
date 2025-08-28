// otpStore.js
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('./logs.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS otp (
    token TEXT PRIMARY KEY,
    code TEXT,
    created_at INTEGER
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER,
    uniform INTEGER,
    otp TEXT,
    granted INTEGER,
    note TEXT
  )`);
});

function createOtp(code) {
  const token = uuidv4();
  const now = Date.now();
  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO otp (token, code, created_at) VALUES (?,?,?)`,
      [token, code, now], (err) => {
        if (err) reject(err); else resolve({ token, code, created_at: now });
      });
  });
}

function getOtp(token) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM otp WHERE token=?`, [token], (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });
}

function deleteOtp(token) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM otp WHERE token=?`, [token], (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

function logEvent({ uniform, otp, granted, note }) {
  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO events (ts, uniform, otp, granted, note) VALUES (?,?,?,?,?)`,
      [Date.now(), uniform ? 1 : 0, otp || null, granted ? 1 : 0, note || null],
      (err) => { if (err) reject(err); else resolve(); });
  });
}

module.exports = { createOtp, getOtp, deleteOtp, logEvent };
