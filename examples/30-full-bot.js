const Nextcloudbot = require('../src/nextcloud-talk-bot');

const bot = new Nextcloudbot({
    debug: true,
    autoJoin: true,
});

// Simple usage; reacts to all channels the bot joined
bot.onText('Somebody in?', x => x.reply('Sure, because you are!'));

// Join a channel and react to its contents
const boppy = bot.getChannel('dy3ennzq');

// Reaction bases on RegExp (simple)
boppy.onText(/^#echo /, msg => msg.reply(msg.text.substr(6), false));

// Reaction based on RegExp (anvanced)
boppy.onText(/^#answer ((['"])(?<q1>.*?)(\2)|(?<q2>[^"']\S*)) (?<a>.*)$/, (msg, q1, q2, a) => {
    bot.onText(q1 || q2, (message) => {
        message.reply(a, false);
        msg.reply(`Answered to @${message.actorId} in #${message.token}`);
    });
});

// Let your bot execute binaries on your system... That's totally stupid. But working... ¯\_(ツ)_/¯
const {exec: execAsyc} = require('child_process');
boppy.onText(/^#exec (?<exec>.*)$/, (msg, exec) => {
    execAsyc(exec, (err, ret) => msg.reply(ret, 1));
});

boppy.onText('uptime', (msg) => {
    execAsyc('uptime', (err, ret) => msg.reply(ret, 1));
});


// Post a reply delayed by a number of seconds (like a countdown/timer/reminder)
boppy.onText(/^#timer (?<sec>\d+|(\d+[smh])+) (?<message>.*)$/, (msg, sec, message) => {
    if (isNaN(+sec)) {
        sec = sec.match(/\d+[smh]/g).map((nunit) => {
            let n = +nunit.substr(0, nunit.length - 1);
            const unit = nunit.substr(-1);
            switch (unit) {
                case 'h':
                    n *= 60;
                case 'm':
                    n *= 60;
                default:
                    n *= 1;
            }
            return parseInt(n);
        }).reduce((a, b) => a + b, 0);
    }
    msg.reply(`Resending message "${message}" in ${sec} seconds.`, false);
    setTimeout(() => msg.reply(message, 2), sec * 1000);
});

// Lets you quit your bot by command.
let allowToDie = false;
boppy.onText('#die', msg => {
    if (allowToDie) {
        bot._log('X [self] Dieing now...');
        msg.reply("ok... See you soon(ly)").then(() => {
            bot._storeLastIds(true);
            process.exit();
        });
    } else {
        bot._log('x [self] Dieing request received');
        msg.reply("o'rly? Then type #die again.");
    }
    allowToDie = true;
});


const htmlDecode = require('js-htmlencode').htmlDecode;
const querystring = require('querystring');
const fetch = require('node-fetch');
boppy.onText(/^#wiki(?: (?<language>|fr|de|es|ja|ru|it|zh|pt|ar|fa|pl|nl|id|uk|he|sv|cs|ko|vi|ca|no|fi|hu|th|el|hi|bn|ceb|tr|ro|sw|kk|da|eo|sr|lt|sk|bg|min|sl|eu|et|hr|te|nn|gl|simple|ms|bs|ka|is|sq|la|az|mk|mr|sh|af|tl|cy|lv|ta|jv|be|ast|zh-yue|ur|ga|hy|kn|ml|ne|uz|pa|my|arz|ckb|war|vo|lmo|new|ht|bpy|lb|br|tg|io|pms|su|oc|nap|nds|scn|sa|ku|wa|bar|an|ksh|szl|fy|frr|als|ia|yi|mg|km|ce|roa-tara|am|roa-rup|map-bms|bh|bcl|co|cv|dv|nds-nl|fo|fur|gan|glk|gu|ilo|pam|csb|lij|li|gv|mi|mt|nah|nrm|se|gd|nov|qu|os|pag|ps|pdc|rm|bat-smg|sco|sc|si|tt|tk|hsb|vec|fiu-vro|wuu|vls|yo|diq|zh-min-nan|zh-classical|frp|lad|kw|mn|haw|ang|ln|ie|wo|tpi|ty|crh|nv|jbo|ay|zea|eml|ky|ig|or|cbk-zam|kg|arc|rmy|ab|gn|so|kab|ug|stq|udm|ext|mzn|pap|cu|sah|tet|sd|pcd|as|sn|lo|ba|pnb|na|got|bo|dsb|chr|cdo|hak|om|sm|ee|ti|av|zu|pnt|cr|pih|ss|bi|rw|ch|xh|kl|bug|ts|tn|kv|tum|xal|st|tw|bxr|ak|lbe|za|ff|lg|ha|sg|rn|mwl|xmf|lez|bjn|mai|gom|lrc|tyv|vep|nso|kbd|ltg|rue|pfl|gag|koi|mrj|mhr|krc|ace|hif|olo|kaa|mdf|myv|azb|ady|jam|tcy|dty|atj|kbp|din|lfn|gor|inh|sat|ban|be-x-old|pi|to|ks|iu|bm|ve|ik|dz|ny|fj|ki|chy|srn))? (?<query>.*)$/, (msg, lang, query) => {
    const domain = 'https://' + (lang ? lang : 'en') + '.wikipedia.org/';
    const parms = {
        action: 'query',
        format: 'json',
        list: 'search',
        srlimit: 3,
        srsearch: query,
        srprop: 'snippet'
    };
    const uri = domain + 'w/api.php?' + querystring.stringify(parms);
    fetch(uri)
        .then(res => res.json())
        .then(json => {
            const res = json.query.search.map(res => {
                return [
                    `[${res.title}](${domain}wiki/${escape(res.title)})`,
                    htmlDecode(res.snippet.replace(/<.*?>/g, ''))
                ].join("\n");
            });
            msg.reply(`Found ${json.query.searchinfo.totalhits} hits on wikipedia.org. First 3:\n* ` + res.join(`\n* `));
        }).catch(e => {
        msg.reply(`¯\\_(ツ)_/¯ ${e.message}`);
    })
    ;
});


// Let your bot calc the sh*t out of your input. I can also do unit conversion and stuff...
//   see https://www.npmjs.com/package/mathjs
//
// simple things like
//   #calc 42-13/37+42
//   #calc 12.7 cm to inch

// variables and functions
//   #calc nine = 20 - 1
//   #calc nine = nine - 10
//   #calc myexp(x, y) = x^y
//   #calc myexp(nine, 2)

// Math mode. Lines beginning with | will not reply, starting with # exits mathmode
//   #mathmode
//   |x = 8^2
//   x-4
//   x-nine

// Important Note:
// In this implementation ALL channels share ONE instance of the mathjs library (${parser})!
// This will also share symbols, variables and functions!

const math = require('mathjs');
const parser = math.parser();

boppy.onText(/^#calc (?<calc>.*)$/, (msg, calc) => {
    let res;
    try {
        res = parser.evaluate(calc) + "";
        if (res.substr(0, 9) === 'function ') {
            res = '[CALC] function ' + calc.substr(0, msg.text.indexOf('(') - 1);
        }
    } catch (e) {
        res = "[CALC] ¯\\_(ツ)_/¯  " + e.message;
    }
    msg.reply(res);
});


let inMathMode = false;
boppy.onText(/^(?<hash>#)?(?<pipe>\|)?(?<calc>.*)$/, (msg, hash, pipe, calc) => {
    if (hash) {
        if (inMathMode) {
            msg.reply('[MATHMODE] exiting Math Mode', false);
            inMathMode = false;
        } else if (msg.text === '#mathmode') {
            msg.reply('[MATHMODE] entering Math Mode', false);
            inMathMode = true;
        } else {
            inMathMode = false;
        }
        return;
    }
    if (!inMathMode) return;
    let res;
    try {
        res = parser.evaluate(calc) + "";
        if (res.substr(0, 9) === 'function ') {
            res = '[MATHMODE] function ' + calc.substr(0, msg.text.indexOf('(') - 1);
        }
    } catch (e) {
        res = "[MATHMODE] ¯\\_(ツ)_/¯  " + e.message;
        pipe = false;
    }
    pipe || msg.reply(res, false);
});

bot.startPolling();

/*
Exampel messages
Message {
  id: 30,
  token: 'dy3ennzq',
  actorType: 'users',
  actorId: 'bopp',
  actorDisplayName: 'Henning Bopp',
  timestamp: 1582576875,
  message: 'hallu?',
  messageParameters: [],
  systemMessage: '',
  messageType: 'comment',
  isReplyable: true
}
  id: 29,
  token: 'dy3ennzq',
  actorType: 'users',
  actorId: 'bopp',
  actorDisplayName: 'Henning Bopp',
  timestamp: 1582576869,
  message: '{actor} created the conversation',
  messageParameters: { actor: { type: 'user', id: 'bopp', name: 'Henning Bopp' } },
  systemMessage: 'conversation_created',
  messageType: 'system',
  isReplyable: false

 */