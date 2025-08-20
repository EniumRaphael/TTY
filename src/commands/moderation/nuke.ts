import { MessageFlags, SlashCommandBuilder, ChannelType } from 'discord.js';
import { prisma } from '../../lib/prisma.ts';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };

async function isWhitelisted(userId: string, guildId: string): Promise<boolean> {
	const userData: User = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	});
	const count: interger = await prisma.user.count({
		where: {
			id: userId,
			WhitelistedGuilds: {
				some: {
					id: guildId,
				},
			},
		},
	});
	return (userData.isOwner || userData.isBuyer || count);
}

export default {
	data: new SlashCommandBuilder()
		.setName('nuke')
		.setDescription('Allow to delete and recreate a channel')
		.addChannelOption((opt) =>
			opt
				.setName('channel')
				.setDescription('Choose the channel you want to renew')
				.addChannelTypes(ChannelType.GuildText),
		),
	async execute(interaction: CommandInteraction) {
		if (!(await isWhitelisted(interaction.user.id, interaction.guild.id))) {
			interaction.reply({
				content: `${emoji.answer.no} | You're not whitelisted on this server`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const oldChannel : GuildText = interaction.options.getChannel(
			'channel',
		) || interaction.channel;
		const pos: interger = oldChannel.position;

		oldChannel.clone().then((newchannel) => {
			newchannel.setPosition(pos);
			interaction.client.channels.fetch(newchannel.id).then(
				channel => channel.send({
					content: `${emoji.answer.yes} | ${newchannel} has been nuked by \`${interaction.user.username}\``,
					ephermal: true,
				}),
			);
			try {
				oldChannel.delete();
			}
			catch (err) {
				console.error(`⚠️ | Error when suppressing the channel\n\t${err}`);
			}
		});
	},
};
