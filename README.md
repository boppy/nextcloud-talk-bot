# Node.js Nextcloud Talk Bot | NexTBot

This is a Node.js module to interact with the [Rest-API](https://nextcloud-talk.readthedocs.io/en/latest/) provided by [Nextcloud](https://nextcloud.com).

## Install


```bash
npm install --save nextcloud-talk-bot
```

## Usage

```js
// Import Class
const NextcloudTalkBot = require('nextlcoud-talk-bot');

// Create instance w/ bot login data
const bot = new NextcloudTalkBot({
    server: '<server_url_here>',
    user: '<bot_username_here>',
    pass: '<bot_password_here>',
    autoJoin: true
});

// Simple usage; reacts to all channels the bot joined
bot.onText('Somebody in?', x => x.reply('Sure, because you are!'));

// Join a channel and react to it's contents
const boppy = bot.getChannel('<channel_id_here>');

// Reaction bases on RegExp (simple)
boppy.onText(/^#echo /, msg => msg.reply(msg.text.substr(6), false));

// Reaction based on RegExp (anvanced)
boppy.onText(/^#answer ((['"])(?<q1>.*?)(\2)|(?<q2>[^"']\S*)) (?<a>.*)$/, (msg, matches) => {
    bot.onText(matches.groups.q1 || matches.groups.q2, (message) => {
        message.reply(matches.groups.a, false);
    });
});

// Need to start polling
bot.startPolling();
```

See [examples directory][exmples] for some examples on using this module.

## Origin

Basically I was trying to replace big-company-based services on my mobile with a fully integrated Nextcloud.

Since Contacts, Calendar, Notes, Office-Apps, etc. are stable enough, I went for the replacement of
Telegram/Hangouts/WhatsApp/<YouNameIt> with Talk. One massive limitation was that I had chat bots present in my current
messaging solution that I didn't want to miss. Their main propose was to notify me in case of infrastructure problems
and to help my out with my *sieve-based neck attachment*.

So I took a look at the available Chat Bots for Telegram and came back to the node module I already used to use - 
[yagop's Telegram Bot API][yagop_repo]. So I implemented NexTBot to match some of its
behaviour, as being an EventEmitter (based on [EventEmitter3](https://www.npmjs.com/package/eventemitter3)) and using `.onText()` for easy interaction. I also
based much of the surroundings on yagop's Repo (like this README and other docs).

## Community

The first thank goes out to yagop and contributors for the 
[Telegram Bot API Node.js Module][yagop_repo].

We thank all the developers in the Open-Source community who continuously take their time and effort in advancing
this project and all underlying projects

As soon as there is one, I'll also be absolutely happy to thank any contributor!

## License

**The MIT License (MIT)**

Copyright © 2020 Henning Bopp <henning.bopp@gmail.com>

[example]:https://www.gibthub.com/boppy/nextcloud-talk-bot
[yagop_repo]:https://github.com/yagop/node-telegram-bot-api
