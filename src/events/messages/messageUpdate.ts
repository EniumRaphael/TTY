import { Events, EmbedBuilder, Message, Channel } from 'discord.js';
import { prisma } from '@lib/prisma';
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
			const log = new EmbedBuilder()
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
				.catch((err) => { console.error(err); });
			logChannel.send({
				embeds: [
					log,
				],
			});
		}
	},
};
