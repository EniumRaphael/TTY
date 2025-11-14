import { CommandInteraction, EmbedBuilder, MessageFlags, User } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { prisma } from '@lib/prisma';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };
import { Guild as GuildPrisma } from '@prisma/client';
import { log } from '@lib/log';
import { isOwner } from '@lib/perm.js';

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
		let guildData: GuildPrisma;
		try {
			guildData = await prisma.guild.findUnique({
				where: {
					id: interaction.guild.id,
				},
			});
		}
		catch (err) {
			log.error(err, 'Cannot get the database connection!');
			await interaction.reply({
				content: `${emoji.answer.error} | Cannot connect to the database`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const target: GuildMember = interaction.options.getUser('target');
		switch (subcommand) {
		case 'add':
			if (!await isOwner(interaction.user.id)) {
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
				log.error(err, `Error when adding ${target.username} to the whitelist`);
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
			if (!await isOwner(interaction.user.id)) {
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
				log.error(err, `Error when removing ${target.username} to the username`);
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
			if (!await isOwner(interaction.user.id)) {
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
					guild.WlUsers.map(async (whitelist: User) => {
						try {
							const user = await interaction.client.users.fetch(whitelist.id);
							return `- ${user.username} (\`${user.id}\`)\n`;
						}
						catch (err) {
							log.warn(err, `Unable to fetch ${whitelist.id}`);
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
				log.error(err, 'error when fetching infromation from the database');
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
