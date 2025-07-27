import { Events } from 'discord.js'

export default {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`✅ | ${client.user.username} is now running under TTS bot`);
	},
};
