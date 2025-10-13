import { Guild } from 'discord.js';

export function getCorrectMention(guild: Guild, id: string): string {
	if (id === guild.id) {
		return '@everyone';
	}

	const role = guild.roles.cache.get(id);
	if (role) {
		return `<@&${id}>`;
	}

	const member = guild.members.cache.get(id);
	if (member) {
		return `<@${id}>`;
	}
	return `Unknown (${id})`;
}
