require('dotenv/config');
const { Client } = require('discord.js');
const { OpenAI } = require('openai');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000; // Sử dụng cổng mặc định 10000 hoặc cổng được cung cấp bởi môi trường

app.get('/', (req, res) => {
    res.send('Server is running!');
});

app.listen(PORT, '0.0.0.0', () => {
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
        if (!msg.author.bot && msg.mentions.has(client.user.id)) {
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
        }
    });
    client.login(process.env.TOKEN);
});
