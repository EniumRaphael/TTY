import { Events } from 'discord.js';
import chalk from 'chalk';

export default {
	name: Events.Error,
	once: false,
	async execute(error: string) {
		console.error(chalk.red('❌ |', error));
	},
};
