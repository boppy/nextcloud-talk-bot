const fetch = require('node-fetch');
const EventEmitter = require('eventemitter3');
const querystring = require('querystring');
const fs = require("fs");
const dotenv = require('dotenv');

class NextcloudTalkBot extends EventEmitter {
    /**
     * @typedef {Object} Channel
     * @property {boolean} joined - Boolean Joined State
     * @property {number} lastKnownMessageId - Last known Id is Int
     * @property {channelSendText} sendText - Sends a Text
     * @property {channelOnText} onText - Trigger Function if a Text is Received
     */
    /**
     * @callback channelSendText
     * @param {string} Message
     */
    /**
     * @callback channelOnText
     * @param {RegExp|string} regxt - RegExp or String to Check
     * @param {Function} callback - Callback function
     */

    /**
     *
     * @param {*} [options]
     */
    constructor(options = {}) {
        super();
        this.debug = options.debug === true;

        this.server = options.server;
        this.user = options.user;
        this.pass = options.pass;
        this.setReadMarker = options.setReadMarker === false ? 0 : 1;

        if (!this.server || !this.user || !this.pass) {
            dotenv.config();
            this.server = this.server || process.env.NCTB_SERVER;
            this.user = this.user || process.env.NCTB_USER;
            this.pass = this.pass || process.env.NCTB_PASS;
            if (!this.server || !this.user || !this.pass) {
                throw Error('Server, User, and Pass have to be set');
            }
        }

        this.channels = {};
        this.storeAllow = true;
        this.joinOnInit = options.autoJoin;

        this._loadLastIds();
        if (options.autoJoin === true) {
            this.autoJoin();
        }
    }
    autoJoin() {
        this._log('* autojoin all known channels');
        this._request('room').then(({data, headers}) => {
            data.forEach(channel => channel.readOnly || this.joinChannel(channel.token, channel.displayName))
        }).then(() => {
            this.startPolling(true);
        });
    }

    /**
     *
     * @param {string} channelId - ChannelId to get
     * @param {boolean=true} [join] - If to join
     * @returns {Channel}
     */
    getChannel(channelId, join) {
        join !== false && (this.inChannel(channelId) || this.joinChannel(channelId));
        if (!this.channels.hasOwnProperty(channelId)) {
            /** @type Channel */
            this.channels[channelId] = {
                joined: false,
                lastKnownMessageId: 0,
                sendText: (text) => this.sendText(text, channelId),
                onText: (regxt, callback) => {
                    return this.onText(regxt, callback, channelId);
                }
            }
        }
        return this.channels[channelId];
    }

    /**
     *
     * @param {string} channelId - ChannelId to Check
     * @returns {boolean}
     */
    inChannel(channelId) {
        return this.channels.hasOwnProperty(channelId) && this.channels[channelId].joined;
    }

    /**
     *
     * @param {string} channelId - ChannelId to Join
     * @param {string} [name] - Optional Name of the Channel
     * @returns {boolean}
     */
    joinChannel(channelId, name) {
        const channel = this.getChannel(channelId, false);
        if (!channel.joined) {
            channel.joined = true;
            this._log(`+ [self@${channelId}] joined ${name || ''}`);
            return true;
        }
        this._log(`± [self@${channelId}] already present`);
        return false;
    }

    /**
     *
     * @param {RegExp|string} regxt - RegExp or String to Check
     * @param {Function} callback - Callback Function to Call on Match
     * @param {string} [channelId] - Optional ChannelId to React on
     * @returns {NextcloudTalkBot}
     */
    onText(regxt, callback, channelId) {
        this._log(`@ [self@${channelId}] adding callback`);
        this.on('message', message => {
            if (!channelId || message.token === channelId) {
                const text = message.message;
                if (text === regxt) {
                    callback(message);
                } else if (typeof regxt.exec === 'function' && regxt.test(text)) {
                    const match = text.match(regxt);
                    let groups = Object.values(match.groups||{});
                    groups.push(...match);
                    message.matches = match;
                    callback(message, ...groups);
                }
            }
        });
        return this;
    }

    /**
     *
     * @param {string} text - Text to Send
     * @param {string} channelId - ChannelId to Post to
     * @param {int} [messageId] - Optional MessageId to answer to
     * @returns {fetch}
     */
    sendText(text, channelId, messageId) {
        this._log(`> [self@${channelId}/${messageId || ''}] ${text}`);
        return this._request('chat/' + channelId, {
            method: 'POST',
            body: {
                message: text,
                replyTo: messageId || 0,
            },
        }).catch($ => $);
    }
    startPolling(isAutoJoinRequest) {
        if(this.joinOnInit && isAutoJoinRequest !== true){
            this._log('° [self@sys] not starting polling. waiting for autoJoin to finish');
            return;
        }
        this._log('° [self@sys] start polling');
        Object.keys(this.channels).forEach(this._poll.bind(this));
    }
    _storeLastIds() {
        if (this.storeAllow) {
            this.__storeLastIds(false);
            this.storeAllow = false;
            setTimeout(() => this.storeAllow = true, 10000);
        } else if(!this._allowStoreTimeout) {
            this._allowStoreTimeout = setTimeout(() => {
                this._allowStoreTimeout = false;
                this._storeLastIds();
            }, 10000);
        }
    }


    _buildURL(path) {
        return `${this.server}/ocs/v2.php/apps/spreed/api/v1/${path}`;
    }
    _loadLastIds() {
        try {
            const lastIds = JSON.parse(fs.readFileSync('lastIds.json').toString());
            Object.entries(lastIds).forEach(([channelId, lastKnownMessageId]) => {
                this.getChannel(channelId, false).lastKnownMessageId = lastKnownMessageId;
            });
        } catch (e) {
        }
    }
    _log(...args) {
        if (this.debug === true) {
            console.log(...args);
        } else if (typeof args[0] === 'string') {
            process.stdout.write(args[0][0]);
        } else {
            process.stdout.write('?');
        }
    }
    _parseMessage(message) {
        if (!Array.isArray(message.messageParameters)) {
            const parm = message.messageParameters;
            return message.message.replace(/{(\S+)}/, (match, prm) => {
                if (parm[prm] && parm[prm].type === 'user') {
                    return parm[prm].id;
                }
                return match;
            });
        }
        return message.message || '';
    }
    _poll(channelId) {
        const channel = this.getChannel(channelId, false);
        if (!channel.joined) {
            this._log(`∞ [self@${channelId}] Have not joined this channel. waiting a minute...`);
            setTimeout(this._poll.bind(this, channelId), 60000);
            return;
        }
        this._log(`1 [self@${channelId}] Send poll Request`);
        this._request('chat/' + channelId, {
            query: {
                lookIntoFuture: 1,
                setReadMarker: this.setReadMarker,
                lastKnownMessageId: channel.lastKnownMessageId,
            }
        }).then((data) => {
            this._log(`2 [self@${channelId}] Receives poll Request`);
            if (data.type === 'unchanged') {
                this._log(`∞ [self@${channelId}] l∞∞∞ping!`);
            } else if (data.type === 'response') {
                const messages = data.data;
                const headers = data.headers;
                if (Array.isArray(messages)) {
                    messages.forEach(message => {
                        if (message.actorId === this.user) {
                            this._log(`= [self@${channelId}] ${message.message}`);
                        } else if (message.messageType === 'system') {
                            message.text = this._parseMessage(message);
                            this._log(`§ [${message.actorId}@${channelId}] ${message.text}`);
                            this.emit('system', message);
                        } else if (message.messageType === 'comment') {
                            message.text = this._parseMessage(message);
                            this._log(`< [${message.actorId}@${channelId}] ${message.text}`);

                            /**
                             *
                             * @param {string} text - Text to send
                             * @param {boolean|int} [asReply] - Defaults to true. Sends Text as Reply (with quote)
                             *                                  If int: Sends only if X new messages in between
                             * @returns {fetch}
                             */
                            message.reply = (text, asReply) => {
                                if (message.isReplyable && asReply !== false) {
                                    if (Number.isSafeInteger(asReply)) {
                                        const diff = channel.lastKnownMessageId - message.id;
                                        return this.sendText(text, message.token, diff >= asReply ? message.id : 0);
                                    } else {
                                        return this.sendText(text, message.token, message.id);
                                    }
                                }
                                return this.sendText(text, message.token);
                            };
                            this.emit('message', message);
                        }
                    });
                }
                if (headers && headers.get('x-chat-last-given')) {
                    channel.lastKnownMessageId = +headers.get('x-chat-last-given');
                    this._storeLastIds();
                }
            } else {
                this._log('!', data);
            }
            setTimeout(this._poll.bind(this, channelId), 50);
        }).catch(error => {
            console.error(`! [${channelId}] error`, error);
            setTimeout(this._poll.bind(this, channelId), 1000);
        });
    }
    _request(path, opt = {}) {
        let url = this._buildURL(path);
        if (opt.query) {
            url += (url.includes('?') ? '&' : '?') + querystring.stringify(opt.query);
        }
        let options = {
            method: opt.method || 'GET',
        };
        options.headers = {
            'OCS-APIRequest': 'true',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(this.user + ":" + this.pass).toString('base64'),
        };
        if (opt.method !== 'GET' && opt.body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(opt.body);
        }

        return new Promise((ok, err) => {
            fetch(url, options).then(async (res) => {
                if (res.ok) {
                    const json = await res.json();
                    let data = json.ocs;
                    if (data.meta.status === 'ok') {
                        ok({
                            type: 'response',
                            data: data.data,
                            headers: res.headers
                        });
                    } else {
                        ok({
                            type: 'error',
                            response: json
                        })
                    }
                } else if (res.status === 304) {
                    ok({
                        type: 'unchanged'
                    });
                } else {
                    err('nope!', res);
                }
            })
        });
    }
    __storeLastIds(blocking) {
        let lastIds = {};
        Object.entries(this.channels).forEach(([channelId, channel]) => {
            lastIds[channelId] = channel.lastKnownMessageId;
        });
        const func = blocking === true ? 'writeFileSync' : 'writeFile';
        return fs[func]('lastIds.json', JSON.stringify(lastIds), "utf8", $ => $);
    }
}

module.exports = NextcloudTalkBot;