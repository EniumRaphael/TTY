import { prisma } from '../../lib/prisma.ts';
import { MessageFlags, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

function getUserRoles(target: GuildMember): string {
	const roles = target.roles.cache
	.filter(role => role.id !== target.guild.id)
	.sort((a, b) => b.position - a.position)
	.map(role => `<@&${role.id}>`);

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
		.setName('userinfo')
		.setDescription('Show the information of the user')
		.addUserOption(option =>
			option.setName('target')
			.setDescription('The user to get the information')
		),
	async execute(interaction: CommandInteraction) {
		const targetGlobal: GuildMember = interaction.options.getUser('target') || interaction.user;
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

		let toSend: EmbedBuilder = new EmbedBuilder()
			.setTitle(`${targetGlobal.displayName}'s information`)
			.setColor(`${targetServer.displayHexColor}`)
			.setThumbnail(`${targetGlobal.displayAvatarURL()}`)
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
				toSend
			],
			flags: MessageFlags.Ephemeral
		});
	}
}
