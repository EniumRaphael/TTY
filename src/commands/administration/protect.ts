import {
	SlashCommandBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	ComponentType,
	ChatInputCommandInteraction,
	MessageFlags,
} from 'discord.js';
import { prisma } from '../../lib/prisma';
import { Guild as GuildPrisma } from '@prisma/client';

const modules = {
	'anti-channel': 'Block channel creation/deletion',
	'anti-rank': 'Block dangerous rank modifications',
	'anti-perm': 'Block dangerous permissions on roles',
	'anti-massban': 'Prevent mass bans',
	'anti-mass-mention': 'Prevent mass mentions',
	'anti-bot': 'Prevent unauthorized bots',
};

function camel(str: string): string {
	return str
		.split('-')
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join('');
}

function getEmbed(guildData: GuildPrisma): EmbedBuilder {
	let description: string = '\n';
	for (const [key, label] of Object.entries(modules)) {
		const field = `protect${camel(key)}`;
		const enabled = guildData[field as keyof typeof guildData] as boolean;
		description += `- **${label}**: ${enabled ? '✅' : '❌'}\n`;
	}
	const baseEmbed = new EmbedBuilder()
		.setTitle('🛡️ | Protection Manager')
		.setDescription(description)
		.setFooter({
			text: guildData.footer,
		})
		.setColor(guildData.color);
	return baseEmbed;
}

function getButton(selected: string, active: boolean): ActionRowBuilder<ButtonBuilder> {
	const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(`enable_${selected}`)
			.setLabel('Enable')
			.setEmoji('✅')
			.setDisabled(!active)
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId(`disable_${selected}`)
			.setLabel('Disable')
			.setEmoji('❌')
			.setDisabled(!active)
			.setStyle(ButtonStyle.Danger),
		new ButtonBuilder()
			.setCustomId('return')
			.setLabel('Return')
			.setEmoji('↩️')
			.setStyle(ButtonStyle.Secondary),
	);
	return button;
}

export default {
	data: new SlashCommandBuilder()
		.setName('protect')
		.setDescription('Manage guild protections interactively'),

	async execute(interaction: ChatInputCommandInteraction) {
		const guildId: string | null = interaction.guildId!;
		let guildData: GuildPrisma = await prisma.guild.findUnique({
			where: {
				id: guildId,
			},
		});
		if (!guildData) {
			guildData = await prisma.guild.create({
				data: {
					id: guildId,
				},
			});
		}
		const menu: StringSelectMenuBuilder = new StringSelectMenuBuilder()
			.setCustomId('select_protect')
			.setPlaceholder('Select a module')
			.addOptions(
				Object.entries(modules).map(([value, label]) => ({
					label,
					value,
				})),
			);
		const msg = await interaction.reply({
			embeds: [getEmbed(guildData)],
			components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
			flags: MessageFlags.Ephemeral,
		});
		const collector = msg.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 5 * 60 * 1000,
		});
		collector.on('collect', async (selectInteraction) => {
			if (selectInteraction.user.id !== interaction.user.id) {
				return selectInteraction.reply({
					content: '❌ You cannot use this menu.',
					flags: MessageFlags.Ephemeral,
				});
			}
			const selected: string = selectInteraction.values[0] as keyof typeof modules;
			const enabled = guildData![`protect${camel(selected)}`];
			const moduleEmbed = new EmbedBuilder()
				.setTitle(`⚙️ | Manage ${modules[selected]}`)
				.setFooter({
					text: guildData.footer,
				})
				.setDescription(
					`This module is currently: **${enabled ? 'Enabled ✅' : 'Disabled ❌'}**`,
				)
				.setColor(enabled ? '#00ff00' : '#ff0000');
			await selectInteraction.update({
				embeds: [moduleEmbed],
				components: [getButton(selected, true)],
			});
		});
		const buttonCollector = msg.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 5 * 60 * 1000,
		});
		buttonCollector.on('collect', async (btnInteraction) => {
			if (btnInteraction.user.id !== interaction.user.id) {
				return btnInteraction.reply({
					content: '❌ | You cannot use these buttons.',
					flags: MessageFlags.Ephemeral,
				});
			}
			if (btnInteraction.customId === 'return') {
				return btnInteraction.update({
					embeds: [getEmbed(guildData)],
					components: [
						new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
					],
				});
			}
			const [action, moduleName] = btnInteraction.customId.split('_');
			const field = `protect${camel(moduleName)}`;
			await prisma.guild.update({
				where: {
					id: guildId,
				},
				data: {
					[field]: action === 'enable',
				},
			});
			guildData = await prisma.guild.findUnique({
				where: {
					id: guildId,
				},
			});
			await btnInteraction.update({
				embeds: [
					new EmbedBuilder()
						.setTitle(`⚙️ | Manage ${modules[moduleName as keyof typeof modules]}`)
						.setFooter({
							text: guildData.footer,
						})
						.setDescription(
							`This module is now: **${
								action === 'enable' ? '✅ Enabled' : '❌ Disabled'
							}**`,
						)
						.setColor(action === 'enable' ? '#00ff00' : '#ff0000'),
				],
				components: [getButton(null, false)],
			});
		});
	},
};

