import { Collection, Events, Invite } from 'discord.js';
import { invitesCache } from '@lib/invite';

export default {
	name: Events.InviteCreate,
	async execute(invite: Invite) {
		if (!invite.guild) return;

		const guildId: string = invite.guild.id;
		const guildInvites: Collection<string, Invite> = invitesCache.get(guildId) ?? new Collection<string, Invite>();
		guildInvites.set(invite.code, invite);
		console.debug(invite.code);
		invitesCache.set(guildId, guildInvites);
	},
};
