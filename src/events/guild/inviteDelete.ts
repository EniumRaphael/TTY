import {
	Collection,
	Events,
	Invite,
} from 'discord.js';
import { invitesCache } from '@lib/invite';

export default {
	name: Events.InviteDelete,
	async execute(invite: Invite) {
		if (!invite.guild) {
			return;
		}
		const guildId: string = invite.guild.id;
		const guildInvites: Collection<string, Invite> = invitesCache.get(guildId);
		console.debug(invite.code);
		guildInvites.delete(invite.code);
	},
};
