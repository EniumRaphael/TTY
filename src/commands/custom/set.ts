import { prisma } from '../../lib/prisma.ts';
import {
	ActivityType,
	PresenceUpdateStatus,
	MessageFlags,
	SlashCommandBuilder,
} from 'discord.js';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };

export default {
	data: new SlashCommandBuilder()
		.setName('set')
		.setDescription('edit the default behavour of the bot')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('color')
				.setDescription('Change the default color for the embed')
				.addStringOption((option) =>
					option
						.setName('color')
						.setDescription('The new color by default')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('footer')
				.setDescription('Change the default footer for the embed')
				.addStringOption((option) =>
					option
						.setName('text')
						.setDescription('The new text by default of the bot')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('pp')
				.setDescription('Change the bot profile picture')
				.addStringOption((option) =>
					option
						.setName('link')
						.setDescription('The new link to the new profile picture')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('status')
				.setDescription('Change the status of the bot')
				.addStringOption((option) =>
					option
						.setName('status')
						.setDescription('The new status used by the bot')
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('presence')
						.setDescription('The new presence of the bot')
						.setRequired(true)
						.addChoices(
							{
								name: 'Online',
								value: 'online',
							},
							{
								name: 'Do not disturb',
								value: 'dnd',
							},
							{
								name: 'Idle',
								value: 'idle',
							},
							{
								name: 'Invisible',
								value: 'invisible',
							},
						),
				)
				.addStringOption((option) =>
					option
						.setName('type')
						.setDescription('The type of the new activity')
						.setRequired(true)
						.addChoices(
							{
								name: 'Playing',
								value: 'play',
							},
							{
								name: 'Watching',
								value: 'watch',
							},
							{
								name: 'Listening',
								value: 'listen',
							},
							{
								name: 'Competing',
								value: 'competing',
							},
							{
								name: 'Streaming',
								value: 'stream',
							},
						),
				),
		),
	async execute(interaction: CommandInteraction) {
		let userData: User;
		try {
			userData = await prisma.user.findUnique({
				where: {
					id: interaction.user.id,
				},
			});
		}
		catch (err) {
			console.error(
				`\t⚠️ | Cannot get the database connection!\n\t\t(${err}).`,
			);
			await interaction.reply({
				content: `${emoji.answer.error} | Cannot connect to the database`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const subcommand: string = interaction.options.getSubcommand();
		switch (subcommand) {
		case 'color': {
			if (!userData.isOwner) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for owner`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			const newColor: string = interaction.options.getString('color');
			if (!/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
				await interaction.reply({
					content: `${emoji.answer.no} | You have to give a color with the syntax: \`#000000\`.`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			await prisma.guild.upsert({
				where: {
					id: interaction.guild.id,
				},
				update: {
					color: newColor,
				},
				create: {
					id: interaction.guild.id,
					color: newColor,
				},
			});
			await interaction.reply({
				content: `${emoji.answer.yes} | The default color for embed will be now changed by \`${newColor}\``,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		case 'footer': {
			if (!userData.isOwner) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for owner`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			const newFooter: string = interaction.options.getString('text');
			if (newFooter.length > 2048) {
				await interaction.reply({
					content: `${emoji.answer.no} | The maximum lenght for the footer is 2048`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			await prisma.guild.upsert({
				where: {
					id: interaction.guild.id,
				},
				update: {
					footer: newFooter,
				},
				create: {
					id: interaction.guild.id,
					footer: newFooter,
				},
			});
			await interaction.reply({
				content: `${emoji.answer.yes} | The default footer for embed will be now changed by \`${newFooter}\`.`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		case 'pp': {
			if (!userData.isBuyer) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for buyer`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			const newPicture: string = interaction.options.getString('link');
			try {
				interaction.client.user.setAvatar(newPicture);
			}
			catch (err) {
				await interaction.reply({
					content: `${emoji.answer.no} | Error during changing the bot profile picture`,
					flags: MessageFlags.Ephemeral,
				});
				console.error(
					`\t⚠️ | Cannot change the bot profile picture!\n\t\t(${err}).`,
				);
			}
			await interaction.reply({
				content: `${emoji.answer.yes} | The picture profile of the bot is now updated.`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		case 'status': {
			if (!userData.isBuyer) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for buyer`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			const newStatus: string = interaction.options.getString('status');
			const tmpType: string = interaction.options.getString('type');
			let newType: ActivityType;
			switch (tmpType) {
			case 'play':
				newType = ActivityType.Playing;
				break;
			case 'listen':
				newType = ActivityType.Listening;
				break;
			case 'watch':
				newType = ActivityType.Watching;
				break;
			case 'stream':
				newType = ActivityType.Streaming;
				break;
			case 'competing':
				newType = ActivityType.Competing;
				break;
			}
			const tmpPresence: string = interaction.options.getString('presence');
			let newPresence: PresenceUpdateStatus;
			switch (tmpPresence) {
			case 'online':
				newPresence = PresenceUpdateStatus.Online;
				break;
			case 'idle':
				newPresence = PresenceUpdateStatus.Idle;
				break;
			case 'dnd':
				newPresence = PresenceUpdateStatus.DoNotDisturb;
				break;
			case 'invisible':
				newPresence = PresenceUpdateStatus.Invisible;
				break;
			}
			try {
				await prisma.bot.upsert({
					where: {
						id: 1,
					},
					update: {
						status: newStatus,
						type: tmpType,
						presence: newPresence,
					},
					create: {
						id: 1,
						status: newStatus,
						type: tmpType,
						presence: newPresence,
					},
				});
				if (tmpType === 'steam') {
					interaction.client.user.setPresence({
						status: newPresence,
						activities: [
							{
								name: newStatus,
								type: newType,
								url: 'https://twitch.tv/EniumRaphael',
							},
						],
					});
				}
				else {
					interaction.client.user.setPresence({
						status: newPresence,
						activities: [
							{
								name: newStatus,
								type: newType,
							},
						],
					});
				}
			}
			catch (err) {
				await interaction.reply({
					content: `${emoji.answer.no} | Cannot change the status\n\n\t${err}`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			await interaction.reply({
				content: `${emoji.answer.yes} | The new activity is now \`${newStatus}\``,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		}
	},
};
