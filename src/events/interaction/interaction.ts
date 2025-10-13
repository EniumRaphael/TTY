import { CommandInteraction, Events, Interaction, MessageFlags } from 'discord.js';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };

export default {
	name: Events.InteractionCreate,
	async execute(interaction: Interaction) {
		if (!interaction.isChatInputCommand()) return;
		const command: CommandInteraction = interaction.client.commands.get(interaction.commandName);
		try {
			await command.execute(interaction);
		}
		catch (err) {
			console.error(
				`⚠️ | Error when occured this command ${interaction.commandName}\n\t${err as Error}`,
			);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: `${emoji.answer.error} | ${interaction.commandName} seems have a problem, thanks report that to the support (After Print)`,
					flags: MessageFlags.Ephemeral,
				});
			}
			else {
				await interaction.reply({
					content: `${emoji.answer.error} | ${interaction.commandName} seems have a problem, thanks report that to the support (Before Print)`,
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};
