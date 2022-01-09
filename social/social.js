const DEFAULT_FAVOR = 0;
const FAVOR_STEP = 1;
const THRESHOLDS =  process.env.SAY_THRESHOLDS.split(':').map(x => parseInt(x));
const WHISPER_THRESHOLD = THRESHOLDS[0];
const NORMAL_THRESHOLD = THRESHOLDS[1];
const SHOUT_THRESHOLD = THRESHOLDS[2];

const { execAll } = require('../utils.js');
//
// toId
// fromId
// score
// [score] shows how [fromId] wanna hear what [id] send
class Social {
  constructor(db) {
    this.db = db;
    this.db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
    this.db.run('CREATE TABLE IF NOT EXISTS favor (fromID INTEGER NOT NULL, toId INTEGER NOT NULL, score INTEGER NOT NULL DEFAULT 0, UNIQUE (fromId, toId))');
  }

  addUser(id, name) {
    this.db.run(`INSERT OR IGNORE INTO users VALUES(?, ?)`, id, name);
  }

  deleteUser(id) {
    this.db.run('DELETE FROM users WHERE id = ?', id);
  }

  giveFavor(toId, fromId, score) {
    this.db.run(
      `INSERT INTO favor (fromId, toId, score) VALUES(?, ?, ?)
        ON CONFLICT (fromId, toId) DO UPDATE SET score = score + excluded.score`,
      toId, fromId, score);
  }

  like(toId, fromId) {
    this.giveFavor(toId, fromId, FAVOR_STEP);
  }

  dislike(toId, fromId) {
    this.giveFavor(toId, fromId, -FAVOR_STEP);
  }

  async listUserFavor(id) {
    return await execAll(
      this.db,
      'SELECT * FROM favor WHERE toId = ?',
      [id],
    );
  }

  async listFavoredByUser(id) {
    return await execAll(
      this.db,
      'SELECT * FROM favor WHERE fromId = ?',
      [id],
    );
  }

  async getRecivers(id, threshold = NORMAL_THRESHOLD) {
    console.log('THD ' + threshold);
    const rows = await execAll(
      this.db,
      `SELECT u.id as id FROM users as u
        LEFT JOIN favor as f ON f.fromId = u.id AND f.toId = ?1
      WHERE id != ?1 AND ifnull(f.score, 0) > ?`,
        [id, threshold]
    );
    return rows.map(q => q.id);
  }

  async whoUserWhispersTo(id) {
    return await this.getRecivers(id, WHISPER_THRESHOLD);
  }

  async whoUserTalksTo(id) {
    return await this.getRecivers(id, NORMAL_THRESHOLD);
  }

  async whoUserShoutsTo(id) {
    return await this.getRecivers(id, SHOUT_THRESHOLD);
  }
}

module.exports = Social;
