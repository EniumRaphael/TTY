import { REST, Routes } from 'discord.js';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

const commands = [];

const foldersPath = path.join(__dirname, '../commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
	for (const file of commandFiles) {
		const filesPath = path.join(commandsPath, file);
		const commandModule = await import(filesPath);
		const command = commandModule.default || commandModule;
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		}
		else {
			console.log(
				'⚠️ | A Command is missing a required "data" or "execute" property.',
			);
		}
	}
}

const rest = new REST().setToken(process.env.DSC_TOKEN);

(async () => {
	try {
		console.log(`🔍 | ${commands.length} commands found.`);
		const data = await rest.put(
			Routes.applicationCommands(process.env.CLIENT_ID),
			{
				body: commands,
			},
		);
		console.log(`✅ | ${data.length} is now reloaded`);
	}
	catch (error) {
		console.error(error);
	}
})();
