import {
	Events,
	AuditLogEvent,
	TextChannel,
	EmbedBuilder,
	Channel,
} from 'discord.js';
import { prisma } from '../../lib/prisma';
import { Guild as GuildPrisma } from '@prisma/client';
import { isWhitelisted } from '@lib/perm';
import { log } from '@lib/log';

export default {
	name: Events.ChannelCreate,
	async execute(channel: Channel) {
		if (!channel.guild) return;
		try {
			const auditLogs = await channel.guild.fetchAuditLogs({
				type: AuditLogEvent.ChannelCreate,
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
				await channel.delete(
					`Unauthorized channel creation by ${executor.tag}`,
				);
				const member = await channel.guild.members
					.fetch(executor.id)
					.catch(() => null);
				if (member) {
					const rolesToRemove = member.roles.cache.filter(
						(r) => r.id !== channel.guild.id,
					);
					for (const [id] of rolesToRemove) {
						await member.roles.remove(
							id,
							'Unauthorized channel creation [TTY AntiRaid]',
						);
					}
				}
				if (guildData.logMod) {
					const logChannel = await channel.guild.channels
						.fetch(guildData.logMod)
						.catch(() => null);
					if (logChannel?.isTextBased()) {
						const embed = new EmbedBuilder()
							.setTitle('⚠️ | Anti-Channel Protection')
							.setDescription(
								`**${channel.name}** created by <@${executor.id}> is now **deleted**.\n__Sanction:__ Unranked.`,
							)
							.setColor(guildData.color)
							.setTimestamp()
							.setFooter({
								text: guildData.footer,
							});
						await (logChannel as TextChannel).send({
							embeds: [embed],
						});
					}
				}
				return;
			}
			if (guildData.logChannel) {
				const logChannel = await channel.guild.channels
					.fetch(guildData.logChannel)
					.catch(() => null);
				if (logChannel?.isTextBased()) {
					const embed = new EmbedBuilder()
						.setTitle('📢 Channel Created')
						.setDescription(
							`Channel **${channel.name}** has been created by <@${executor.id}>.`,
						)
						.setColor(guildData.color)
						.setTimestamp()
						.setFooter({
							text: guildData.footer,
						});
					await (logChannel as TextChannel).send({
						embeds: [embed],
					});
				}
			}
		}
		catch (err) {
			log.error(err, 'ChannelCreate protection error');
		}
	},
};
