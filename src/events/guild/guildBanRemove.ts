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
	name: Events.GuildBanRemove,
	async execute(ban: GuildBan) {
		const guild: Guild = ban.guild;
		const banned_user: User = ban.user;
		const banFetchLog: GuildAuditLogs<AuditLogEvent.MemberBanAdd> =
			await guild.fetchAuditLogs({
				limit: 99,
				type: AuditLogEvent.MemberBanAdd,
			});
		const banLog = banFetchLog.entries.find(
			(entry) => entry.target?.id === banned_user.id,
		);
		const unbanFetchLog: GuildAuditLogs<AuditLogEvent.MemberBanRemove> =
			await guild.fetchAuditLogs({
				limit: 99,
				type: AuditLogEvent.MemberBanRemove,
			});
		const unbanLog = unbanFetchLog.entries.find(
			(entry) => entry.target?.id === banned_user.id,
		);
		const executor: string = banLog.executor.username ?? 'Unknown executor';
		const reason: string = ban.reason ?? banLog.reason ?? 'No reason provided';
		const bannedAt: number | undefined = banLog?.createdTimestamp;
		const unbannedAt: number | undefined = unbanLog?.createdTimestamp;
		let durationFormatted: string | null = null;
		if (unbannedAt && bannedAt) {
			const durationMs: number = unbannedAt - bannedAt;
			const durationTotalSeconds: number = Math.max(0, Math.floor(durationMs / 1000));
			const durationHours: number = Math.floor(durationTotalSeconds / 3600);
			const durationMinutes: number = Math.floor((durationTotalSeconds % 3600) / 60);
			const durationSeconds: number = durationTotalSeconds % 60;
			const durationParts: string[] = [];
			if (durationHours > 0) {
				durationParts.push(`${durationHours}h`);
			}
			if (durationMinutes > 0) {
				durationParts.push(`${durationMinutes}m`);
			}
			if (durationSeconds > 0 || durationParts.length === 0) {
				durationParts.push(`${durationSeconds}s`);
			}
			durationFormatted = durationParts.join(' ');
		}
		const guildData: GuildPrisma = await prisma.guild.findUnique({
			where: {
				id: guild.id,
			},
		});

		const toSend: EmbedBuilder = new EmbedBuilder()
			.setTitle('🔨 | Member Unbanned')
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
				**Banned the:**
				${bannedAt ? `<t:${Math.floor(bannedAt / 1000)}:D> (<t:${Math.floor(bannedAt / 1000)}:R>)` : 'No date found'}
				**Ban Duration:**
				${durationFormatted ?? 'Cannot calculate the ban duration'}
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
