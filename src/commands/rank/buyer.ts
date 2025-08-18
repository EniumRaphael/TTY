import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../lib/prisma.ts';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };

export default {
	data: new SlashCommandBuilder()
		.setName('buyer')
		.setDescription('Interact with the buyers')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('add')
				.setDescription('Add a user on the buyer list')
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
				.setDescription('Delete a user on the buyer list')
				.addUserOption((option) =>
					option
						.setName('target')
						.setDescription('The user who will be deleted to the list')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName('list').setDescription('The list of the buyer'),
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
				`\t⚠️ | Cannot get the database connection!\n\t\t(${err}).`,
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
			if (!userData.isDev) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for the developper of the bot`,
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
						buyers: {
							connect: {
								id: target.id,
							},
						},
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
						isBuyer: true,
						isOwner: true,
					},
					create: {
						id: target.id,
						isBuyer: true,
						isOwner: true,
					},
				});
			}
			catch (err) {
				console.error(
					`⚠️ | Error when adding ${target.username} to the buyer list\n\t${err}`,
				);
				await interaction.reply({
					content: `${emoji.answer.error} | Error when adding ${target.username} to the owner list`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			await interaction.reply({
				content: `${emoji.answer.yes} | ${target.username} has been added to the buyer list`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		case 'delete':
			if (!userData.isDev) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for buyer`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			else if (interaction.user.id === target.id) {
				await interaction.reply({
					content: `${emoji.answer.no} | You cannot removing yourself from the buyer list`,
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
						buyers: {
							disconnect: {
								id: target.id,
							},
						},
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
						isBuyer: false,
						isOwner: false,
					},
					create: {
						id: target.id,
						isBuyer: false,
						isOwner: false,
					},
				});
			}
			catch (err) {
				console.error(
					`⚠️ | Error when removing ${target.username} to the buyer list\n\t${err}`,
				);
				return;
			}
			await interaction.reply({
				content: `${emoji.answer.yes} | ${target.username} has been removing to the buyer list`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		case 'list':
			if (!userData.isBuyer) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for buyer`,
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
						buyers: true,
					},
				});

				if (!bot || bot.buyers.length === 0) {
					await interaction.reply({
						content: `${emoji.answer.error} | There is no buyer registered.`,
						flags: MessageFlags.Ephemeral,
					});
					break;
				}

				const buyerList = await Promise.all(
					bot.buyers.map(async (buyer) => {
						try {
							const user = await interaction.client.users.fetch(buyer.id);
							return `- ${user.username} (\`${user.id}\`)\n`;
						}
						catch (err) {
							console.warn(`⚠️ | ${buyer.id} : ${err}`);
							return null;
						}
					}),
				);

				const toSend: EmbedBuilder = new EmbedBuilder()
					.setTitle(`${emoji.badge.buyer} | Buyer list`)
					.setColor(guildData.color)
					.setFooter({
						text: guildData.footer,
					})
					.setDescription(buyerList.filter(Boolean).join(''));
				await interaction.reply({
					embeds: [toSend],
					flags: MessageFlags.Ephemeral,
				});
			}
			catch (err) {
				console.error(
					`⚠️ | error when fetching infromation from the database: ${err}`,
				);
				await interaction.reply({
					content: `${emoji.answer.error} | Cannot fetch the infromation of the database.`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			break;
			return;
		}
	},
};
