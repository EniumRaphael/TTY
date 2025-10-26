import { Events, EmbedBuilder, Message, Channel, Collection, Snowflake, PartialMessage } from 'discord.js';
import { log } from '@lib/log';
import { prisma } from '@lib/prisma';
import { Guild as GuildPrisma } from '@prisma/client';

export default {
	name: Events.MessageBulkDelete,
	async execute(messages: Collection<Snowflake, Message | PartialMessage>) {
		const message: Message = messages.first();
		const guildData: GuildPrisma = await prisma.guild.findUnique({
			where: {
				id: message.guildId,
			},
		});
		let description: string = '';
		for (const [, msg] of messages) {
			let fullMsg = msg;
			if (msg.partial) {
				try {
					fullMsg = await msg.fetch();
				}
				catch (err) {
					log.warn(err, 'BulkDelete cannot load a message');
				}
			}

			description += `**${fullMsg.author?.username ?? 'Unknown'}**: ${fullMsg.content || '[no content]'}\n`;
		}
		if (guildData.logMsg) {
			const logEmbed = new EmbedBuilder()
				.setAuthor({
					name: `${message.author.tag} (${message.author.id})`,
					iconURL: message.author.displayAvatarURL({
						size: 2048,
						extension: 'png',
					}),
				})
				.setTitle('🚯 | Message Cleared')
				.setColor(guildData.color)
				.setFooter({
					text: guildData.footer,
				})
				.setDescription(`
					__Channel:__ <#${message.channel.id}> (${message.channel.name})
					__Number:__ ${messages.size}
					__Content:__
					${description}
				`);
			const logChannel: Promise<Channel | null> = await message.guild.client.channels
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
