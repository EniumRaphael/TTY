import { prisma } from '../../lib/prisma.ts';
import {
	ActionRowBuilder,
	ChannelType,
	PermissionsBitField,
	ComponentType,
	channelMention,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	SlashCommandBuilder,
	MessageFlags,
	SlashCommandBuilder,
	EmbedBuilder,
} from 'discord.js';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };

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
				),
		),
	async execute(interaction: CommandInteraction) {
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
		let userData: User;
		try {
			userData = await prisma.user.findUnique({
				where: {
					id: interaction.user.id,
				},
			});
		}
		catch (err) {
			throw `\t⚠️ | Cannot get the database connection!\n\t\t(${err}).`;
			await interaction.reply({
				content: `${emoji.answer.error} | Cannot connect to the database`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const choice: string = interaction.options.getString('action');
		switch (choice) {
		case 'logs_show': {
			if (!userData.isOwner) {
				await interaction.reply({
					content: `${emoji.answer.no} | This command is only for owner`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			if (guildData.logEnable) {
				const logsData: EmbedBuilder = new EmbedBuilder()
					.setTitle(`Logs for ${interaction.guild.name}`)
					.setColor(`${guildData.color}`)
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
			if (!userData.isOwner) {
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

			const roles = interaction.guild?.roles.cache
				.filter((role) => !role.managed && role.id !== interaction.guild?.id)
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

			const roleSelection =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

			const permSelector: EmbedBuilder = new EmbedBuilder()
				.setTitle('Which role will have access')
				.setColor(`${guildData.color}`)
				.setFooter({
					text: guildData.footer,
				});

			const msg = await interaction.reply({
				embeds: [permSelector],
				components: [roleSelection],
				flags: MessageFlags.fetchReply,
			});
			const collector = msg.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				time: 60_000,
				max: 25,
			});
			collector.on(
				'collect',
				async (selectInteraction: StringSelectMenuInteraction) => {
					if (selectInteraction.user.id !== interaction.user.id) {
						selectInteraction.reply({
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

					const category = (await interaction.guild.channels.create({
						name: 'Logs',
						type: ChannelType.GuildCategory,
						permissionOverwrites,
					})) as CategoryChannel;

					const logBot = (await interaction.guild.channels.create({
						name: 'bot-logs',
						type: ChannelType.GuildText,
						parent: category,
						permissionOverwrites,
					})) as TextChannel;

					const logChannels = (await interaction.guild.channels.create({
						name: 'channel-logs',
						type: ChannelType.GuildText,
						parent: category,
						permissionOverwrites,
					})) as TextChannel;

					const logMember = (await interaction.guild.channels.create({
						name: 'member-logs',
						type: ChannelType.GuildText,
						parent: category,
						permissionOverwrites,
					})) as TextChannel;

					const logMod = (await interaction.guild.channels.create({
						name: 'mod-logs',
						type: ChannelType.GuildText,
						parent: category,
						permissionOverwrites,
					})) as TextChannel;

					const logMsg = (await interaction.guild.channels.create({
						name: 'message-logs',
						type: ChannelType.GuildText,
						parent: category,
						permissionOverwrites,
					})) as TextChannel;

					const logServer = (await interaction.guild.channels.create({
						name: 'server-logs',
						type: ChannelType.GuildText,
						parent: category,
						permissionOverwrites,
					})) as TextChannel;

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
						.setColor(`${guildData.color}`)
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
		default:
			console.error(`no choice on logs command ${choice}`);
			return;
		}
	},
};
