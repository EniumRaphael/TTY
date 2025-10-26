import { Events, Message } from 'discord.js';
import { prisma } from '@lib/prisma';
import { User as UserPrisma } from '@prisma/client';
import { GuildUser as GuildUserPrisma } from '@prisma/client';

const xpCooldown: Map<string, number> = new Map<string, number>();

function canGainXp(userId: string): boolean {
	const now: number = Date.now();
	const last: number = xpCooldown.get(userId) ?? 0;
	if (now - last < 60_000) {
		return false;
	}
	xpCooldown.set(userId, now);
	return true;
}

export default {
	name: Events.MessageCreate,
	async execute(message: Message) {
		if (message.author.bot || !message.guildId || !canGainXp(message.author.id)) return;
		const Author: UserPrisma | null = await prisma.user.findUnique({
			where: {
				id: message.author.id,
			},
		});
		if (!Author) {
			await prisma.user.create({
				data: {
					id: message.author.id,
				},
			});
		}
		const guildUser: GuildUserPrisma = await prisma.guildUser.upsert({
			where: {
				userId_guildId: {
					userId: message.author.id,
					guildId: message.guildId,
				},
			},
			update: {},
			create: {
				xp: 0,
				level: 0,
				user: {
					connect: {
						id: message.author.id,
					},
				},
				guild: {
					connect: {
						id: message.guildId,
					},
				},
			},
		});
		const gainXp: number = Math.abs(message.content.length - Math.round(Math.random() * 13)) % 7;
		const newXp: number = guildUser.xp + gainXp;
		let newLevel: number = guildUser.level;
		const requiredXp: number = 5 * (newLevel ** 2) + 50 * newLevel + 100;
		if (newXp >= requiredXp) {
			newLevel++;
			await message.channel.send(
				`🎉 | Félicitations <@${message.author.id}>, tu es maintenant niveau **${newLevel}** !`,
			);
		}
		await prisma.guildUser.update({
			where: {
				userId_guildId: {
					userId: message.author.id,
					guildId: message.guildId,
				},
			},
			data: {
				xp: newXp,
				level: newLevel,
			},
		});
	},
};
