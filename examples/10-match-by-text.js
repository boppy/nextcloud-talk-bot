const Nextcloudbot = require('../src/nextcloud-talk-bot');

const bot = new Nextcloudbot();
const chan = bot.getChannel('dy3ennzq');

// callback receives 1 parameter on text-matches
chan.onText(
    '#time',
    msg => msg.reply(new Date().toLocaleString(), false)
);

bot.startPolling();
