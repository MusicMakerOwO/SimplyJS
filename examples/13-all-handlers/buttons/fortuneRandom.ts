import { ButtonHandler } from "../types.js";

// This list is copied from selects/fortuneCategory.ts so each handler reads top to bottom on
// its own. In a real bot pull it into a shared module and import it from both: two copies of
// the same data will drift the moment someone adds a fortune to one of them.
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