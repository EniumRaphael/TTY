import { Events } from 'discord.js';
import chalk from 'chalk';
const isDebug = process.argv.includes('--debug');

export default {
	name: Events.Debug,
	once: false,
	async execute(info: string) {
		if (isDebug) {console.debug(chalk.blueBright('🔍 |', info));}
	},
};
