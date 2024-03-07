import * as dotenv from 'dotenv';
import pkg from 'discord.js';
const { Client, Intents } = pkg;
import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    VoiceConnectionStatus,
    NoSubscriberBehavior,
    StreamType,
} from '@discordjs/voice';
import { OpenAI } from 'openai';
import fs, { appendFile } from 'fs';
import path from 'path';

dotenv.config();
let isExit = false;
const speechFile = path.resolve('./speech.mp3');
const client = new Client({
    intents: [
        'Guilds',
        'GuildMembers',
        'GuildMessages',
        'MessageContent',
        'GuildVoiceStates',
    ],
});

client.once('ready', () => {
    console.log('Bot is online');
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member;
    const channel = newState.channel;
    if (newState.member.user.bot) return; // Bỏ qua bot

    if (oldState.channel === null && newState.channel !== null) {
        // Người dùng mới vào kênh giọng nói
        console.log(
            `${member.user.globalName} has joined channel ${channel.name}.`
        );
        const channelId = newState.channel.id;
        const guildId = newState.guild.id;
        const adapterCreator = newState.guild.voiceAdapterCreator;
        await fetchApiConvertTextToSpeech(
            `Chào mừng ${member.user.globalName} đã tham gia ${channel.name}.`
        );
        await playAudio(channelId, guildId, adapterCreator);
    }
});
client.on('messageCreate', async (msg) => {
    if (!msg.author.bot && msg.mentions.has(client.user.id)) {
        if (msg.content.includes('!')) {
            const message = msg.content.slice(msg.content.indexOf('!')).trim();
            if (message === '!exit') {
                isExit = true;
            }
            if (message.slice(message.indexOf('!')).trim()) {
                await fetchApiConvertTextToSpeech(message);
                await playAudio(
                    msg.member.voice.channelId,
                    msg.guild.id,
                    msg.guild.voiceAdapterCreator
                );
            }
        } else {
            await fecthApiGeneralSpeech(msg.content);
            await playAudio(
                msg.member.voice.channelId,
                msg.guild.id,
                msg.guild.voiceAdapterCreator
            );
        }
    }
});
const fecthApiGeneralSpeech = async (content) => {
    const response = await openai.chat.completions
        .create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: content }],
        })
        .catch((e) => console.log(e));

    const mp3 = await openai.audio.speech
        .create({
            model: 'tts-1',
            voice: 'nova',
            input: response.choices[0].message.content,
        })
        .catch((e) => console.log(e));

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);
};
const fetchApiConvertTextToSpeech = async (content) => {
    const mp3 = await openai.audio.speech
        .create({
            model: 'tts-1',
            voice: 'nova',
            input: content,
        })
        .catch((e) => console.log(e));

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);
};
const playAudio = async (channelId, guildId, adapterCreator) => {
    if (!channelId) {
        console.log('User is not in a voice channel');
        return;
    }

    const connection = joinVoiceChannel({
        channelId,
        guildId,
        adapterCreator,
    });

    const player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    const resource = createAudioResource(speechFile, {
        inputType: StreamType.Arbitrary,
    });

    player.play(resource);
    connection.subscribe(player);
    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(
            'The connection has entered the Ready state - ready to play audio!'
        );
    });
    player.on('error', (error) => {
        console.error('Error playing audio:', error);
    });
    if (isExit) {
        connection.destroy();
    }
};
client.login(process.env.TOKEN);
