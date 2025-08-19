import { ActivityType, EmbedBuilder, PresenceUpdateStatus, Events } from 'discord.js';
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
				include: {
					buyers: {
						select: {
							id: true,
						},
					},
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
			const buyerNotification: EmbedBuilder = new EmbedBuilder()
				.setTitle(`${client.user.username} running`)
				.setColor('#008000')
				.setDescription(`
					**On:** ${client.guilds.cache.size} guild${client.guilds.cache.size > 1 ? 's' : ''}
					**With:** ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} users
				`)
				.setTimestamp();

			await Promise.all(
				botData.buyers.map(async (buyer) => {
					try {
						const user = await client.users.fetch(buyer.id);
						const dm = await user.createDM();
						const messages = await dm.messages.fetch({
							limit: 20,
						});
						const lastBotMsg = messages.find(m => m.author.id === client.user!.id);
						if (!lastBotMsg) {
							await lastBotMsg.edit({
								content: 'This message is will be updated',
								embeds: [
									buyerNotification,
								],
							});
						}
						await lastBotMsg.edit({
							content: '',
							embeds: [
								buyerNotification,
							],
						});
						await new Promise(res => setTimeout(res, 1000));
					}
					catch (err) {
						console.warn(`⚠️ | ${buyer.id} : ${err}`);
						return;
					}
				}),
			);
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
