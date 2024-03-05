require('dotenv/config');
const { Client } = require('discord.js');
const { OpenAI } = require('openai');
const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'],
});
client.on('ready', async () => {
    await console.log('Bot is online');
});
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});
client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;
    const response = await openai.chat.completions
        .create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'user',
                    content: msg.content,
                },
            ],
        })
        .catch((e) => console.log(e));
    msg.reply(response.choices[0].message.content);
});
client.login(process.env.TOKEN);
