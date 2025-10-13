import {
	Events,
	AuditLogEvent,
	TextChannel,
	EmbedBuilder,
	Channel,
	GuildChannel,
} from 'discord.js';
import { prisma } from '../../lib/prisma';
import { Guild as GuildPrisma } from '@prisma/client';
import { getCorrectMention } from '../../lib/mention';

export default {
	name: Events.ChannelUpdate,
	async execute(oldChannel: Channel, newChannel: Channel) {
		if (!newChannel.guild) return;
		try {
			const logs = await newChannel.guild.fetchAuditLogs({
				type: AuditLogEvent.ChannelUpdate | AuditLogEvent.ChannelOverwriteCreate | AuditLogEvent.ChannelOverwriteDelete | AuditLogEvent.ChannelOverwriteUpdate,
				limit: 5,
			});
			const entry = [...logs.entries.values()]
				.filter(e => (e.target as GuildChannel).id === newChannel.id)
				.sort((a, b) => b.createdTimestamp - a.createdTimestamp)[0];
			const executor = entry?.executor;
			const guildData: GuildPrisma | null = await prisma.guild.findUnique({
				where: { id: newChannel.guild.id },
			});
			if (!guildData) return;
			const changes: string[] = [];
			if (oldChannel.name !== newChannel.name) {
				changes.push(`**Name:** \`${oldChannel.name}\` → \`${newChannel.name}\``);
			}
			if ('topic' in oldChannel && 'topic' in newChannel) {
				if (oldChannel.topic !== newChannel.topic) {
					changes.push(
						`**Topic:** \`${oldChannel.topic ?? 'None'}\` → \`${newChannel.topic ?? 'None'}\``,
					);
				}
			}
			const oldPerms = oldChannel.permissionOverwrites.cache;
			const newPerms = newChannel.permissionOverwrites.cache;
			newPerms.forEach((overwrite, id) => {
				const old = oldPerms.get(id);
				if (!old) {
					changes.push(`New overwrite added for ${getCorrectMention(oldChannel.guild, id)}`);
					return;
				}
				if (
					overwrite.allow.bitfield !== old.allow.bitfield ||
						overwrite.deny.bitfield !== old.deny.bitfield
				) {
					changes.push(`Overwrite changed for <@&${id}> / <@${id}>`);
				}
			});
			oldPerms.forEach((overwrite, id) => {
				if (!newPerms.has(id)) {
					changes.push(`Overwrite removed for <@&${id}> / <@${id}>`);
				}
			});
			if (guildData.logChannels) {
				const logChannel = await newChannel.guild.channels
					.fetch(guildData.logChannels)
					.catch(() => null);
				if (logChannel instanceof TextChannel) {
					const embed = new EmbedBuilder()
						.setTitle('✏️ Channel Updated')
						.setDescription(
							`Channel **${newChannel.name}** ${
								executor ? `was updated by <@${executor.id}>` : 'was updated'
							}.\n\n${changes.join('\n') || 'No details'}`,
						)
						.setColor(guildData.color)
						.setTimestamp()
						.setFooter({ text: guildData.footer });
					await logChannel.send({ embeds: [embed] });
				}
			}
		}
		catch (err) {
			console.error(`⚠️ | ChannelUpdate log error: ${err as Error}`);
		}
	},
};
