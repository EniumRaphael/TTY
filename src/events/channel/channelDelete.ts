import { Events, AuditLogEvent, TextChannel, EmbedBuilder, Channel } from 'discord.js';
import { prisma } from '../../lib/prisma';
import { Guild as GuildPrisma } from '@prisma/client';
import { isWhitelisted } from '@lib/perm';

export default {
	name: Events.ChannelDelete,
	async execute(channel: Channel) {
		if (!channel.guild) return;
		try {
			const auditLogs = await channel.guild.fetchAuditLogs({
				type: AuditLogEvent.ChannelDelete,
				limit: 1,
			});
			const entry = auditLogs.entries.first();
			if (!entry) return;
			const executor = entry.executor;
			if (!executor) return;
			const guildData: GuildPrisma = await prisma.guild.findUnique({
				where: {
					id: channel.guild.id,
				},
			});
			if (!(await isWhitelisted(executor.id, channel.guild.id))) {
				const member = await channel.guild.members.fetch(executor.id).catch(() => null);
				if (member) {
					const rolesToRemove = member.roles.cache.filter(r => r.id !== channel.guild.id);
					for (const [id] of rolesToRemove) {
						await member.roles.remove(id, 'Unauthorized channel deletion [TTY AntiRaid]');
					}
				}
				channel.clone().then((newchannel) => {
					newchannel.setPosition(channel.position);
				});
				if (guildData.logMod) {
					const logChannel = await channel.guild.channels.fetch(guildData.logMod).catch(() => null);
					if (logChannel instanceof TextChannel) {
						const embed = new EmbedBuilder()
							.setTitle('⚠️ | Anti-Channel Protection')
							.setDescription(
								`**${channel.name}** deleted by <@${executor.id}> is now **recreated**.\n__Sanction:__ Unranked.`,
							)
							.setColor(guildData.color)
							.setTimestamp()
							.setFooter({
								text: guildData.footer,
							});
						await (logChannel).send({
							embeds: [embed],
						});
					}
				}
				return;
			}
			if (guildData.logChannels) {
				const logChannel = await channel.guild.channels.fetch(guildData.logChannel).catch(() => null);
				if (logChannel instanceof TextChannel) {
					const embed = new EmbedBuilder()
						.setTitle('🗑️ | Channel Deleted')
						.setDescription(`A channel was deleted by <@${executor.id}>.`)
						.setColor(guildData.color)
						.setTimestamp()
						.setFooter({
							text: guildData.footer,
						});
					await (logChannel).send({
						embeds: [embed],
					});
				}
			}
		}
		catch (err) {
			console.error(`⚠️ | ChannelDelete protection error: ${err as Error}`);
		}
	},
};
