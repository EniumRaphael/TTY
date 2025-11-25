import { Channel, EmbedBuilder, Events, GuildMember } from 'discord.js';
import { Guild as GuildPrisma } from '@prisma/client';
import { prisma } from '@lib/prisma';
import { placeholder } from '@lib/placeholder';

export default {
	name: Events.GuildMemberAdd,
	async execute(member: GuildMember) {
		const memberId: string = member.id;
		const guildId: string = member.guild.id;
		const guildData: GuildPrisma = await prisma.guild.findUnique({
			where: {
				id: guildId,
			},
		});
		if (guildData.joinEnabled) {
			const fetchedChannel: Channel | null = await member.client.channels.fetch(guildData.joinChannel as string);
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
			const fetchedChannel: Channel | null = await member.client.channels.fetch(guildData.logMember as string);
			if (fetchedChannel) {
				fetchedChannel.send({
					embeds: [toSend],
				});
			}
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
	},
};
