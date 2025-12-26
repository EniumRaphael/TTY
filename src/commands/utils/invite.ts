import { prisma } from '@lib/prisma';
import { ActionRowBuilder, SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandUserOption } from '@discordjs/builders';
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
	Guild,
	User,
	GuildMember,
} from 'discord.js';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };
import { Guild as GuildPrisma, User as UserPrisma, GuildUser as GuildUserPrisma } from '@prisma/client';
import { log } from '@lib/log';
import { isOwner } from '@lib/perm';

type GuildUserPrismaUser = GuildUserPrisma & {
  user: User;
};

export default {
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('Show the invitation information of a user or the leaderboard')
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder =>
			subcommand
				.setName('show')
				.setDescription('Show the invitation of one user')
				.addUserOption((option: SlashCommandUserOption): SlashCommandUserOption =>
					option
						.setName('target')
						.setDescription('The user to show the invitation'),
				),
		)
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder =>
			subcommand
				.setName('leaderboard')
				.setDescription('Show the invatation leaderboard of the server'),
		),
	async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.guild) {
			await interaction.reply({
				content: `${emoji.answer.error} | This command can only be used in a guild`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const guild: Guild = interaction.guild;
		const guildId: string = guild.id;
		const executor: User = interaction.user;
		const executorId: string = executor.id;

		let guildData: GuildPrisma | null;
		try {
			guildData = await prisma.guild.findUnique({
				where: {
					id: guildId,
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

		let userData: UserPrisma | null;
		try {
			userData = await prisma.user.findUnique({
				where: {
					id: executorId,
				},
			});
		}
		catch (err: unknown) {
			const errorMessage: string = err instanceof Error ? err.message : String(err);
			throw new Error(`\t⚠️ | Cannot get the database connection!\n\t\t(${errorMessage}).`);
		}

		if (!userData) {
			await interaction.reply({
				content: `${emoji.answer.error} | User data not found`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const subcommand: string = interaction.options.getSubcommand();
		switch (subcommand) {
		case 'show': {
			const targetGlobal: GuildMember = interaction.options.getUser('target') || interaction.user;
			const allGuildUsers = await prisma.guildUser.findMany({
				where: { guildId },
				orderBy: {
					invitationCount: 'desc',
				},
			});
			const rank = allGuildUsers.findIndex((gu) => gu.userId === targetGlobal.id) + 1;

			const guildUser: GuildUserPrisma | null = await prisma.guildUser.findUnique({
				where: {
					userId_guildId: {
						userId: targetGlobal.id,
						guildId: guildId,
					},
				},
			});
			const leaderboardEmbed: EmbedBuilder = new EmbedBuilder()
				.setTitle(`📇 | Invite of ${targetGlobal.username}`)
				.setColor(guildData.color)
				.setFooter({
					text: guildData.footer,
				})
				.setDescription(`
						Rank: ${rank}
						Invitation: ${guildUser?.invitationCount > 0 ? guildUser?.invitationCount : 'None'}
					`);
			await interaction.reply({
				embeds: [
					leaderboardEmbed,
				],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		case 'leaderboard': {
			const topInviters: GuildUserPrismaUser[] = await prisma.guildUser.findMany({
				where: {
					guildId: guildId,
				},
				orderBy: {
					invitationCount: 'desc',
				},
				take: 10,
				include: {
					user: true,
				},
			});
			const leaderboard: string = topInviters.map((guildUser: GuildUserPrismaUser, rank: number): string => {
				const member: GuildMember | null = guild.members.cache.get(guildUser.userId) ?? null;
				if (member && guildUser.invitationCount != 0) {return `**${rank + 1}.** ${member?.user.username} (${guildUser.invitationCount} invites)`;}
			})
				.join('\n');
			const leaderboardEmbed: EmbedBuilder = new EmbedBuilder()
				.setTitle('🏆 | Invite Leaderboard')
				.setColor(guildData.color)
				.setFooter({
					text: guildData.footer,
				})
				.setDescription(leaderboard);
			await interaction.reply({
				embeds: [
					leaderboardEmbed,
				],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		default:
			log.error(new Error(`no invite command nammed ${subcommand}`), 'Invalid invite command');
			await interaction.reply({
				content: `${emoji.answer.error} | Invalid command`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
	},
};
