require('dotenv').config();

const fs = require('fs');
const { Telegraf, Telegram, Markup } = require('telegraf');
const markdownEscape = require('markdown-escape');

const bot = new Telegraf(process.env.TOKEN);
bot.telegram.setMyCommands([
  { command: 'help', description: 'Справка' },
  { command: 'fullhelp', description: 'Текстота умная' },
  { command: 'version', description: 'Ченджлог' },
  { command: 'tinfo', description: 'Техническая инфа' },
]);

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.env.DB_PATH);

const Social = require('./social/social');

const social = new Social(db);
/*
for(let i = 1; i <= 20; i++)
  social.addUser(i, `n${i}`);
*/
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
//Promise.all([testDb()]);


function isPrivateChat(chat) {
    return chat.type === 'private';
}

bot.start(async (ctx) => {
  const { message: { from, chat } } = ctx.update;
  if(from.is_bot || !isPrivateChat(chat))
    return;

  social.addUser(from.id, from.username);
  await ctx.reply(
    `Привет ${from.username}\r\n` +
    `Тыкай /help для справки`
  );
});

const helpText = fs.readFileSync('info/help', 'utf8');
const fullHelpText = fs.readFileSync('info/fullhelp', 'utf8');
const version = fs.readFileSync('info/version', 'utf8');
bot.help(async (ctx) => {
  await ctx.reply(helpText);
});
bot.command('fullhelp', async (ctx) => {
  await ctx.reply(fullHelpText);
});
bot.command('version', async (ctx) => {
  await ctx.reply(version);
});

bot.command('tinfo', async (ctx) => {
  await ctx.reply(`TALK_THRESHOLDS: ${process.env.TALK_THRESHOLDS}`);
});
/*
bot.command('test', async (ctx) => {
  const { message: { from, chat } } = ctx.update;
  const reply_markup = Markup.inlineKeyboard([
      Markup.button.callback('+', from.id),
      Markup.button.callback('-', -from.id),
    ]).reply_markup;
  await ctx.reply('test', { reply_markup: reply_markup });
});
*/
bot.on('callback_query', async (ctx) => {
  const { callback_query: { from, message, data }} = ctx.update;
  console.log(`${from.username} gives favor to ${data}`);
  await ctx.editMessageReplyMarkup();
  const id = parseInt(data);
  if(id > 0){
    social.like(id, from.id);
  } else {
    social.dislike(-id, from.id);
  }
});

bot.on('text', async (ctx) => {
  const tg = ctx.telegram;
  const { message: { text, message_id, from, chat }} = ctx.update;
  if(from.is_bot || !isPrivateChat(chat))
    return;

  let recivers;
  if(text.startsWith('!!!'))
    recivers = await social.whoUserShoutsTo(from.id);
  else if(text.startsWith('***') || text.startsWith('@@@'))
    recivers = await social.whoUserWhispersTo(from.id);
  else
    recivers = await social.whoUserTalksTo(from.id);

  const promises = [];

  const reply_markup = Markup.inlineKeyboard([
      Markup.button.callback('+', from.id),
      Markup.button.callback('-', -from.id),
    ]).reply_markup;

  const copyMsg = async (id) => {
    try {
      const msgId = ctx.copyMessage(id, { reply_markup: reply_markup });
      return { msgId, toId: id };
    } catch(err) {
      console.error(err);
      social.deleteUser(id);
      throw err;
    }
  };

  for(const id of recivers) {
    promises.push(copyMsg(id));
  }

  const results = await Promise.allSettled(promises);
  const ids = results.filter(p => p.status === 'fulfilled').map(p => p.value);
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
