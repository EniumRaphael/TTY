import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../lib/prisma.ts';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };

export default {
	data: new SlashCommandBuilder()
		.setName('whitelist')
		.setDescription('Interact with the whitelist')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('add')
				.setDescription('Add a user on the whitelist')
				.addUserOption((option) =>
					option
						.setName('target')
						.setDescription('The user who will be added to the whitelist')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('delete')
				.setDescription('Delete a user on the whitelist')
				.addUserOption((option) =>
					option
						.setName('target')
						.setDescription('The user who will be deleted to the whitelist')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName('list').setDescription('Show the whitelist'),
		),
	async execute(interaction: CommandInteraction) {
		const subcommand = interaction.options.getSubcommand();
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
				`\t⚠️ | Whitelist => Cannot get the database connection!\n\t\t(${err}).`,
			);
			await interaction.reply({
				content: `${emoji.answer.error} | Cannot connect to the database`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		let guildData: Guild;
		try {
			guildData = await prisma.guild.findUnique({
				where: {
					id: interaction.guild.id,
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
		const target: GuildMember = interaction.options.getUser('target');
		switch (subcommand) {
		case 'add':
			if (!userData.isOwner) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for owner`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			try {
				await prisma.guildUser.upsert({
					where: {
						userId_guildId: {
							userId: target.id,
							guildId: interaction.guild.id,
						},
					},
					update: {
						isWlUser: true,
					},
					create: {
						userId: target.id,
						guildId: interaction.guild.id,
						isWlUser: true,
					},
				});
				await prisma.guild.update({
					where: {
						id: interaction.guild.id,
					},
					data: {
						WlUsers: {
							connect: {
								id: target.id,
							},
						},
					},
				});
			}
			catch (err) {
				console.error(
					`⚠️ | Error when adding ${target.username} to the whitelist\n\t${err}`,
				);
				await interaction.reply({
					content: `${emoji.answer.error} | Error when adding ${target.username} to the whitelist`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			await interaction.reply({
				content: `${emoji.answer.yes} | ${target.username} has been added to the whitelist`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		case 'delete':
			if (!userData.isOwner) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for owner`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			else if (interaction.user.id === target.id) {
				await interaction.reply({
					content: `${emoji.answer.no} | You cannot removing yourself from the whitelist`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			try {
				await prisma.guildUser.upsert({
					where: {
						userId_guildId: {
							userId: target.id,
							guildId: interaction.guild.id,
						},
					},
					update: {
						isWlUser: false,
					},
					create: {
						userId: target.id,
						guildId: interaction.guild.id,
						isWlUser: false,
					},
				});
				await prisma.guild.update({
					where: {
						id: interaction.guild.id,
					},
					data: {
						WlUsers: {
							disconnect: {
								id: target.id,
							},
						},
					},
				});
			}
			catch (err) {
				console.error(
					`⚠️ | Error when removing ${target.username} to the username\n\t${err}`,
				);
				await interaction.reply({
					content: `${emoji.answer.error} | Cannot remove ${target.username} from the whitelist`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			await interaction.reply({
				content: `${emoji.answer.yes} | ${target.username} has been removing to the whitelist`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		case 'list':
			if (!userData.isOwner) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for owner`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			try {
				const guild = await prisma.guild.findUnique({
					where: {
						id: interaction.guild.id,
					},
					include: {
						WlUsers: true,
					},
				});

				if (!guild || guild.WlUsers.length === 0) {
					await interaction.reply({
						content: `${emoji.answer.error} | There is no whitelisted user.`,
						flags: MessageFlags.Ephemeral,
					});
					break;
				}

				const WlUsers = await Promise.all(
					guild.WlUsers.map(async (whitelist) => {
						try {
							const user = await interaction.client.users.fetch(whitelist.id);
							return `- ${user.username} (\`${user.id}\`)\n`;
						}
						catch (err) {
							console.warn(`⚠️ | ${whitelist.id} : ${err}`);
							return null;
						}
					}),
				);

				const toSend: EmbedBuilder = new EmbedBuilder()
					.setTitle('🗞️ | Whitelist')
					.setColor(guildData.color)
					.setFooter({
						text: guildData.footer,
					})
					.setDescription(WlUsers.filter(Boolean).join(''));
				await interaction.reply({
					embeds: [toSend],
					flags: MessageFlags.Ephemeral,
				});
			}
			catch (err) {
				console.error(
					`⚠️ | Whitelist => error when fetching infromation from the database: ${err}`,
				);
				await interaction.reply({
					content: `${emoji.answer.error} | Cannot fetch the infromation of the database.`,
					flags: MessageFlags.Ephemeral,
				});
			}
			break;
			return;
		}
	},
};
