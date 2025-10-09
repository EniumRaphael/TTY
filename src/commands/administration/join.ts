import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import { prisma } from '../../lib/prisma';
import { Guild as GuildPrisma } from '@prisma/client';

function getEmbed(guildData: GuildPrisma): EmbedBuilder {
	return new EmbedBuilder()
		.setTitle('⚙️ | Messages Configuration')
		.setDescription(
			[
				`📥 **Welcome message**: ${guildData.welcomeEnabled ? '✅ Enabled' : '❌ Disabled'}`,
				`\`${guildData.welcomeMessage || 'None'}\`\n`,
				`📤 **Leave message**: ${guildData.leaveEnabled ? '✅ Enabled' : '❌ Disabled'}`,
				`\`${guildData.leaveMessage || 'None'}\``,
			].join('\n'),
		)
		.setColor(guildData.color);
}

function getPlaceholdersEmbed(guildData: GuildPrisma): EmbedBuilder {
	return new EmbedBuilder()
		.setTitle('ℹ️ | Placeholders')
		.setDescription(
			[
				'`{user.mention}` → Mention the user',
				'`{user.username}` → Username only',
				'`{user.tag}` → Username + discriminator',
				'`{server.name}` → Server name',
				'`{server.memberCount}` → Current member count',
			].join('\n'),
		)
		.setColor(guildData.color);
}

export const data = new SlashCommandBuilder()
	.setName('join')
	.setDescription('Configure welcome and leave messages');

export async function execute(interaction: ChatInputCommandInteraction) {
	const guildId = interaction.guildId!;
	let guildData = await prisma.guild.findUnique({ where: { id: guildId } });
	if (!guildData) {
		guildData = await prisma.guild.create({ data: { id: guildId } });
	}

	const mainRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('toggle_welcome')
			.setLabel(guildData.welcomeEnabled ? 'Disable welcome' : 'Enable welcome')
			.setStyle(guildData.welcomeEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId('edit_welcome')
			.setLabel('Edit welcome message')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('toggle_leave')
			.setLabel(guildData.leaveEnabled ? 'Disable leave' : 'Enable leave')
			.setStyle(guildData.leaveEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId('edit_leave')
			.setLabel('Edit leave message')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('placeholders')
			.setLabel('Placeholders')
			.setEmoji('ℹ️')
			.setStyle(ButtonStyle.Secondary),
	);

	await interaction.reply({
		embeds: [getEmbed(guildData)],
		components: [mainRow],
		flags: MessageFlags.Ephemeral,
	});

	const collector = interaction.channel!.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: 60_000,
	});

	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply({
				content: '❌ You are not allowed to use this panel.',
				ephemeral: true,
			});
		}

		// ℹ️ Show placeholders
		if (i.customId === 'placeholders') {
			const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId('back_to_main')
					.setLabel('↩️ Back')
					.setStyle(ButtonStyle.Secondary),
			);
			await interaction.editReply({
				embeds: [getPlaceholdersEmbed(guildData)],
				components: [backRow],
			});
			return;
		}

		// ↩️ Back to main panel
		if (i.customId === 'back_to_main') {
			await interaction.editReply({
				embeds: [getEmbed(guildData)],
				components: [mainRow],
			});
			return;
		}

		// 🟢 Toggle welcome
		if (i.customId === 'toggle_welcome') {
			guildData = await prisma.guild.update({
				where: { id: guildId },
				data: { welcomeEnabled: !guildData.welcomeEnabled },
			});
			await interaction.editReply({
				embeds: [getEmbed(guildData)],
				components: [mainRow],
			});
			return;
		}

		// 🟢 Toggle leave
		if (i.customId === 'toggle_leave') {
			guildData = await prisma.guild.update({
				where: { id: guildId },
				data: { leaveEnabled: !guildData.leaveEnabled },
			});
			await interaction.editReply({
				embeds: [getEmbed(guildData)],
				components: [mainRow],
			});
			return;
		}

		// ✏️ Open modal for editing messages
		if (i.customId === 'edit_welcome' || i.customId === 'edit_leave') {
			const modal = new ModalBuilder()
				.setCustomId(i.customId + '_modal')
				.setTitle('Edit Message');

			const input = new TextInputBuilder()
				.setCustomId('message')
				.setLabel('Message content (placeholders allowed)')
				.setStyle(TextInputStyle.Paragraph)
				.setPlaceholder('Ex: Welcome {user.mention} to {server.name}!')
				.setValue(
					i.customId === 'edit_welcome'
						? guildData.welcomeMessage || ''
						: guildData.leaveMessage || '',
				);

			modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
			await i.showModal(modal);
		}
	});

	// Handle modal submissions
	interaction.client.on('interactionCreate', async (modalInt) => {
		if (!modalInt.isModalSubmit()) return;

		if (modalInt.customId === 'edit_welcome_modal') {
			const msg = modalInt.fields.getTextInputValue('message');
			guildData = await prisma.guild.update({
				where: { id: guildId },
				data: { welcomeMessage: msg },
			});
			await modalInt.reply({
				content: '✅ | Welcome message updated!',
				ephemeral: true,
			});
			await interaction.editReply({
				embeds: [getEmbed(guildData)],
				components: [mainRow],
			});
		}

		if (modalInt.customId === 'edit_leave_modal') {
			const msg = modalInt.fields.getTextInputValue('message');
			guildData = await prisma.guild.update({
				where: { id: guildId },
				data: { leaveMessage: msg },
			});
			await modalInt.reply({
				content: '✅ | Leave message updated!',
				ephemeral: true,
			});
			await interaction.editReply({
				embeds: [getEmbed(guildData)],
				components: [mainRow],
			});
		}
	});
}
