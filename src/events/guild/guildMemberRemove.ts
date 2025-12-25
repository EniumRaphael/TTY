import { Channel, EmbedBuilder, Events, GuildMember } from 'discord.js';
import {
	GuildUser as GuildUserPrisma,
	Guild as GuildPrisma,
} from '@prisma/client';
import { prisma } from '@lib/prisma';
import { placeholder } from '@lib/placeholder';
import { getUserRoles } from '@lib/roles.js';
import { client } from '@lib/client.js';

export default {
	name: Events.GuildMemberRemove,
	async execute(member: GuildMember) {
		if (member.id === client.user.id) {
			return;
		}
		const memberId: string = member.id;
		const guildId: string = member.guild.id;
		const guildData: GuildPrisma = await prisma.guild.findUnique({
			where: {
				id: guildId,
			},
		});
		if (guildData.leaveEnabled) {
			const fetchedChannel: Channel | null = await member.client.channels.fetch(
        guildData.leaveChannel as string,
			);
			if (fetchedChannel) {
				fetchedChannel.send({
					content: placeholder(guildData.leaveMessage, member),
				});
			}
		}
		if (guildData.logMember) {
			const toSend: EmbedBuilder = new EmbedBuilder()
				.setTitle('🛫 | Member just left')
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
			**Roles:**
			${getUserRoles(member)}

			**Acount Creation:**
			<t:${Math.floor(member.user.createdTimestamp / 1000)}:D> <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>
			**JoinDate:**
			<t:${Math.floor(member.joinedTimestamp / 1000)}:D> <t:${Math.floor(member.joinedTimestamp / 1000)}:R>
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
		const guildUserData: GuildUserPrisma | null =
      await prisma.guildUser.findUnique({
      	where: {
      		userId_guildId: {
      			userId: memberId,
      			guildId: guildId,
      		},
      	},
      });
		const inviterId: string | null = guildUserData?.invitedBy ?? null;
		if (inviterId && inviterId !== memberId) {
			await prisma.guildUser.upsert({
				where: {
					userId_guildId: {
						userId: inviterId,
						guildId: guildId,
					},
				},
				update: {
					invitationCount: {
						decrement: 1,
					},
				},
				create: {
					user: {
						connect: {
							id: inviterId,
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
		await prisma.guildUser.upsert({
			where: {
				userId_guildId: {
					userId: memberId,
					guildId: guildId,
				},
			},
			update: {
				invitedBy: null,
			},
			create: {
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
