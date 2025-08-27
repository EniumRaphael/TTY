import { prisma } from '../lib/prisma.ts';

/**
 * @param userId - Discord identifier for the user
 * @param guildId - Discord identifier for the guild
 * @returns true if the user is whitelisted flase overwise
 */
export async function isWhitelisted(userId: string, guildId: string): Promise<boolean> {
	const userData: User = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	});
	const count: interger = await prisma.user.count({
		where: {
			id: userId,
			WhitelistedGuilds: {
				some: {
					id: guildId,
				},
			},
		},
	});
	return (userData.isOwner || userData.isBuyer || count);
}
