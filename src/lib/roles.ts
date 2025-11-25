import { GuildMember, roleMention } from 'discord.js';

export function getUserRoles(target: GuildMember): string {
	const roles = target.roles.cache
		.filter((role) => role.id !== target.guild.id)
		.sort((a, b) => b.position - a.position)
		.map((role) => roleMention(role.id));

	return roles.length > 0 ? roles.join(', ') : 'No role';
}
