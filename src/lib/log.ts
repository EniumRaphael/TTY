import chalk from 'chalk';

export const log = {
	warn: (err: unknown, str?: string) => {
		const error = err instanceof Error ? err : new Error(String(err));
		console.warn(chalk.yellowBright(`⚠️ | ${str ? ` during ${str}` : ''}`));
		console.warn(chalk.yellowBright(`\t${error.message}`));
		console.warn(chalk.yellowBright(`\tStack:\n${error.stack ?? 'No stack available'}`));
	},
	error: (err: unknown, str?: string) => {
		const error = err instanceof Error ? err : new Error(String(err));
		console.error(chalk.redBright(`❌ | Error${str ? ` during ${str}` : ''}`));
		console.error(chalk.redBright(`\t${error.message}`));
		console.error(chalk.redBright(`\tStack:\n${error.stack ?? 'No stack available'}`));
	},
	info: (str: string) => {
		console.log(chalk.grey(`ℹ️ | ${str}`));
	},
	success: (str: string) => {
		console.log(chalk.greenBright(`✅ | ${str}`));
	},
	search: (name: string) => {
		console.log(chalk.blueBright(`🔍 | Searching for ${name}`));
	},
	list: (indentation: number, name: string) => {
		console.log(chalk.cyanBright(`${'\t'.repeat(indentation)}✅ | ${name}`));
	},
};
