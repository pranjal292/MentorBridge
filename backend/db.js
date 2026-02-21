const crypto = require('crypto');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_PATH = path.join(DATA_DIR, 'mentorbridge.db');

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
  return crypto.createHash('sha256').update(key).digest();
}

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText || !String(encryptedText).includes(':')) return encryptedText;
  try {
    const parts = String(encryptedText).split(':');
    if (parts[0].length !== 32) return encryptedText; // Not an encrypted value
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts.slice(1).join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return encryptedText;
  }
}

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('STUDENT','MENTOR')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS student_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      skills TEXT DEFAULT '',
      interests TEXT DEFAULT '',
      goals TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      certificates TEXT DEFAULT '',
      qualifications TEXT DEFAULT '',
      experience TEXT DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Add new columns to existing tables (safe to fail if already exists)
  try { db.run("ALTER TABLE student_profiles ADD COLUMN certificates TEXT DEFAULT ''"); } catch (e) { }
  try { db.run("ALTER TABLE student_profiles ADD COLUMN qualifications TEXT DEFAULT ''"); } catch (e) { }
  try { db.run("ALTER TABLE student_profiles ADD COLUMN experience TEXT DEFAULT ''"); } catch (e) { }

  db.run(`
    CREATE TABLE IF NOT EXISTS mentor_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      title TEXT DEFAULT '',
      company TEXT DEFAULT '',
      expertise TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      meeting_link TEXT DEFAULT '',
      years_exp INTEGER DEFAULT 0,
      certificates TEXT DEFAULT '',
      qualifications TEXT DEFAULT '',
      experience TEXT DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  try { db.run("ALTER TABLE mentor_profiles ADD COLUMN certificates TEXT DEFAULT ''"); } catch (e) { }
  try { db.run("ALTER TABLE mentor_profiles ADD COLUMN qualifications TEXT DEFAULT ''"); } catch (e) { }
  try { db.run("ALTER TABLE mentor_profiles ADD COLUMN experience TEXT DEFAULT ''"); } catch (e) { }

  db.run(`
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      mentor_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('PENDING','ACCEPTED','REJECTED')) DEFAULT 'PENDING',
      message TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (mentor_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      connection_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      read_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (connection_id) REFERENCES connections(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);

  try { db.run("ALTER TABLE messages ADD COLUMN read_at DATETIME DEFAULT NULL"); } catch (e) { }

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewer_id INTEGER NOT NULL,
      reviewee_id INTEGER NOT NULL,
      connection_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (reviewee_id) REFERENCES users(id),
      FOREIGN KEY (connection_id) REFERENCES connections(id),
      UNIQUE(connection_id, reviewer_id)
    )
  `);

  saveDb();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Helper: run query and return all results as array of objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run query and return first result as object
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Helper: run insert/update/delete and return changes info
function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
  // Use prepared statement to get last_insert_rowid reliably
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const lastId = stmt.getAsObject().id;
  stmt.free();
  return { lastInsertRowid: lastId };
}

module.exports = { getDb, encrypt, decrypt, queryAll, queryOne, runSql, saveDb };
