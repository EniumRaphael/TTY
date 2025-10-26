import { Events, EmbedBuilder, Message, Channel } from 'discord.js';
import { prisma } from '@lib/prisma';
import { log } from '@lib/log';
import { Guild as GuildPrisma } from '@prisma/client';

export default {
	name: Events.MessageUpdate,
	async execute(oldMessage:Message, newMessage: Message) {
		const guildData: GuildPrisma = await prisma.guild.findUnique({
			where: {
				id: oldMessage.guildId,
			},
		});
		if (guildData.logMsg) {
			const logEmbed = new EmbedBuilder()
				.setAuthor({
					name: `${newMessage.author.tag} (${newMessage.author.id})`,
					iconURL: newMessage.author.displayAvatarURL({
						size: 2048,
						extension: 'png',
					}),
				})
				.setTitle('✏️ | Message Edited')
				.setColor(guildData.color)
				.setFooter({
					text: guildData.footer,
				})
				.setDescription(`
					__Channel:__ <#${message.channel.id}> (${message.channel.name})
					__Before:__ ${oldMessage.content}
					__After:__ ${newMessage.content}
				`);
			const logChannel: Promise<Channel | null> = await newMessage.guild.client.channels
				.fetch(guildData.logMsg)
				.catch((err) => {
					log.error(err, 'Unable to fetch the log channel');
				});
			logChannel.send({
				embeds: [
					logEmbed,
				],
			});
		}
	},
};
