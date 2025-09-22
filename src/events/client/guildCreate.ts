import { Events, EmbedBuilder, Guild, GuildChannel, Invite } from 'discord.js';
import { prisma } from '../../lib/prisma.ts';
import { Bot as BotPrisma } from '@prisma/client';

async function getGuildInvite(guild: Guild): Promise<string> {
	try {
		if (guild.vanityURLCode) {
			return `https://discord.gg/${guild.vanityURLCode}`;
		}
		const channel : GuildChannel = guild.channels.cache
			.filter(
				(ch): ch is GuildChannel =>
					ch.isTextBased() &&
					!!ch.permissionsFor(guild.members.me!)?.has('CreateInstantInvite'),
			)
			.first();
		if (!channel) {
			return 'No invite available';
		}
		const invite: Invite = await channel.createInvite({
			maxAge: 0,
			maxUses: 0,
		});

		return invite.url;
	}
	catch (err) {
		console.warn(`⚠️ Impossible de créer une invitation pour ${guild.id} : ${err}`);
		return 'No invite available';
	}
}

export default {
	name: Events.GuildCreate,
	async execute(guild: Guild) {
		try {
			await prisma.guild.upsert({
				where: {
					id: guild.id,
				},
				update: {},
				create: {
					id: guild.id,
				},
			});

			const members = await guild.members.fetch();
			for (const [memberId] of members) {
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
							guildId: guild.id,
						},
					},
					update: {},
					create: {
						userId: memberId,
						guildId: guild.id,
					},
				});
			}
		}
		catch (err) {
			console.error(
				`\t⚠️ | Cannot get the database connection!\n\t\t(${err}).`,
			);
		}
		const botData: BotPrisma = await prisma.bot.findUnique({
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
		const buyerNotification: EmbedBuilder = new EmbedBuilder()
			.setTitle(`${guild.client.user.username} joined a new server`)
			.setColor('#663399')
			.setDescription(`
			Name: ${guild.name}
			Owner id: ${guild.ownerId}
			Invite: ${guild.vanityURLCode || await getGuildInvite(guild)}
			Member: ${guild.memberCount}
			`)
			.setTimestamp();
		await Promise.all(
			botData.buyers.map(async (buyer) => {
				try {
					const user = await guild.client.users.fetch(buyer.id);
					const dm = await user.createDM();
					await dm.send ({
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
		console.log(
			`✅ | Guild ${guild.name} synchronisée avec ${guild.memberCount} membres.`,
		);
	},
};
