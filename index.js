const { Telegraf, Telegram, Markup } = require('telegraf');
const markdownEscape = require('markdown-escape');

const bot = new Telegraf(process.env.TOKEN);

const Datastore = require('nedb');
const socialDb = new Datastore({ filename: '.data/social' });
socialDb.loadDatabase(function (err) {
  err && console.error(err);
});

const Social = require('./social/social');
const social = new Social(socialDb);

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
