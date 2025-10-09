import { GuildMember } from 'discord.js';

export function parseMessage(template: string, member: GuildMember): string {
	const placeholders = new Map<string, string | (() => string)>([
		['{user.mention}', `<@${member.id}>`],
		['{user.name}', member.user.username],
		['{user.tag}', member.user.tag],
		['{user.id}', member.id],

		['{server.name}', member.guild.name],
		['{server.id}', member.guild.id],
		['{server.member.count}', () => member.guild.memberCount.toString()],
		['{server.owner}', () => `<@${member.guild.ownerId}>`],

		['{date.now}', () => new Date().toLocaleString('fr-FR')],
	]);

	for (const [key, value] of placeholders.entries()) {
		template = template.replace(
			new RegExp(key, 'g'),
			typeof value === 'function' ? value() : value,
		);
	}

	return template;
}
