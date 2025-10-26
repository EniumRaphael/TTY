import { prisma } from '@lib/prisma';
import { SlashCommandBuilder } from '@discordjs/builders';
import {
	userMention,
	roleMention,
	MessageFlags,
	EmbedBuilder,
	Guild,
} from 'discord.js';
import emoji from '../../../assets/emoji.json' assert { type: 'json' };
import { log } from '@lib/log';

function getGuildRoles(guild: Guild): string {
	const roles = guild.roles.cache
		.filter((role) => role.id !== guild.id)
		.sort((a, b) => b.position - a.position)
		.map((role) => roleMention(role.id));

	return roles.length > 0 ? roles.join(', ') : 'No role';
}

function getUserRoles(target: GuildMember): string {
	const roles = target.roles.cache
		.filter((role) => role.id !== target.guild.id)
		.sort((a, b) => b.position - a.position)
		.map((role) => roleMention(role.id));

	return roles.length > 0 ? roles.join(', ') : 'No role';
}

function getUserBadges(userData: {
  isDev?: boolean;
  isEnium?: boolean;
  isBuyer?: boolean;
  isOwner?: boolean;
}): string {
	const badges: string[] = [];

	if (userData.isDev) badges.push(emoji.badge.dev);
	if (userData.isEnium) badges.push(emoji.badge.enium);
	if (userData.isPwn) badges.push(emoji.badge.dash);
	if (userData.isBuyer) badges.push(emoji.badge.buyer);
	if (userData.isOwner) badges.push(emoji.badge.owner);

	return badges.length > 0 ? badges.join(' ') : 'Aucun badge';
}

export default {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription(
			'Show the infromation of one of these categories (user, server, bot)',
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('user')
				.setDescription('Show the infromation of one user')
				.addUserOption((option) =>
					option
						.setName('target')
						.setDescription('The user to show the infromation'),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('server')
				.setDescription('Show the infromation of the server'),
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
			log.error(err, 'Cannot get the database connection!');
			await interaction.reply({
				content: `${emoji.answer.error} | Cannot connect to the database`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const subcommand: string = interaction.options.getSubcommand();
		switch (subcommand) {
		case 'user': {
			const targetGlobal: GuildMember =
          interaction.options.getUser('target') || interaction.user;
			await targetGlobal.fetch();
			let userData: User;
			try {
				userData = await prisma.user.findUnique({
					where: {
						id: targetGlobal.id,
					},
				});
			}
			catch (err) {
				log.error(err, 'Cannot get the database connection!');
				await interaction.reply({
					content: `${emoji.answer.error} | Cannot connect to the database`,
					flags: MessageFlags.Ephemeral,
				});
			}
			let targetServer: GuildMember;

			try {
				targetServer = await interaction.guild.members.fetch(targetGlobal.id);
			}
			catch (err) {
				log.error(err, 'Cannot get the targetServer!');
				await interaction.reply({
					content: `${emoji.answer.error} | Cannot get the guild profile of the user`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			const userResult: EmbedBuilder = new EmbedBuilder()
				.setTitle(`${targetGlobal.displayName}'s information`)
				.setColor(`${guildData.color}`)
				.setThumbnail(
					`${targetGlobal.displayAvatarURL({ dynamic: true, size: 2048 })}`,
				)
				.setFooter({
					text: guildData.footer,
				})
				.setImage(
					targetGlobal.bannerURL({
						size: 2048,
						dynamic: true,
					}),
				).setDescription(`
						**👤 | Username:**
						${targetGlobal.username}
						**🆔 | ID:**
						${targetGlobal.id}

						**🔰 | Roles:**
						${getUserRoles(targetServer)}
						**🎖️ | Badges:**
						${getUserBadges(userData)}

						**🍼 | Account Creation:**
						<t:${parseInt(targetGlobal.createdTimestamp / 1000)}:f> (<t:${parseInt(targetGlobal.createdTimestamp / 1000)}:R>)
						**🛬 | Server Join:**
						<t:${parseInt(targetServer.joinedTimestamp / 1000)}:f> (<t:${parseInt(targetServer.joinedTimestamp / 1000)}:R>)
					`);
			await interaction.reply({
				embeds: [userResult],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		case 'server': {
			const guild: Guild = interaction.guild;
			const serverResult: EmbedBuilder = new EmbedBuilder()
				.setTitle(`${guild.name} Informations`)
				.setColor(guildData.color)
				.setThumbnail(guild.iconURL({ dynamic: true, size: 2048 }))
				.setFooter({
					text: guildData.footer,
				})
				.setImage(guild.bannerURL({ dynamic: true, size: 2048 }))
				.setDescription(`
						**🆔 | ID:**
						${guild.id}

						**🖊️ | Description:**
						${guild.description || 'No description given.'}
						**🔗 | VanityLink:**
						${guild.vanityURLCode || 'No custom link.'}

						**🆕 | Creation Date:**
						<t:${parseInt(guild.createdTimestamp / 1000)}:R>
						**👑 | Server owner**
						${userMention(guild.ownerId)}

						**🫂 | All Members:**
						${guild.members.cache.size}
						**🗣️ | Users:**
						${guild.members.cache.filter((m) => !m.user.bot).size}
						**🤖 | Bots:**
						${guild.members.cache.filter((m) => m.user.bot).size}

						**🏅 | Roles:**
						There is ${guild.roles.cache.size - 1} on __${guild.name}__
						${getGuildRoles(guild)}
					`);
			await interaction.reply({
				embeds: [serverResult],
				flags: MessageFlags.Ephemeral,
			});
		}
		}
	},
};
