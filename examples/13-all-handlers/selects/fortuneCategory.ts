import { SelectHandler } from "../types.js";

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
	customId: 'fortune_category',
	async execute(client, interaction) {
		const [category] = interaction.values;
		const options = FORTUNES[category];
		const fortune = options[Math.floor(Math.random() * options.length)];

		// One-shot, unlike rps/dice above - revealing the fortune ends the panel rather than staying open for another round.
		await interaction.update({
			content: `🔮 **${category[0].toUpperCase()}${category.slice(1)}**: ${fortune}`,
			components: []
		});
	}
} as SelectHandler;