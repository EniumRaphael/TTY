import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };

export default {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Show your latency'),
	async execute(interaction: CommandInteraction) {
		const time: number = Date.now();
		await interaction.reply({
			content: `${emoji.answer.loading} | Calculating your ping !`,
			flags: MessageFlags.Ephemeral,
		});

		await interaction.editReply({
			content: `⏱️ | Response latency: **${Date.now() - time}**ms`,
		});
	},
};
