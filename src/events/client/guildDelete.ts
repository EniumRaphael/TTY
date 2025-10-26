import { Events, EmbedBuilder, Guild, User } from 'discord.js';
import { prisma } from '@lib/prisma';
import { Bot as BotPrisma } from '@prisma/client';
import { log } from '@lib/log';

export default {
	name: Events.GuildDelete,
	async execute(guild: Guild) {
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
			.setTitle(`${guild.client.user.username} leaved a server`)
			.setColor('#cd5c5c')
			.setFooter({
				text: guildData.footer,
			})
			.setDescription(
				`
			Name: ${guild.name}
			Owner id: ${guild.ownerId}
			Member: ${guild.memberCount}
			`,
			)
			.setTimestamp();
		await Promise.all(
			botData.buyers.map(async (buyer: User) => {
				try {
					const user = await guild.client.users.fetch(buyer.id);
					const dm = await user.createDM();
					await dm.send({
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
	},
};
