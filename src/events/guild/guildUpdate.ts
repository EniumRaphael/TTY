import { Events, Guild, EmbedBuilder, channelMention, Channel } from 'discord.js';
import { prisma } from '@lib/prisma';
import { Guild as GuildPrisma } from '@prisma/client';

const verificationLevels: string[] = [
	'Unrestricted',
	'Low - must have a verified email',
	'Medium - must be registered for 5 minutes',
	'High - 10 minutes of membership required',
	'Highest - verified phone required',
];

const explicitContentLevels: string[] = [
	'No Scanning Enabled',
	'Scanning content from members without a role',
	'Scanning content from all members',
];

export default {
	name: Events.GuildUpdate,
	async execute(oldGuild: Guild, newGuild: Guild) {
		const guildData: GuildPrisma = await prisma.guild.findUnique({
			where: {
				id: newGuild.id,
			},
		});
		if (guildData.logServer) {
			let toPrint: string = 'The update of the guild had changes theses thing\n';
			const logChannel : Channel = await newGuild.client.channels
				.fetch(guildData.logServer)
				.catch(() => null);
			if (!logChannel.isTextBased()) {return;}
			if (oldGuild.name !== newGuild.name) {
				toPrint += `- Name:\n\`${oldGuild.name}\` => \`${newGuild.name}\`\n`;
			}
			if (oldGuild.description !== newGuild.description) {
				toPrint += `- Description:\n\`${oldGuild.description}\` => \`${newGuild.description}\`\n`;
			}
			if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
				toPrint += `- AfkChannel:\n${oldGuild.afkChannelId ? channelMention(oldGuild.afkChannelId) : 'Not defined'} => ${newGuild.afkChannelId ? channelMention(newGuild.afkChannelId) : 'Not defined'}\n`;
			}
			if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
				toPrint += `- Timeout:\n\`${oldGuild.afkTimeout / 60}m\` => \`${newGuild.afkTimeout / 60}m\`\n`;
			}
			if (oldGuild.preferredLocale !== newGuild.preferredLocale) {
				toPrint += `- Language:\n\`${oldGuild.preferredLocale}\` => \`${newGuild.preferredLocale}\`\n`;
			}
			if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
				toPrint += `- Verification:\n\`${verificationLevels[oldGuild.verificationLevel]}\` => \`${verificationLevels[newGuild.verificationLevel]}\`\n`;
			}
			if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
				toPrint += `- Filter:\n\`${explicitContentLevels[oldGuild.explicitContentFilter]}\` => \`${explicitContentLevels[newGuild.explicitContentFilter]}\`\n`;
			}
			if (oldGuild.premiumTier !== newGuild.premiumTier) {
				toPrint += `- Filter:\n\`${oldGuild.premiumTier}\` => \`${newGuild.premiumTier}\`\n`;
			}
			const toRep = new EmbedBuilder()
				.setColor(guildData.color)
				.setFooter({
					text: guildData.footer,
				})
				.setDescription(toPrint);
			logChannel.send({
				embeds: [
					toRep,
				],
			});
		}
	},
};
