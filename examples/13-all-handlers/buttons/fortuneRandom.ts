import { ButtonHandler } from "../types.js";

// Duplicates selects/fortuneCategory.ts's fortune list rather than sharing it - picking the
// category is the only difference between the two handlers, everything about revealing the
// fortune afterward is deliberately kept separate and identical.
const FORTUNES: Record<string, string[]> = {
	love: [
		'A meaningful connection is closer than you think.',
		'Patience will bring the right person into your life.'
	],
	career: [
		'A new opportunity is about to knock.',
		'Your hard work is about to pay off.'
	],
	luck: [
		'Today favors bold choices.',
		'A small risk leads to a big reward.'
	]
};

export default {
	customId: 'fortune_random',
	async execute(client, interaction) {
		const categories = Object.keys(FORTUNES);
		const category = categories[Math.floor(Math.random() * categories.length)];
		const options = FORTUNES[category];
		const fortune = options[Math.floor(Math.random() * options.length)];

		await interaction.update({
			content: `🔮 **${category[0].toUpperCase()}${category.slice(1)}**: ${fortune}`,
			components: []
		});
	}
} as ButtonHandler;