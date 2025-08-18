import { Events } from 'discord.js';
import { prisma } from '../../lib/prisma.ts';

export default {
	name: Events.GuildCreate,
	async execute(guild) {
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
			i++;
		}
		console.log(
			`✅ | Guild ${guild.name} synchronisée avec ${members.size} membres.`,
		);
	},
};
