import { Guild, GuildMember, User } from 'discord.js';

export function placeholder(text: string, member: GuildMember): string {
	const user: User = member.user;
	const guild: Guild = member.guild;

	const replacements: Record<string, string> = {
		'{user.mention}': user.toString(),
		'{user.name}': user.username,
		'{user.tag}': `${user.username}#${user.discriminator}`,
		'{guild.name}': guild.name,
		'{guild.count}': guild.memberCount.toString(),
	};
	let output: string = text;
	for (const key in replacements) {
		output = output.replaceAll(key, replacements[key]);
	}
	return output;
}
