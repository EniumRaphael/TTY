import { MessageFlags, SlashCommandBuilder } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Show your latency'),
	async execute(interaction: CommandInteraction) {
		const time: number = Date.now();
		await interaction.reply({
			content: '🏓 | Pong!',
			flags: MessageFlags.Ephemeral
		});

		await interaction.editReply({
			content: `⏱️ | Response latency: **${Date.now() - time}**ms`
		});
	}
}
