import {
	Channel,
	Collection,
	EmbedBuilder,
	Events,
	Guild,
	GuildMember,
	Invite,
	User,
} from 'discord.js';
import { Guild as GuildPrisma } from '@prisma/client';
import { prisma } from '@lib/prisma';
import { invitesCache } from '@lib/invite';
import { placeholder } from '@lib/placeholder';

export default {
	name: Events.GuildMemberAdd,
	async execute(member: GuildMember) {
		const memberId: string = member.id;
		const guild: Guild = member.guild;
		const guildId: string = guild.id;
		const guildData: GuildPrisma = await prisma.guild.findUnique({
			where: {
				id: guildId,
			},
		});
		if (guildData.joinEnabled) {
			const fetchedChannel: Channel | null = await member.client.channels.fetch(
        guildData.joinChannel as string,
			);
			if (fetchedChannel) {
				fetchedChannel.send({
					content: placeholder(guildData.joinMessage, member),
				});
			}
		}
		if (guildData.logMember) {
			const toSend: EmbedBuilder = new EmbedBuilder()
				.setTitle('🛬 | Member just joined')
				.setAuthor({
					name: `${member.user.username} (${member.user.id})`,
					iconURL: member.displayAvatarURL({
						size: 2048,
						extension: 'png',
					}),
				})
				.setColor(guildData.color)
				.setFooter({
					text: guildData.footer,
				})
				.setTimestamp()
				.setDescription(`
					**Acount Creation:**
					<t:${Math.floor(member.user.createdTimestamp / 1000)}:D> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)
					**JoinDate:**
					<t:${Math.floor(member.joinedTimestamp / 1000)}:D> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)
				`);
			const fetchedChannel: Channel | null = await member.client.channels.fetch(
        guildData.logMember as string,
			);
			if (fetchedChannel) {
				fetchedChannel.send({
					embeds: [toSend],
				});
			}
		}
		const previousInvites: Collection<string, Invite> | undefined =
      invitesCache.get(guildId);
		const newInvites: Collection<string, Invite> = await guild.invites.fetch();
		invitesCache.set(guild.id, newInvites);
		const usedInvite: Invite | undefined = previousInvites
			? newInvites.find((invite: Invite): boolean => {
				const oldUses: number = previousInvites.get(invite.code)?.uses ?? 0;
				return (invite.uses ?? 0) > oldUses;
			})
			: undefined;
		const inviter: User | null = usedInvite?.inviter ?? null;
		if (inviter && inviter.id !== memberId) {
			await prisma.guildUser.upsert({
				where: {
					userId_guildId: {
						userId: inviter.id,
						guildId: guildId,
					},
				},
				update: {
					invitationCount: {
						increment: 1,
					},
				},
				create: {
					invitationCount: 1,
					user: {
						connect: {
							id: inviter.id,
						},
					},
					guild: {
						connect: {
							id: guildId,
						},
					},
				},
			});
		}
		await prisma.user.upsert({
			where: {
				id: memberId,
			},
			update: {},
			create: {
				id: memberId,
			},
		});
		const invitedByUpdate = inviter ? { invitedBy: inviter.id } : {};
		await prisma.guildUser.upsert({
			where: {
				userId_guildId: {
					userId: memberId,
					guildId: guildId,
				},
			},
			update: invitedByUpdate,
			create: {
				invitedBy: inviter?.id ?? null,
				user: {
					connect: {
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
	},
};
