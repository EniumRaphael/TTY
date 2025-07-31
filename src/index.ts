import fs from 'node:fs'
import path from 'node:path'
import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { deployCommands } from './internal/deploy-commands.ts';

const prisma = new PrismaClient();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});

client.login(process.env.DSC_TOKEN);

client.commands = new Collection();

const commandFolderPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandFolderPath);

console.log(`\n🔍 | Commands search:`)
for (const folder of commandFolders) {
	const commandsPath = path.join(commandFolderPath, folder);
	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter(file => file.endsWith('.js') || file.endsWith('.ts'));
	for (const file of commandFiles) {
		const fullCommandPath = path.join(commandsPath, file);
		try {
			const commandModule = await import(fullCommandPath);
			const command = commandModule.default || commandModule;
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
				console.log(`\t✅ | ${command.data.name}`);
			}
		} catch (err) {
			console.error(`\t⚠️ | Command at ${file}\n\t\t(${err}).`);
		}
	}
}
console.log('\n\n');

const eventFolderPath = path.join(__dirname, 'events');
const eventFolders = fs.readdirSync(eventFolderPath);

console.log(`\n🔍 | Events search:`)
for (const folder of eventFolders) {
	const eventsPath = path.join(eventFolderPath, folder);
	const eventFiles = fs
		.readdirSync(eventsPath)
		.filter(file => file.endsWith('.js') || file.endsWith('.ts'));
	for (const file of eventFiles) {
		const fullEventPath = path.join(eventsPath, file);
		try {
			const eventModule = await import(fullEventPath);
			const event = eventModule.default || eventModule;
			if ('name' in event && 'execute' in event) {
				if (event.once) {
					client.once(event.name, (...args) => event.execute(...args));
				} else {
					client.on(event.name, (...args) => event.execute(...args));
				}
				console.log(`\t✅ | ${event.name}`);
			}
		} catch (err) {
			console.error(`\t⚠️ | Event at ${file}\n\t\t(${err}).`);
		}
	}
}
console.log('\n\n');

client.once('ready', async () => {
	console.log(`🤖 | Connecté en tant que ${client.user?.tag}`);

	await prisma.bot.upsert({
		where: {
			id: 1
		},
		update: {},
		create: {}
	});
	for (const [guildId, guild] of client.guilds.cache) {
		await prisma.guild.upsert({
			where: {
				id: guildId
			},
			update: {},
			create: {
				id: guildId
			}
		});

		const members = await guild.members.fetch();

		for (const [memberId, member] of members) {
			await prisma.user.upsert({
				where: {
					id: memberId
				},
				update: {},
				create: {
					id: memberId
				}
			});

			await prisma.guildUser.upsert({
				where: {
					userId_guildId: {
						userId: memberId,
						guildId: guildId
					}
				},
				update: {},
				create: {
					userId: memberId,
					guildId: guildId
				}
			});
		}

		console.log(`✅ | Guild ${guild.name} synchronisée avec ${members.size} membres.`);
	}
});
