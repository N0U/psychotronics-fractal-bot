const DEFAULT_FAVOR = 0;
const FAVOR_STEP = 1;
const THRESHOLDS =  process.env.TALK_THRESHOLDS.split(':').map(x => parseInt(x));
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
  }

  async addUser(id, name) {
    await this.db.query('INSERT INTO users VALUES($1, $2) ON CONFLICT DO NOTHING', [id, name]);
  }

  async getUserIfExist(id) {
    const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getUser(id, name) {
    let user = await this.getUserIfExist(id);
    if(!user) {
      console.log(`Creating user ${id} ${name}`);
      await this.addUser(id, name);
      user = await this.getUserIfExist(id);
    }
    return user;
  }

  async deleteUser(id) {
    // Dont delete users on test
    if(process.env.PROD)
      console.log(await this.db.query('DELETE FROM users WHERE id = $1', [id]));
  }

  async giveFavor(toId, fromId, score) {
    await this.db.query(
      `INSERT INTO favor (fromId, toId, score) VALUES($1, $2, $3)
        ON CONFLICT ON CONSTRAINT pk DO UPDATE SET score = favor.score + excluded.score`,
      [fromId, toId, score]);
  }

  async like(toId, fromId) {
    await this.giveFavor(toId, fromId, FAVOR_STEP);
  }

  async dislike(toId, fromId) {
    await this.giveFavor(toId, fromId, -FAVOR_STEP);
  }

  async listUserFavor(id) {
    return (await this.db.query(
      'SELECT * FROM favor WHERE toId = $1',
      [id],
    )).rows;
  }

  async listFavoredByUser(id) {
    return (await this.db.query(
      'SELECT * FROM favor WHERE fromId = $1',
      [id],
    )).rows;
  }

  async getRecivers(id, threshold = NORMAL_THRESHOLD) {
    const result = await this.db.query(
      `SELECT u.id as id FROM users as u
        LEFT JOIN favor as f ON f.fromId = u.id AND f.toId = $1
      WHERE id != $1 AND COALESCE(f.score, 0) > $2`,
        [id, threshold]
    );
    return result.rows.map(q => q.id);
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
