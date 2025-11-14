import { prisma } from '@lib/prisma';
import { ActionRowBuilder, SlashCommandBuilder } from '@discordjs/builders';
import {
	ChannelType,
	PermissionsBitField,
	ComponentType,
	channelMention,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	MessageFlags,
	EmbedBuilder,
	ChatInputCommandInteraction,
	CategoryChannel,
} from 'discord.js';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };
import { Guild, User } from '@prisma/client';
import { log } from '@lib/log';
import { isOwner } from '@lib/perm.js';

export default {
	data: new SlashCommandBuilder()
		.setName('logs')
		.setDescription('edit the logs configuration')
		.addStringOption((option) =>
			option
				.setName('action')
				.setDescription('What is the action you to perform')
				.setRequired(true)
				.addChoices(
					{
						name: 'Show',
						value: 'logs_show',
					},
					{
						name: 'Auto-configuration',
						value: 'logs_auto',
					},
					{
						name: 'Configuration',
						value: 'logs_config',
					},
					{
						name: 'Disable',
						value: 'logs_disable',
					},
				),
		),
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) {
			await interaction.reply({
				content: `${emoji.answer.error} | This command can only be used in a guild`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		let guildData: Guild | null;
		try {
			guildData = await prisma.guild.findUnique({
				where: {
					id: interaction.guild.id,
				},
			});
		}
		catch (err: unknown) {
			log.error(err, 'Cannot get the database connection');
			await interaction.reply({
				content: `${emoji.answer.error} | Cannot connect to the database`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (!guildData) {
			await interaction.reply({
				content: `${emoji.answer.error} | Guild data not found`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		let userData: User | null;
		try {
			userData = await prisma.user.findUnique({
				where: {
					id: interaction.user.id,
				},
			});
		}
		catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			throw new Error(
				`\t⚠️ | Cannot get the database connection!\n\t\t(${errorMessage}).`,
			);
		}

		if (!userData) {
			await interaction.reply({
				content: `${emoji.answer.error} | User data not found`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const choice = interaction.options.getString('action', true);

		switch (choice) {
		case 'logs_show': {
			if (!await isOwner(interaction.user.id)) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for owner`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			if (guildData.logEnable) {
				const logsData: EmbedBuilder = new EmbedBuilder()
					.setTitle(`Logs for ${interaction.guild.name}`)
					.setColor(guildData.color)
					.setFooter({
						text: guildData.footer,
					}).setDescription(`
							${guildData.logCategory ? `${emoji.answer.yes} | Categories` : `${emoji.answer.no} | Categories`}
							${guildData.logBot ? `${emoji.answer.yes} | Bot ${channelMention(guildData.logBot)}` : `${emoji.answer.no} | Bot`}
							${guildData.logChannels ? `${emoji.answer.yes} | Channels ${channelMention(guildData.logChannels)}` : `${emoji.answer.no} | Channels`}
							${guildData.logMember ? `${emoji.answer.yes} | Member ${channelMention(guildData.logMember)}` : `${emoji.answer.no} | Member`}
							${guildData.logMod ? `${emoji.answer.yes} | Moderation ${channelMention(guildData.logMod)}` : `${emoji.answer.no} | Moderation`}
							${guildData.logMsg ? `${emoji.answer.yes} | Message ${channelMention(guildData.logMsg)}` : `${emoji.answer.no} | Message`}
							${guildData.logServer ? `${emoji.answer.yes} | Server ${channelMention(guildData.logServer)}` : `${emoji.answer.no} | Server`}
						`);

				await interaction.reply({
					embeds: [logsData],
					flags: MessageFlags.Ephemeral,
				});
			}
			else {
				await interaction.reply({
					content: `${emoji.answer.no} | The log is disable on the server`,
					flags: MessageFlags.Ephemeral,
				});
			}
			return;
		}
		case 'logs_auto': {
			if (!await isOwner(interaction.user.id)) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for owner`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			if (guildData.logEnable) {
				await interaction.reply({
					content: `${emoji.answer.error} | The log is already setup on this server`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			const roles = interaction.guild.roles.cache
				.filter((role) => !role.managed && role.id !== interaction.guild.id)
				.sort((a, b) => b.position - a.position);

			const menu = new StringSelectMenuBuilder()
				.setCustomId('role_select')
				.setPlaceholder('Choose the role that will have logs access')
				.setMinValues(1)
				.setMaxValues(Math.min(roles.size, 25))
				.addOptions(
					roles.map((role) =>
						new StringSelectMenuOptionBuilder()
							.setLabel(role.name)
							.setValue(role.id),
					),
				);

			const roleSelection: ActionRowBuilder<StringSelectMenuBuilder> =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

			const permSelector: EmbedBuilder = new EmbedBuilder()
				.setTitle('Which role will have access')
				.setColor(guildData.color)
				.setFooter({
					text: guildData.footer,
				});

			const msg = await interaction.reply({
				embeds: [permSelector],
				components: [roleSelection],
			});
			const collector = msg.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				time: 60_000,
				max: 25,
			});
			collector.on('end', (collected) => {
				void (async () => {
					if (collected.size === 0) {
						await interaction.editReply({
							content:
                  '⏰ | Too many time to select roles allowed to see the logs',
							embeds: [],
							components: [],
						});
					}
				})();
			});
			collector.on(
				'collect',
				async (selectInteraction: StringSelectMenuInteraction) => {
					if (selectInteraction.user.id !== interaction.user.id) {
						void selectInteraction.reply({
							content: `${emoji.answer.no} | You cannot use this selector !`,
							ephemeral: true,
						});
						return;
					}
					const selectedRoles = selectInteraction.values;
					const permissionOverwrites = [
						{
							id: interaction.guild.roles.everyone.id,
							deny: [
								PermissionsBitField.Flags.ViewChannel,
								PermissionsBitField.Flags.SendMessages,
							],
						},
						...selectedRoles.map((id) => ({
							id,
							allow: [PermissionsBitField.Flags.ViewChannel],
						})),
					];

					const category = await interaction.guild.channels.create({
						name: 'Logs',
						type: ChannelType.GuildCategory,
						permissionOverwrites,
					});

					const logBot = await interaction.guild.channels.create({
						name: 'bot-logs',
						type: ChannelType.GuildText,
						parent: category,
						permissionOverwrites,
					});

					const logChannels = await interaction.guild.channels.create({
						name: 'channel-logs',
						type: ChannelType.GuildText,
						parent: category,
						permissionOverwrites,
					});

					const logMember = await interaction.guild.channels.create({
						name: 'member-logs',
						type: ChannelType.GuildText,
						parent: category,
						permissionOverwrites,
					});

					const logMod = await interaction.guild.channels.create({
						name: 'mod-logs',
						type: ChannelType.GuildText,
						parent: category,
						permissionOverwrites,
					});

					const logMsg = await interaction.guild.channels.create({
						name: 'message-logs',
						type: ChannelType.GuildText,
						parent: category,
						permissionOverwrites,
					});

					const logServer = await interaction.guild.channels.create({
						name: 'server-logs',
						type: ChannelType.GuildText,
						parent: category,
						permissionOverwrites,
					});

					await prisma.guild.update({
						where: {
							id: interaction.guild.id,
						},
						data: {
							logEnable: true,
							logCategory: category.id,
							logBot: logBot.id,
							logChannels: logChannels.id,
							logMember: logMember.id,
							logMod: logMod.id,
							logMsg: logMsg.id,
							logServer: logServer.id,
						},
					});
					const mentionList = selectedRoles
						.map((id) => `- <@&${id}>`)
						.join('\n');
					const autoConfig = new EmbedBuilder()
						.setTitle('The logs category is created')
						.setDescription(
							`
						This following roles will have access to the logs.
						${mentionList}
					`,
						)
						.setColor(guildData.color)
						.setFooter({
							text: guildData.footer,
						});
					await selectInteraction.update({
						embeds: [autoConfig],
						components: [],
					});
					return;
				},
			);
			break;
		}
		case 'logs_disable': {
			if (!await isOwner(interaction.user.id)) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for owner`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			if (!guildData.logEnable) {
				await interaction.reply({
					content: `${emoji.answer.error} | The log is not setup on this server`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			if (!guildData.logCategory) {
				await interaction.reply({
					content: `${emoji.answer.error} | No log category found`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			const category = (await interaction.guild.channels.fetch(
				guildData.logCategory,
			)) as CategoryChannel | null;
			if (!category) {
				await interaction.reply({
					content: `${emoji.answer.error} | Category not found`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			try {
				for (const channel of category.children.cache.values()) {
					await channel.delete(
						`Delete cat of ${channel.name} (by ${interaction.user.username})`,
					);
				}
				await category.delete(
					`Delete cat of ${category.name} (by ${interaction.user.username})`,
				);
				await interaction.reply({
					content: `${emoji.answer.yes} | Disabled the logs of the guild`,
					flags: MessageFlags.Ephemeral,
				});
			}
			catch (err: unknown) {
				await interaction.reply({
					content: `${emoji.answer.error} | Cannot suppress the category's channels`,
					flags: MessageFlags.Ephemeral,
				});
				log.error(err, 'Cannot suppress the category\'s channels');
				return;
			}
			await prisma.guild.update({
				where: {
					id: interaction.guild.id,
				},
				data: {
					logEnable: false,
					logCategory: null,
					logBot: null,
					logChannels: null,
					logMember: null,
					logMod: null,
					logMsg: null,
					logServer: null,
				},
			});
			break;
		}
		default:
			log.error(new Error(`no choice on logs command ${choice}`), 'Invalid logs command choice');
			await interaction.reply({
				content: `${emoji.answer.error} | Invalid choice`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
	},
};
