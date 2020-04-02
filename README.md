# Node.js Nextcloud Talk Bot | nctb

This is a Node.js module to interact with the [Rest-API](https://nextcloud-talk.readthedocs.io/en/latest/) provided by [Nextcloud](https://nextcloud.com)s [Talk App](https://github.com/nextcloud/spreed).

## Install

```bash
npm install nextcloud-talk-bot
```

## Usage

```js
// Import Class
const NextcloudTalkBot = require('nextcloud-talk-bot');

// Create instance w/ bot login data
const bot = new NextcloudTalkBot({
    server: '<server_url_here>',
    user: '<bot_username_here>',
    pass: '<bot_password_here>',
    autoJoin: true
});

// Simple usage; reacts to all channels the bot joined
bot.onText('Somebody in?', x => x.reply('Sure, because you are!'));

// Join a channel and react to it's contents (just returns channel if already joined)
const boppy = bot.getChannel('<channel_id_here>');

// Reaction bases on RegExp (simple)
boppy.onText(/^#echo /, msg => msg.reply(msg.text.substr(6), false));

// See examples dir for more examples

// Need to start polling
bot.startPolling();
```
See [examples directory](https://github.com/boppy/nextcloud-talk-bot/tree/master/examples) for some examples on using this module.

### Requirements

Since Bots are not currently supported by Nextcloud (@ 2020-03-01), you have to create a user for your bot. Username and password (and nextclouds hostname for sure) have to be supplied while creating the bot instance (see below).

### Configuration

You can supply login information while creating the instance (see example above). You can also supply ENV vars (or `.env` file if configured).

```bash
#!/usr/bin/env bash

export NCTB_SERVER="https://mycloud.example.com"
export NCTB_USER="bot"
export NCTB_PASS="p@ssw0rd"
node mybot.js
```

## Origin

Basically I am trying to replace big-company-based services on my mobile with a fully integrated Nextcloud.

Since [Contacts](https://apps.nextcloud.com/apps/contacts), [Calendar](https://apps.nextcloud.com/apps/calendar), [Notes](https://apps.nextcloud.com/apps/notes), [Office-Apps](https://apps.nextcloud.com/apps/onlyoffice), etc. are stable enough, I went for the replacement of
Telegram/Hangouts/WhatsApp/<YouNameIt> with [Talk](https://apps.nextcloud.com/apps/spreed). One massive limitation was that I had chat bots present in my current messaging solution that I didn't want to miss. Their main propose was to notify me in case of infrastructure problems and to help my out with my *sieve-based neck attachment*.

So I took a look at the available Chat Bots for Telegram and came back to the node module I already used to use - [yagop's Telegram Bot API][yagop_repo]. So I implemented nctb to match some of its behaviour, as being an EventEmitter (based on [EventEmitter3](https://www.npmjs.com/package/eventemitter3)) and using `.onText()` for easy interaction. I also based much of the surroundings on yagop's Repo (like this README and other docs).

## Community

The first thank goes out to yagop and contributors for the 
[Telegram Bot API Node.js Module][yagop_repo].

We thank all the developers in the Open-Source community who continuously take their time and effort in advancing this project and all underlying projects.

As soon as there is one, I'll also be absolutely happy to thank any contributor!

## License

**The MIT License (MIT)**

Copyright © 2020 Henning Bopp <henning.bopp@gmail.com>

[example]:https://github.com/boppy/nextcloud-talk-bot/tree/master/examples
[yagop_repo]:https://github.com/yagop/node-telegram-bot-api
