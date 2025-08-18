import { ActivityType, PresenceUpdateStatus, Events } from 'discord.js';
import { prisma } from '../../lib/prisma.ts';

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		try {
			const botData: Bot = await prisma.bot.findUnique({
				where: {
					id: 1,
				},
			});
			const newStatus: string = botData.status;
			const tmpType: string = botData.type;
			let newType: ActivityType;
			switch (tmpType) {
			case 'play':
				newType = ActivityType.Playing;
				break;
			case 'listen':
				newType = ActivityType.Listening;
				break;
			case 'watch':
				newType = ActivityType.Watching;
				break;
			case 'stream':
				newType = ActivityType.Streaming;
				break;
			case 'comptet':
				newType = ActivityType.Competing;
				break;
			}
			const tmpPresence: string = botData.presence;
			let newPresence: PresenceUpdateStatus;
			switch (tmpPresence) {
			case 'online':
				newPresence = PresenceUpdateStatus.Online;
				break;
			case 'idle':
				newPresence = PresenceUpdateStatus.Idle;
				break;
			case 'dnd':
				newPresence = PresenceUpdateStatus.DoNotDisturb;
				break;
			case 'invisible':
				newPresence = PresenceUpdateStatus.Invisible;
				break;
			}
			if (botData.type === 'steam') {
				client.user.setPresence({
					status: newPresence,
					activities: [
						{
							name: newStatus,
							type: newType,
							url: 'https://twich.tv/EniumRaphael',
						},
					],
				});
			}
			else {
				client.user.setPresence({
					status: newPresence,
					activities: [
						{
							name: newStatus,
							type: newType,
						},
					],
				});
			}
		}
		catch (err) {
			console.error(
				`\t⚠️ | Cannot get the database connection!\n\t\t(${err}).`,
			);
			return;
		}
		console.log(`✅ | ${client.user.username} is now running under TTS bot`);
	},
};
