export const color = {
	encode: (str: string): number => {
		return parseInt(str, 16);
	},
	decode: (num: number): string => {
		return num.toString(16);
	},
};
