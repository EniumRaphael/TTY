import {
	AuditLogEvent,
	Channel,
	EmbedBuilder,
	Events,
	Guild,
	GuildAuditLogs,
	GuildBan,
	User,
} from 'discord.js';
import { Guild as GuildPrisma } from '@prisma/client';
import { prisma } from '@lib/prisma';

export default {
	name: Events.GuildBanAdd,
	async execute(ban: GuildBan) {
		const guild: Guild = ban.guild;
		const banned_user: User = ban.user;
		const fetchedLogs: GuildAuditLogs<AuditLogEvent.MemberBanAdd> = await guild.fetchAuditLogs({
			limit: 5,
			type: AuditLogEvent.MemberBanAdd,
		});
		const banLog = fetchedLogs.entries.find(
			(entry) => entry.target?.id === banned_user.id,
		);
		const executor: string = banLog.executor.username ?? 'Unknown executor';
		const reason: string = ban.reason ?? banLog.reason ?? 'No reason provided';
		const guildData: GuildPrisma = await prisma.guild.findUnique({
			where: {
				id: guild.id,
			},
		});

		const toSend: EmbedBuilder = new EmbedBuilder()
			.setTitle('🔨 | Member banned')
			.setAuthor({
				name: `${banned_user.username} (${banned_user.id})`,
				iconURL: banned_user.displayAvatarURL({
					size: 2048,
					extension: 'png',
				}),
			})
			.setColor(guildData.color)
			.setFooter({
				text: guildData.footer,
			})
			.setTimestamp().setDescription(`
			**Banned by:**
			${executor}
			**Reason:**
			${reason}
		`);
		if (guildData.logMod) {
			const logChannel: Channel | null = await guild.client.channels.fetch(
				guildData.logMod,
			);
			if (logChannel) {
				logChannel.send({
					embeds: [toSend],
				});
			}
		}
	},
};
