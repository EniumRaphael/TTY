import {
	SlashCommandBuilder,
	CommandInteraction,
	ActionRowBuilder,
	ChannelSelectMenuBuilder,
	ChannelType,
	ModalBuilder,
	TextInputBuilder,
	MessageFlags,
	ButtonStyle,
	ButtonBuilder,
	ChannelSelectMenuInteraction,
	GuildBasedChannel,
	TextInputStyle,
	MessageComponentInteraction,
	CacheType,
} from 'discord.js';
import { channelMention, EmbedBuilder } from '@discordjs/builders';
import { Guild as GuildPrisma } from '@prisma/client';
import { prisma } from '@lib/prisma';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };

function listPlaceholder(): string {
	let to_ret: string = '';
	to_ret += '{user.mention} → mentions the user\n';
	to_ret += '{user.name} → username\n';
	to_ret += '{user.tag} → username#0000\n';
	to_ret += '{guild.name} → server name\n';
	to_ret += '{guild.count} → number of the member in the guild\n';
	return to_ret;
}

export default {
	data: new SlashCommandBuilder()
		.setName('welcome')
		.setDescription('Configuration of the welcome system')
		.addStringOption((option) =>
			option
				.setName('action')
				.setDescription('What is the action you to perform')
				.setRequired(true)
				.addChoices(
					{
						name: 'Show',
						value: 'welcome_show',
					},
					{
						name: 'Join',
						value: 'welcome_join',
					},
					{
						name: 'Leave',
						value: 'welcome_leave',
					},
				),
		),

	async execute(interaction: CommandInteraction) {
		if (!(interaction.guild)) {
			await interaction.reply({
				content: `${emoji.answer.error} | This command can only be used in a guild`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const guildData: GuildPrisma = await prisma.guild.findUnique({
			where: {
				id: interaction.guild.id,
			},
		});


		const choice: string = interaction.options.getString('action', true);

		switch (choice) {
		case 'welcome_show': {
			const status: EmbedBuilder = new EmbedBuilder()
				.setTitle(`Welcome status for ${interaction.guild.name}`)
				.setColor(guildData.color)
				.setFooter({
					text: guildData.footer,
				})
				.setDescription(`
					${guildData.joinEnabled ? `${emoji.config.enable}` : `${emoji.config.disable}`} **Join message:**
					${guildData.joinEnabled ? `> in ${channelMention(guildData.joinChannel)} with the message \`${guildData.joinMessage}\`\n` : ''}
					${guildData.leaveEnabled ? `${emoji.config.enable}` : `${emoji.config.disable}`} **Leave message:**
					${guildData.leaveEnabled ? `> in ${channelMention(guildData.joinChannel)} with the message \`${guildData.leaveMessage}\`` : ''}
				`);
			await interaction.reply({
				embeds: [status],
				flags: MessageFlags.Ephemeral,
			});
			break;
		}
		case 'welcome_join': {
			const joinSelectMenu: ChannelSelectMenuBuilder = new ChannelSelectMenuBuilder()
				.setCustomId('join_select_channel')
				.setPlaceholder('Choose a channel to send the join notification')
				.addChannelTypes(ChannelType.GuildText);
			const joinDisable = new ButtonBuilder()
				.setCustomId('join_no_channel')
				.setLabel('Disabled')
				.setStyle(ButtonStyle.Danger);
			await interaction.reply({
				content: 'Select the channel where the join message will be send:',
				components: [
					new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(joinSelectMenu),
					new ActionRowBuilder<ButtonBuilder>().addComponents(joinDisable),
				],
				flags: MessageFlags.Ephemeral,
			});
			const joinReply: ChannelSelectMenuInteraction = await interaction.channel?.awaitMessageComponent({
				filter: i => i.user.id === interaction.user.id && (i.customId === 'join_select_channel' || i.customId === 'join_no_channel'),
				time: 60_000,
			});
			if (joinReply.customId == 'join_no_channel') {
				await prisma.guild.update({
					where: {
						id: interaction.guild.id,
					},
					data: {
						joinEnabled: false,
					},
				});
				await interaction.editReply({
					content: `${emoji.answer.yes} | The joining message is now **disabled**`,
					components: [],
				});
			}
			else {
				const joinChannel: string = joinReply!.values[0];
				const modal: ModalBuilder = new ModalBuilder()
					.setCustomId('join_modal')
					.setTitle('Join Form');
				const joinInput: TextInputBuilder = new TextInputBuilder()
					.setCustomId('join_msg')
					.setRequired(true)
					.setLabel('The new message for joinning user')
					.setStyle(TextInputStyle.Short);
				const placeholdersDisplay = new TextInputBuilder()
					.setCustomId('placeholder')
					.setRequired(false)
					.setStyle(TextInputStyle.Paragraph)
					.setLabel('The placeholders (ReadOnly)')
					.setValue(listPlaceholder());
				modal.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(joinInput),
					new ActionRowBuilder<TextInputBuilder>().addComponents(placeholdersDisplay),
				);
				await joinReply!.showModal(modal);

				const modalSubmit = await joinReply!.awaitModalSubmit({
					filter: i => i.user.id === interaction.user.id && i.customId === 'join_modal',
					time: 120_000,
				});
				const newJoinMsg: string = modalSubmit.fields.getTextInputValue('join_msg');
				const finalChannel: GuildBasedChannel | null = interaction.guild.channels.cache.get(joinChannel!);
				if (!finalChannel || !finalChannel.isTextBased()) {
					return modalSubmit.reply({
						content: `${emoji.answer.error} | The channel collected is invalid`,
						flags: MessageFlags.Ephemeral,
					});
				}

				await prisma.guild.update({
					where: {
						id: interaction.guild.id,
					},
					data: {
						joinEnabled: true,
						joinMessage: newJoinMsg,
						joinChannel: finalChannel.id,
					},
				});

				await modalSubmit.reply({
					content: `${emoji.answer.yes} | The joining message is now **enabled**`,
					flags: MessageFlags.Ephemeral,
				});
			}
			break;
		}
		case 'welcome_leave': {
			const leaveSelectMenu: ChannelSelectMenuBuilder = new ChannelSelectMenuBuilder()
				.setCustomId('leave_select_channel')
				.setPlaceholder('Choose a channel to send the leave notification')
				.addChannelTypes(ChannelType.GuildText);
			const leaveDisable = new ButtonBuilder()
				.setCustomId('leave_no_channel')
				.setLabel('Disabled')
				.setStyle(ButtonStyle.Danger);
			await interaction.reply({
				content: 'Select the channel where the leave message will be send:',
				components: [
					new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(leaveSelectMenu),
					new ActionRowBuilder<ButtonBuilder>().addComponents(leaveDisable),
				],
				flags: MessageFlags.Ephemeral,
			});
			const leaveReply: ChannelSelectMenuInteraction = await interaction.channel?.awaitMessageComponent({
				filter: i => i.user.id === interaction.user.id && (i.customId === 'leave_select_channel' || i.customId === 'leave_no_channel'),
				time: 60_000,
			});
			if (leaveReply.customId == 'leave_no_channel') {
				await prisma.guild.update({
					where: {
						id: interaction.guild.id,
					},
					data: {
						leaveEnabled: false,
					},
				});
				await interaction.editReply({
					content: `${emoji.answer.yes} | The leaving message is now **disabled**`,
					components: [],
				});
			}
			else {
				const leaveChannel: string = leaveReply!.values[0];
				const modal: ModalBuilder = new ModalBuilder()
					.setCustomId('leave_modal')
					.setTitle('leave Form');
				const leaveInput: TextInputBuilder = new TextInputBuilder()
					.setCustomId('leave_msg')
					.setRequired(true)
					.setLabel('The new message for leavening user')
					.setStyle(TextInputStyle.Short);
				const placeholdersDisplay = new TextInputBuilder()
					.setCustomId('placeholder')
					.setRequired(false)
					.setStyle(TextInputStyle.Paragraph)
					.setLabel('The placeholders (ReadOnly)')
					.setValue(listPlaceholder());
				modal.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(leaveInput),
					new ActionRowBuilder<TextInputBuilder>().addComponents(placeholdersDisplay),
				);
				await leaveReply!.showModal(modal);

				const modalSubmit = await leaveReply!.awaitModalSubmit({
					filter: i => i.user.id === interaction.user.id && i.customId === 'leave_modal',
					time: 120_000,
				});
				const newleaveMsg: string = modalSubmit.fields.getTextInputValue('leave_msg');
				const finalChannel: GuildBasedChannel | null = interaction.guild.channels.cache.get(leaveChannel!);
				if (!finalChannel || !finalChannel.isTextBased()) {
					return modalSubmit.reply({
						content: `${emoji.answer.error} | The channel collected is invalid`,
						flags: MessageFlags.Ephemeral,
					});
				}

				await prisma.guild.update({
					where: {
						id: interaction.guild.id,
					},
					data: {
						leaveEnabled: true,
						leaveMessage: newleaveMsg,
						leaveChannel: finalChannel.id,
					},
				});

				await modalSubmit.reply({
					content: `${emoji.answer.yes} | The leaving message is now **enabled**`,
					flags: MessageFlags.Ephemeral,
				});
			}
			break;
		}
		}
	},
};
