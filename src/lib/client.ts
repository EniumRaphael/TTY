import { Client, GatewayIntentBits } from 'discord.js';

export const client: Client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.AutoModerationConfiguration,
		GatewayIntentBits.AutoModerationExecution,
	],
});
