import { ActionRowBuilder, SlashCommandBuilder, ButtonBuilder } from '@discordjs/builders';
import {
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
	EmbedBuilder,
	Interaction,
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

function createMainRow(
	guildData: GuildPrisma,
): ActionRowBuilder<ButtonBuilder> {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('toggle_welcome')
			.setLabel(guildData.welcomeEnabled ? 'Disable welcome' : 'Enable welcome')
			.setStyle(
				guildData.welcomeEnabled ? ButtonStyle.Danger : ButtonStyle.Success,
			),
		new ButtonBuilder()
			.setCustomId('edit_welcome')
			.setLabel('Edit welcome message')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('toggle_leave')
			.setLabel(guildData.leaveEnabled ? 'Disable leave' : 'Enable leave')
			.setStyle(
				guildData.leaveEnabled ? ButtonStyle.Danger : ButtonStyle.Success,
			),
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
}

export const data = new SlashCommandBuilder()
	.setName('join')
	.setDescription('Configure welcome and leave messages');

export async function execute(interaction: ChatInputCommandInteraction) {
	const guildId = interaction.guildId;
	if (!guildId) {
		await interaction.reply({
			content: '❌ This command can only be used in a guild.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	let currentGuildData: GuildPrisma | null = await prisma.guild.findUnique({
		where: { id: guildId },
	});
	if (!currentGuildData) {
		currentGuildData = await prisma.guild.create({ data: { id: guildId } });
	}

	const mainRow: ActionRowBuilder = createMainRow(currentGuildData);

	await interaction.reply({
		embeds: [getEmbed(currentGuildData)],
		components: [mainRow],
		flags: MessageFlags.Ephemeral,
	});

	const collector = interaction.channel?.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: 60_000,
	});

	if (!collector) {
		return;
	}

	collector.on('collect', (i) => {
		void (async () => {
			if (i.user.id !== interaction.user.id) {
				await i.reply({
					content: '❌ You are not allowed to use this panel.',
					flags: MessageFlags.Ephemeral,
				});
				return;
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
					embeds: [getPlaceholdersEmbed(currentGuildData)],
					components: [backRow],
				});
				return;
			}

			// ↩️ Back to main panel
			if (i.customId === 'back_to_main') {
				await interaction.editReply({
					embeds: [getEmbed(currentGuildData)],
					components: [createMainRow(currentGuildData)],
				});
				return;
			}

			// 🟢 Toggle welcome
			if (i.customId === 'toggle_welcome') {
				const updatedGuildData = await prisma.guild.update({
					where: { id: guildId },
					data: { welcomeEnabled: !currentGuildData.welcomeEnabled },
				});
				currentGuildData = updatedGuildData;
				const newMainRow = createMainRow(updatedGuildData);
				await interaction.editReply({
					embeds: [getEmbed(updatedGuildData)],
					components: [newMainRow],
				});
				return;
			}

			// 🟢 Toggle leave
			if (i.customId === 'toggle_leave') {
				const updatedGuildData = await prisma.guild.update({
					where: { id: guildId },
					data: { leaveEnabled: !currentGuildData.leaveEnabled },
				});
				currentGuildData = updatedGuildData;
				const newMainRow = createMainRow(updatedGuildData);
				await interaction.editReply({
					embeds: [getEmbed(updatedGuildData)],
					components: [newMainRow],
				});
				return;
			}

			// ✏️ Open modal for editing messages
			if (i.customId === 'edit_welcome' || i.customId === 'edit_leave') {
				const modal = new ModalBuilder()
					.setCustomId(`${i.customId}_modal`)
					.setTitle('Edit Message');

				const input = new TextInputBuilder()
					.setCustomId('message')
					.setLabel({ name: 'Message content (placeholders allowed)' })
					.setStyle(TextInputStyle.Paragraph)
					.setPlaceholder('Ex: Welcome {user.mention} to {server.name}!')
					.setValue(
						i.customId === 'edit_welcome'
							? currentGuildData.welcomeMessage || ''
							: currentGuildData.leaveMessage || '',
					);

				modal.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(input),
				);
				await i.showModal(modal);
			}
		})();
	});

	// Handle modal submissions
	const modalHandler = (modalInt: Interaction) => {
		void (async () => {
			if (
				!modalInt.isModalSubmit() ||
        modalInt.user.id !== interaction.user.id
			) {
				return;
			}

			const typedModalInt = modalInt;

			if (typedModalInt.customId === 'edit_welcome_modal') {
				const msg = typedModalInt.fields.getTextInputValue('message');
				const updatedGuildData = await prisma.guild.update({
					where: { id: guildId },
					data: { welcomeMessage: msg },
				});
				currentGuildData = updatedGuildData;
				await typedModalInt.reply({
					content: '✅ | Welcome message updated!',
					ephemeral: true,
				});
				const newMainRow = createMainRow(updatedGuildData);
				await interaction.editReply({
					embeds: [getEmbed(updatedGuildData)],
					components: [newMainRow],
				});
			}

			if (typedModalInt.customId === 'edit_leave_modal') {
				const msg = typedModalInt.fields.getTextInputValue('message');
				const updatedGuildData = await prisma.guild.update({
					where: { id: guildId },
					data: { leaveMessage: msg },
				});
				currentGuildData = updatedGuildData;
				await typedModalInt.reply({
					content: '✅ | Leave message updated!',
					ephemeral: true,
				});
				const newMainRow = createMainRow(updatedGuildData);
				await interaction.editReply({
					embeds: [getEmbed(updatedGuildData)],
					components: [newMainRow],
				});
			}
		})();
	};

	interaction.client.on('interactionCreate', modalHandler);

	collector.on('end', () => {
		interaction.client.off('interactionCreate', modalHandler);
	});
}
