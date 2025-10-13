import { Events, EmbedBuilder, Message, Channel } from 'discord.js';
import { prisma } from '@lib/prisma';
import { Guild as GuildPrisma } from '@prisma/client';

export default {
	name: Events.MessageDelete,
	async execute(message: Message) {
		const guildData: GuildPrisma = await prisma.guild.findUnique({
			where: {
				id: message.guildId,
			},
		});
		if (guildData.logMsg) {
			const log = new EmbedBuilder()
				.setAuthor({
					name: `${message.author.tag} (${message.author.id})`,
					iconURL: message.author.displayAvatarURL({
						size: 2048,
						extension: 'png',
					}),
				})
				.setTitle('🗑️ | Message Deleted')
				.setColor(guildData.color)
				.setFooter({
					text: guildData.footer,
				})
				.setDescription(`
					__Channel:__ <#${message.channel.id}> (${message.channel.name})
					__Content:__ ${message.content ? message.content : '*enable to load the content*'}
				`);
			const logChannel: Promise<Channel | null> = await message.guild.client.channels
				.fetch(guildData.logMsg)
				.catch((err) => { console.error(err); });
			logChannel.send({
				embeds: [
					log,
				],
			});
		}
	},
};
