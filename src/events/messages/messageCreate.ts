import { Events, Message } from 'discord.js';
import { prisma } from '../../lib/prisma.ts';
import { User as UserPrisma } from '@prisma/client';

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
		const Author: UserPrisma = await prisma.user.findUnique({
			where: { id: message.author.id },
		});
		if (!Author) {
			await prisma.user.create({
				data: {
					id: message.author.id,
				},
			});
		}
		let guildUser = await prisma.guildUser.findUnique({
			where: {
				userId_guildId: {
					userId: message.author.id,
					guildId: message.guildId,
				},
			},
		});
		if (!guildUser) {
			guildUser = await prisma.guildUser.create({
				data: {
					userId: message.author.id,
					guildId: message.guildId,
					xp: 0,
					level: 0,
				},
			});
		}
		const gainXp: number = Math.abs(message.content.length - Math.round(Math.random() * 13)) % 7;
		const newXp: number = guildUser.xp + gainXp;
		let newLevel: number = guildUser.level;
		const requiredXp: number = 5 * (newLevel ** 2) + 50 * newLevel + 100;
		if (newXp >= requiredXp) {
			newLevel++;
			await message.channel.send(
				`🎉 Félicitations ${message.author}, tu es maintenant niveau **${newLevel}** !`,
			);
		}
		console.log(`${message.author.username} | ${newLevel} -> ${newXp} [${requiredXp}]`);
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
