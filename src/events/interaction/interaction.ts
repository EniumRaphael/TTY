import { Events, MessageFlags } from 'discord.js'
import emoji from '../../../assets/emoji.json' assert { type: "json" };

export default {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand())
			return;
		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) {
			console.error(`⚠️ | Can't execute ${interaction.commandName}`);
			await interaction.reply({
				content: `${emoji.answer.error} | Cannot execute the command ${interaction.commandName}`,
				flags: MessageFlags.Ephemeral
			});
			return;
		}
		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(`⚠️ | Error when occured this command ${interaction.commandName}\n\t${error}`);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: `${emoji.answer.error} | ${interaction.commandName} seems have a problem, thanks report that to the support (After Print)`,
					flags: MessageFlags.Ephemeral
				});
			} else {
				await interaction.reply({
					content: `${emoji.answer.error} | ${interaction.commandName} seems have a problem, thanks report that to the support (Before Print)`,
					flags: MessageFlags.Ephemeral
				});
			}
		}
	},
};
