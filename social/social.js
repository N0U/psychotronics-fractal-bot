const DEFAULT_FAVOR = 0;
const FAVOR_STEP = 5;

function execAll(db, query, params) {
  return new Promise((resolve,reject) => {
    db.all(query, params, (err, rows) => {
      if(!!err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}
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

  async getRecivers(id, threshold = -20) {
    const rows = await execAll(
      this.db,
      `SELECT u.id as id FROM users as u
        LEFT JOIN favor as f ON f.fromId = u.id AND f.toId = ?1
      WHERE id != ?1 AND ifnull(f.score, 0) > ?`,
        [id, threshold]
    );
    return rows.map(q => q.id);
  }
}

module.exports = Social;
