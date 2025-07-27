import { prisma } from '../../lib/prisma.ts';
import { userMention, roleMention, MessageFlags, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

function getUserRoles(target: GuildMember): string {
	const roles = target.roles.cache
	.filter(role => role.id !== target.guild.id)
	.sort((a, b) => b.position - a.position)
	.map(role => `${roleMention(role.id)}`);

	return roles.length > 0 ? roles.join(', ') : 'Aucun rôle';
}

function getUserBadges(userData: {
	isDev?: boolean;
	isEnium?: boolean;
	isBuyer?: boolean;
	isOwner?: boolean;
}): string {
	const badges: string[] = [];

	if (userData.isDev)
		badges.push("<:dev:1398755085441564772>");
	if (userData.isEnium)
		badges.push("<:enium_staff:1398755055930179586>");
	if (userData.isPwn)
		badges.push("<:dash:1398755072317325403>");
	if (userData.isBuyer)
		badges.push("<a:buyer:1398757139085922336>");
	if (userData.isOwner)
		badges.push("<a:owner:1398757148078637167>");

	return badges.length > 0 ? badges.join(" ") : "Aucun badge";
}

export default {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('Show the information of one of these cathegories (user, server, bot)')
		.addSubcommand(subcommand => subcommand
			.setName('user')
			.setDescription('Show the information of one user')
			.addUserOption(option =>
				option.setName('target')
				.setDescription('The user to show the information')
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName('server')
			.setDescription('Show the information of the server')
		),
	async execute(interaction: CommandInteraction) {
		let guildData: Guild;
		try {
			guildData = await prisma.guild.findUnique({
				where: {
					id: interaction.guild.id
				}
			});
		} catch (err) {
			console.error(`\t⚠️ | INFO => Cannot get the database connection!\n\t\t(${err}).`);
		}
		const subcommand: string = interaction.options.getSubcommand();
		switch (subcommand) {
			case 'user':
				const targetGlobal: GuildMember = interaction.options.getUser('target') || interaction.user;
				await targetGlobal.fetch();
				let userData: User;
				try {
					userData = await prisma.user.findUnique({
						where: {
							id: targetGlobal.id
						}
					});
				} catch (err) {
					console.error(`\t⚠️ | USERINFO => Cannot get the database connection!\n\t\t(${err}).`);
				}
				let targetServer: GuildMember;
		
				try {
					targetServer = await interaction.guild.members.fetch(targetGlobal.id);
				} catch (err) {
					console.error(`\t⚠️ | USERINFO => Cannot get the targetServer!\n\t\t(${err}).`);
					return ;
				}
				const userResult: EmbedBuilder = new EmbedBuilder()
					.setTitle(`${targetGlobal.displayName}'s information`)
					.setColor(`${targetServer.displayHexColor}`)
					.setThumbnail(`${targetGlobal.displayAvatarURL()}`)
					.setFooter({
						text: guildData.footer
					})
					.setImage(targetGlobal.bannerURL({
						size: 1024,
						dynamic: true
					}))
					.setDescription(`
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
					`)
				await interaction.reply({
					embeds: [
						userResult
					],
					flags: MessageFlags.Ephemeral
				});
				return;
			case 'server':
				const guild: Guild = interaction.guild;
				const serverResult: EmbedBuilder = new EmbedBuilder()
					.setTitle(`${guild.name} Informations`)
					.setColor(guildData.color)
					.setThumbnail(guild.iconURL({dynamic: true, size: 1024}))
					.setFooter({
						text: guildData.footer
					})
					.setImage(guild.bannerURL({dynamic: false, size: 2048}))
					.setDescription(`
						**🆔 | ID:**
						${guild.id}

						**🖊️ | Description:**
						${guild.description || "No description given."}
						**🔗 | VanityLink:**
						${guild.vanityURLCode || "No custom link."}

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
					`)
				await interaction.reply({
					embeds: [
						serverResult
					],
					flags: MessageFlags.Ephemeral
				});
		}
	}
}
