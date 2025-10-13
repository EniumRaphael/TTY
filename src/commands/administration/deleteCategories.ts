import { SlashCommandBuilder } from '@discordjs/builders';
import {
	MessageFlags,
	ChannelType,
	ChatInputCommandInteraction,
	type SlashCommandChannelOption,
	CategoryChannel,
} from 'discord.js';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };
import { prisma } from '@lib/prisma';
import { User as UserPrisma } from '@prisma/client';

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
		let userData: UserPrisma | null = null;
		try {
			userData = await prisma.user.findUnique({
				where: { id: interaction.user.id },
			});
		}
		catch (err: unknown) {
			if (err instanceof Error) {
				console.error(`❌ ${err.name}: ${err.message}`);
				console.error(err.stack);
			}
			else {
				console.error('❌ Unknown error:', err);
			}
			await interaction.reply({
				content: `${emoji.answer.error} | Cannot connect to the database`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (!userData?.isOwner) {
			await interaction.reply({
				content: `${emoji.answer.no} | This command is only for owners`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const categoryOption = interaction.options.getChannel('category', true);

		if (categoryOption.type !== ChannelType.GuildCategory) {
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
			const errorMessage = err instanceof Error ? err.message : String(err);
			console.error(
				`Cannot delete category or its channels:\n\t${errorMessage}`,
			);
			await interaction.reply({
				content: `${emoji.answer.error} | Failed to delete the category or its channels.`,
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};
