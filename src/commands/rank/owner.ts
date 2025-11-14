import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { prisma } from '@lib/prisma';
import { Guild as GuildPrisma } from '@prisma/client';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };
import { log } from '@lib/log';
import { isBuyer, isOwner } from '@lib/perm.js';

export default {
	data: new SlashCommandBuilder()
		.setName('owner')
		.setDescription('Interact with the owners')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('add')
				.setDescription('Add a user on the owner list')
				.addUserOption((option) =>
					option
						.setName('target')
						.setDescription('The user who will be added to the list')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('delete')
				.setDescription('Delete a user on the owner list')
				.addUserOption((option) =>
					option
						.setName('target')
						.setDescription('The user who will be deleted to the list')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName('list').setDescription('The list of the owner'),
		),
	async execute(interaction: CommandInteraction) {
		const subcommand = interaction.options.getSubcommand();
		let guildData: GuildPrisma | null;
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
			if (!await isBuyer(interaction.user.id)) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for buyer`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			try {
				await prisma.bot.update({
					where: {
						id: 1,
					},
					data: {
						owners: {
							connect: {
								id: target.id,
							},
						},
					},
				});
				await prisma.user.upsert({
					where: {
						id: target.id,
					},
					update: {
						isOwner: true,
					},
					create: {
						id: target.id,
						isOwner: true,
					},
				});
			}
			catch (err) {
				log.error(err, `Error when adding ${target.username} to the owner list`);
				await interaction.reply({
					content: `${emoji.answer.error} | Error when adding ${target.username} to the owner list`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			await interaction.reply({
				content: `${emoji.answer.yes} | ${target.username} has been added to the owner list`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		case 'delete':
			if (!await isBuyer(interaction.user.id)) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for buyer`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			else if (interaction.user.id === target.id) {
				await interaction.reply({
					content: `${emoji.answer.no} | You cannot removing yourself from the owner list`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			try {
				await prisma.bot.update({
					where: {
						id: 1,
					},
					data: {
						owners: {
							disconnect: {
								id: target.id,
							},
						},
					},
				});
				await prisma.user.upsert({
					where: {
						id: target.id,
					},
					update: {
						isOwner: false,
					},
					create: {
						id: target.id,
						isOwner: false,
					},
				});
			}
			catch (err) {
				log.error(err, `Error when removing ${target.username} to the owner list`);
				await interaction.reply({
					content: `${emoji.answer.error} | Cannot removing the user from the owner list`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			await interaction.reply({
				content: `${emoji.answer.yes} | ${target.username} has been removing to the owner list`,
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
				const bot = await prisma.bot.findUnique({
					where: {
						id: 1,
					},
					include: {
						owners: true,
					},
				});

				if (!bot || bot.owners.length === 0) {
					await interaction.reply({
						content: `${emoji.answer.error} | There is no owner registered.`,
						flags: MessageFlags.Ephemeral,
					});
					break;
				}

				const ownerList = await Promise.all(
					bot.owners.map(async (owner) => {
						try {
							const user = await interaction.client.users.fetch(owner.id);
							return `- ${user.username} (\`${user.id}\`)\n`;
						}
						catch (err) {
							log.warn(err, `Unable to fetch ${owner.id} user`);
							return null;
						}
					}),
				);

				const toSend: EmbedBuilder = new EmbedBuilder()
					.setTitle(`${emoji.badge.owner} | Owner list`)
					.setColor(guildData.color)
					.setFooter({
						text: guildData.footer,
					})
					.setDescription(ownerList.filter(Boolean).join(''));
				await interaction.reply({
					embeds: [toSend],
					flags: MessageFlags.Ephemeral,
				});
			}
			catch (err) {
				log.error(err, 'Error when fetching infromation from the database');
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
