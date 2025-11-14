import { SlashCommandBuilder } from '@discordjs/builders';
import {
	MessageFlags,
	ChannelType,
	ChatInputCommandInteraction,
	CategoryChannel,
} from 'discord.js';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };
import { log } from '@lib/log';
import { isOwner } from '@lib/perm.js';

export default {
	data: new SlashCommandBuilder()
		.setName('deletecat')
		.setDescription('Delete the category given in parameter')
		.addChannelOption((opt: SlashCommandChannelOption) =>
			opt
				.setName('category')
				.setDescription('Choose the category you want to delete')
				.setRequired(true)
				.addChannelTypes(ChannelType.GuildCategory),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		if (!await isOwner(interaction.user.id)) {
			await interaction.reply({
				content: `${emoji.answer.no} | This command is only for owners`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const categoryOption: CategoryChannel | null = interaction.options.getChannel('category', true);

		if (!(categoryOption instanceof CategoryChannel)) {
			await interaction.reply({
				content: `${emoji.answer.no} | Please choose a valid category.`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const category = categoryOption as CategoryChannel;

		try {
			for (const channel of category.children.cache.values()) {
				await channel.delete(
					`Deleted ${channel.name} (requested by ${interaction.user.username})`,
				);
			}

			await category.delete(
				`Deleted ${category.name} (requested by ${interaction.user.username})`,
			);

			await interaction.reply({
				content: `${emoji.answer.yes} | Deleted category **${category.name}** and its channels.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		catch (err: unknown) {
			log.error(err, 'Cannot delete category or its channels');
			await interaction.reply({
				content: `${emoji.answer.error} | Failed to delete the category or its channels.`,
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};
