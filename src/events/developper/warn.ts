import { Events } from 'discord.js';
import chalk from 'chalk';

export default {
	name: Events.Warn,
	once: false,
	async execute(warn: string) {
		console.warn(chalk.yellow('⚠️ |', warn));
	},
};
