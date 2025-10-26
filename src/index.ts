import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import {
	Client,
	Collection,
	GatewayIntentBits,
	REST,
	Routes,
} from 'discord.js';
import { log } from '@lib/log';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});

client.commands = new Collection();

const commandFolderPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandFolderPath);

const commands = [];

log.search('Commands');
for (const folder of commandFolders) {
	const commandsPath = path.join(commandFolderPath, folder);
	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter((file) => file.endsWith('.js') || file.endsWith('.ts'));
	for (const file of commandFiles) {
		const fullCommandPath = path.join(commandsPath, file);
		try {
			const commandModule = await import(fullCommandPath);
			const command = commandModule.default || commandModule;
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
				commands.push(command.data.toJSON());
				log.list(command.data.name);
			}
		}
		catch (err) {
			log.error(err, `Command at ${file}`);
		}
	}
}
console.log('\n\n');

const eventFolderPath = path.join(__dirname, 'events');
const eventFolders = fs.readdirSync(eventFolderPath);

log.search('Events');
for (const folder of eventFolders) {
	const eventsPath = path.join(eventFolderPath, folder);
	const eventFiles = fs
		.readdirSync(eventsPath)
		.filter((file) => file.endsWith('.js') || file.endsWith('.ts'));
	for (const file of eventFiles) {
		const fullEventPath = path.join(eventsPath, file);
		try {
			const eventModule = await import(fullEventPath);
			const event = eventModule.default || eventModule;
			if ('name' in event && 'execute' in event) {
				if (event.once) {
					client.once(event.name, (...args) => event.execute(...args));
				}
				else {
					client.on(event.name, (...args) => event.execute(...args));
				}
				log.list(event.name);
			}
		}
		catch (err) {
			log.error(err, `Event at ${file}`);
		}
	}
}
console.log('\n\n');

try {
	const rest = new REST().setToken(process.env.DSC_TOKEN!);
	const data = await rest.put(
		Routes.applicationCommands(process.env.CLIENT_ID!),
		{ body: commands },
	);
	log.success(`${data.length} commands globally deployed`);
}
catch (err) {
	log.error(err, 'Error when loading command');
}
await client.login(process.env.DSC_TOKEN);
