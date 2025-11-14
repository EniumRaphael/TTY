import { SlashCommandBuilder } from '@discordjs/builders';
import {
	MessageFlags,
	ChannelType,
	TextChannel,
	ChatInputCommandInteraction,
} from 'discord.js';
import emoji from '../../../assets/emoji.json' with { type: 'json' };
import { isWhitelisted } from '@lib/perm';
import { log } from '@lib/log';

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
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) {
			await interaction.reply({
				content: `${emoji.answer.error} | This command can only be used in a server.`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		if (!(await isWhitelisted(interaction.user.id, interaction.guild.id))) {
			await interaction.reply({
				content: `${emoji.answer.no} | You're not whitelisted on this server`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const oldChannel = (interaction.options.getChannel('channel') ??
      interaction.channel) as TextChannel | null;
		if (!oldChannel) {
			await interaction.reply({
				content: `${emoji.answer.error} | Invalid or missing text channel.`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const pos: number = oldChannel.position;

		try {
			const newchannel = await oldChannel.clone();
			await newchannel.setPosition(pos);
			const fetchedChannel = await interaction.client.channels.fetch(
				newchannel.id,
			);
			if (
				fetchedChannel &&
        fetchedChannel.type === ChannelType.GuildText &&
        typeof (fetchedChannel as TextChannel).send === 'function'
			) {
				await (fetchedChannel as TextChannel).send({
					content: `${emoji.answer.yes} | ${newchannel.toString()} has been nuked by \`${interaction.user.username}\``,
				});
			}
			await oldChannel.delete();
		}
		catch (err) {
			log.error(err, 'Error when nuking the channel');
			await interaction.reply({
				content: `${emoji.answer.no} | An error occurred while nuking the channel.`,
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};
