const { Telegraf, Telegram, Markup } = require('telegraf');
const markdownEscape = require('markdown-escape');

const bot = new Telegraf(process.env.TOKEN);

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('.data/data.db');

const Social = require('./social/social');

const social = new Social(db);
/*
async function testDb() {
  for(let i = 1; i <= 20; i++)
    social.addUser(i, `n${i}`);

  for(let i = 2; i <= 5; i++)
    social.like(1, i);

  for(let i = 8; i <= 15; i++)
    social.like(1, i);

  for(let i = 2; i <= 9; i++)
    social.like(i, 1);

  for(let i = 1; i <= 10; i++)
    social.like(i, i + 5);

  social.like(5, 3);
  social.like(5, 2);
  console.log(await social.getRecivers(1));
  console.log(await social.getRecivers(2));
  console.log(await social.listUserFavor(1));
  console.log(await social.listFavoredByUser(1));
}
Promise.all([testDb()]);
*/

bot.start((ctx) => ctx.reply('Привет'));

bot.on('text', async (ctx) => {
  const { message } = ctx.update;
});

if(process.env.PROD) {
  console.log('Launch in prod mode');
  bot.launch({
    webhook: {
      domain: process.env.URL,
      port: Number(process.env.PORT),
    }
  })
} else {
  console.log('Launch in dev mode');
  bot.launch();
}

function onClose() {
  db.close();
}
// Enable graceful stop
process.once('SIGINT', () => {
  onClose();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  onClose();
  bot.stop('SIGTERM');
});
