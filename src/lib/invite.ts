import { Collection, Invite } from 'discord.js';

export const invitesCache = new Map<string, Collection<string, Invite>>();
