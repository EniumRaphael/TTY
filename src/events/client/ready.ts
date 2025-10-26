import {
	ActivityType,
	EmbedBuilder,
	PresenceUpdateStatus,
	Events,
	User,
	Message,
	DMChannel,
	Collection,
} from 'discord.js';
import { prisma } from '@lib/prisma';
import { Bot as BotPrisma } from '@prisma/client';
import { log } from '@lib/log';

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client: User) {
		try {
			const botData: BotPrisma | null = await prisma.bot.upsert({
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
				update: {},
				create: {
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
			case 'stream':
				newType = ActivityType.Streaming;
				break;
			case 'comptet':
				newType = ActivityType.Competing;
				break;
			default:
				newType = ActivityType.Watching;
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
				.setDescription(
					`
					**On:** ${client.guilds.cache.size} guild${client.guilds.cache.size > 1 ? 's' : ''}
					**With:** ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} users
				`,
				)
				.setTimestamp();

			await Promise.all(
				botData.buyers.map(async (buyer: User) => {
					try {
						const user = await client.client.users.fetch(buyer.id);
						const dm: DMChannel = await user.createDM();
						const messages: Collection<string, Message<boolean>> = await dm.messages.fetch({
							limit: 20,
						});
						const lastBotMsg: Message<boolean> | undefined = messages.find(
							(m: Message): boolean => m.author.id === client.client.user!.id,
						);
						if (!lastBotMsg) {
							await lastBotMsg.edit({
								content: 'This message is will be updated',
								embeds: [buyerNotification],
							});
						}
						await lastBotMsg.edit({
							content: '',
							embeds: [buyerNotification],
						});
						await new Promise((res) => setTimeout(res, 1000));
					}
					catch (err) {
						log.warn(err, `Not able to fetch user ${buyer.id}`);
						return;
					}
				}),
			);
		}
		catch (err) {
			log.error(err, 'Cannot get the database connection');
			return;
		}
		log.search('Guild');
		for (const [guildId, guild] of client.guilds.cache) {
			try {
				await prisma.guild.upsert({
					where: {
						id: guildId,
					},
					update: {},
					create: {
						id: guildId,
					},
				});
				log.list(1, guild.name);
				const members = await guild.members.fetch();
				for (const [memberId, member] of members) {
					await prisma.user.upsert({
						where: {
							id: memberId,
						},
						update: {},
						create: {
							id: memberId,
						},
					});
					await prisma.guildUser.upsert({
						where: {
							userId_guildId: {
								userId: memberId,
								guildId: guildId,
							},
						},
						update: {},
						create: {
							user: {
								connect:
								{
									id: memberId,
								},
							},
							guild: {
								connect: {
									id: guildId,
								},
							},
						},
					});
					log.list(2, `${member.user.username} (${memberId})`);
				}
			}
			catch (err) {
				log.error(err, `Error when loading the guild with id: ${guildId}`);
			}
		}
		console.log('\n\n');
		log.success(`${client.user.username} is now running under TTS bot`);
	},
};
