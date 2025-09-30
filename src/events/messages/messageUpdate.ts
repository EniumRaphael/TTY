import { Events, EmbedBuilder, Message, Channel } from 'discord.js';
import { prisma } from '../../lib/prisma.ts';
import { Guild as GuildPrisma } from '@prisma/client';

export default {
	name: Events.MessageUpdate,
	async execute(oldMessage:Message, newMessage: Message) {
		const guildData: GuildPrisma = await prisma.guild.findUnique({
			where: {
				id: message.guildId,
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
					Channel: ${newMessage.channel}
					Before: ${oldMessage.content}
					After: ${newMessage.content}
				`);
			const logChannel: Promise<Channel | null> = await newMessage.guild.client.channels
				.fetch(guildData.logMsg)
				.catch((err) => console.error(err));
			if (logChannel) {
				logChannel.send({
					embeds: [
						log,
					],
				});
			}
		}
	},
};
