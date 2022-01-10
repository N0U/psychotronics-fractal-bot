require('dotenv').config();

const fs = require('fs');
const { Telegraf, Telegram, Markup } = require('telegraf');
const markdownEscape = require('markdown-escape');

const { Pool } = require('pg');
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const bot = new Telegraf(process.env.TOKEN);
bot.telegram.setMyCommands([
  { command: 'help', description: 'Справка' },
  { command: 'fullhelp', description: 'Текстота умная' },
  { command: 'version', description: 'Ченджлог' },
  { command: 'tinfo', description: 'Техническая инфа' },
]);

const Social = require('./social/social');

const social = new Social(db);

async function testDb() {

  for(let i = 1; i <= 20; i++)
    await social.addUser(i, `n${i}`);

  for(let i = 1; i <= 20; i++)
    await social.addUser(i, `n${i}`);

  for(let i = 2; i <= 5; i++)
    await social.like(1, i);

  for(let i = 8; i <= 15; i++)
    await social.like(1, i);

  for(let i = 2; i <= 9; i++)
    await social.like(i, 1);

  for(let i = 1; i <= 10; i++)
    await social.like(i, i + 5);

  await social.like(5, 3);
  await social.like(5, 2);
  console.log(await social.getRecivers(1));
//  console.log(await social.getRecivers(2));
  console.log(await social.listUserFavor(1));
  console.log(await social.listFavoredByUser(1));
}
//Promise.all([testDb()]);
social.getUser(100, 'aaa').then(r => console.log(r)).catch(e => console.error(e));

function isPrivateChat(chat) {
    return chat.type === 'private';
}

bot.start(async (ctx) => {
  try {
    const { message: { from, chat } } = ctx.update;
    if(from.is_bot || !isPrivateChat(chat))
      return;

    social.addUser(from.id, from.username);
    await ctx.reply(
      `Привет ${from.username}\r\n` +
      `Тыкай /help для справки`
    );
  } catch(ex) {
    console.trace(ex);
  }
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
  try {
    const { callback_query: { from, message, data }} = ctx.update;
    console.log(`${from.username} gives favor to ${data}`);
    await ctx.editMessageReplyMarkup();
    const id = parseInt(data);
    if(id > 0){
      social.like(id, from.id);
    } else {
      social.dislike(-id, from.id);
    }
  } catch(ex) {
    console.trace(ex);
  }
});

bot.on('text', async (ctx) => {
  try {
    const tg = ctx.telegram;
    const { message: { text, message_id, from, chat }} = ctx.update;
    if(from.is_bot || !isPrivateChat(chat))
      return;

    const users = await social.getUser(from.id, from.username);
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
        const msgId = await ctx.copyMessage(id, { reply_markup: reply_markup });
        return { msgId, toId: id };
      } catch(err) {
        console.warn(`Delete user ${id} coz' bot has no access to him`);
        await social.deleteUser(id);
        throw err;
      }
    };

    for(const id of recivers) {
      promises.push(copyMsg(id));
    }

    const results = await Promise.allSettled(promises);
  } catch(ex){
    console.trace();
    console.error(ex);
  }
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
  db.end().then(() => console.log('pool has ended'));
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
