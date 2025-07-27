import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../lib/prisma.ts';

export default {
	data: new SlashCommandBuilder()
		.setName('buyer')
		.setDescription('Interact with the buyers')
		.addSubcommand(subcommand => subcommand
			.setName('add')
			.setDescription('Add a user on the buyer list')
			.addUserOption(option =>
				option.setName('target')
				.setDescription('The user who will be added to the list')
				.setRequired(true)
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName('delete')
			.setDescription('Delete a user on the buyer list')
			.addUserOption(option =>
				option.setName('target')
				.setDescription('The user who will be deleted to the list')
				.setRequired(true)
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName('list')
			.setDescription('The list of the buyer')
		),
	async execute(interaction: CommandInteraction) {
		const subcommand = interaction.options.getSubcommand();
		let userData: User;
		try {
			userData = await prisma.user.findUnique({
				where: {
					id: interaction.user.id
				}
			});
		} catch (err) {
			console.error(`\t⚠️ | Buyer => Cannot get the database connection!\n\t\t(${err}).`);
		}
		const target: GuildMember = interaction.options.getUser('target')
		switch (subcommand) {
			case 'add':
				if (!userData.isDev) {
					await interaction.reply({
						content: `<a:no:1398984790337781770> | This command is only for the developper of the bot`,
						flags: MessageFlags.Ephemeral
					});
					return;
				}
				try {
					await prisma.bot.update({
						where: {
							id: 1
						},
						data: {
							buyers: {
								connect: {
									id: target.id
								}
							},
							owners: {
								connect: {
									id: target.id
								}
							}
						}
					});
					await prisma.user.upsert({
						where: {
							id: target.id
						},
						update: {
							isBuyer: true,
							isOwner: true
						},
						create: {
							id: target.id,
							isBuyer: true,
							isOwner: true
						}
					});
				} catch (err) {
					console.error(`⚠️ | Error when adding ${target.username} to the username`);
					return;
				}
				await interaction.reply({
					content: `<a:yes:1398984778388340817> | ${target.username} has been added to the buyer list`,
					flags: MessageFlags.Ephemeral
				});
				return;
			case 'delete':
				if (!userData.isDev) {
					await interaction.reply({
						content: `<a:no:1398984790337781770> | This command is only for buyer`,
						flags: MessageFlags.Ephemeral
					});
					return;
				} else if (interaction.user.id === target.id) {
					await interaction.reply({
						content: `<a:no:1398984790337781770> | You cannot removing yourself form the buyer list`,
						flags: MessageFlags.Ephemeral
					});
					return;
				}
				try {
					await prisma.bot.update({
						where: {
							id: 1
						},
						data: {
							buyers: {
								disconnect: {
									id: target.id
								}
							},
							owners: {
								disconnect: {
									id: target.id
								}
							}
						}
					});
					await prisma.user.upsert({
						where: {
							id: target.id
						},
						update: {
							isBuyer: false,
							isOwner: false
						},
						create: {
							id: target.id,
							isBuyer: false,
							isOwner: false
						}
					});
				} catch (err) {
					console.error(`⚠️ | Error when removing ${target.username} to the username`);
					return;
				}
				await interaction.reply({
					content: `<a:yes:1398984778388340817> | ${target.username} has been removing to the buyer list`,
					flags: MessageFlags.Ephemeral
				});
				return;
			case 'list':
				if (!userData.isBuyer) {
					await interaction.reply({
						content: `<a:no:1398984790337781770> | This command is only for buyer`,
						flags: MessageFlags.Ephemeral
					});
					return;
				}
				try {
					const bot = await prisma.bot.findUnique({
						where: {
							id: 1
						},
						include: {
							buyers: true
						}
					});

					if (!bot || bot.buyers.length === 0) {
						await interaction.reply({
							content: '<a:error:1398985025688436797> | There is no buyer registered.',
							flags: MessageFlags.Ephemeral
						});
						break;
					}

					const buyerList = bot.buyers
						.map(buyer => `- <@${buyer.id}>`)
						.join('\n');

					const toSend: EmbedBuilder = new EmbedBuilder()
						.setTitle(`Buyer list`)
						.setDescription(`${buyerList}`)
					await interaction.reply({
						embeds: [
							toSend
						],
						flags: MessageFlags.Ephemeral
					});
				} catch (err) {
					console.error(`⚠️ | Buyer => error when fetching information from the database: ${err}`);
					await interaction.reply({
						content: '<a:no:1398984790337781770> | Cannot fetch the information of the database.',
						flags: MessageFlags.Ephemeral
					});
				}
				break;
			return;
		}
	}
}
