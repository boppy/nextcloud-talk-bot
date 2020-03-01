const Nextcloudbot = require('../src/nextcloud-talk-bot');

const bot = new Nextcloudbot();
const chan = bot.getChannel('dy3ennzq');

// callback receives n parameters on regex-matches
//   msg is followed by:
//   - all named groups (see example 2 below)
//   - all index.keyed match() return values
//
//  Note: if not working with named groups (you should!), you have to *skip* the first entry after msg,
//    because it contains the full match.
chan.onText(
    /^#echo (.*)$/,
    (msg, match, group1) => msg.reply(group1, false)
);

// The match() info is still appended, but AFTER named groups...
chan.onText(
    /^#echo (?<text>.*)$/,
    (msg, text, match, group1) => msg.reply(text, false)
);

bot.startPolling();
