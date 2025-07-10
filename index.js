require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

(async () => {
    const {
        TOKEN,
        CHANNEL_ID
    } = process.env;
    if (!TOKEN || !CHANNEL_ID) return console.error('Missing credentials');

    const FILE = path.join(__dirname, 'seen_versions.json'),
        LANGS = ['fr-fr', 'en-us'],
        CONS = ['ps4', 'ps5'];
    const client = new Client({
        intents: Object.values(GatewayIntentBits),
    });
    await client.login(TOKEN);
    const chan = await client.channels.fetch(CHANNEL_ID);
    if (!chan) return console.error('Channel not found');

    let seen = {};
    try {
        seen = JSON.parse(await fs.readFile(FILE, 'utf8'));
    } catch {
        for (const c of CONS) seen[c] = [];
    }

    const check = async name => {
        for (const lang of LANGS) try {
            const html = (await axios.get(`https://www.playstation.com/${lang}/support/hardware/${name}/system-software-info/`)).data;
            const match = cheerio.load(html)('body').text().match(/Version\s*[:\-]\s*([\d.]+)/i);
            const ver = match && match[1];
            if (ver && !seen[name].includes(ver)) {
                await chan.send({
                    embeds: [new EmbedBuilder()
                        .setTitle(`Update: ${name.toUpperCase()}`)
                        .setDescription([
                            `🆕 **New Version**: ${ver}`,
                            `📼 **Previous Version**: ${seen[name].at(-1) || 'N/A'}`,
                            `📅 **Date**: <t:${Math.floor(Date.now() / 1000)}:F>`,
                            `🔔 **Console**: ${name.toUpperCase()} firmware updated!`
                        ].join('\n'))
                        .setColor('#0066FF')
                        .setFooter({
                            text: 'Firmware Watcher Bot'
                        })
                        .setTimestamp()
                    ]
                });
                seen[name].push(ver);
                await fs.writeFile(FILE, JSON.stringify(seen, null, 2));
                console.log(`${name}: ${ver} posted`);
                return;
            } else if (ver) return console.log(`${name}: no change (${ver})`);
        } catch (e) {
            console.log(`${name}@${lang} error: ${e.message}`);
        }
        console.error(`${name}: failed`);
    };

    CONS.forEach(check);
    setInterval(() => CONS.forEach(check), 30000);
})();