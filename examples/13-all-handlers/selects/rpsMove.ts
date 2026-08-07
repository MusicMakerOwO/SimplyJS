import { ActionRowBuilder, StringSelectBuilder } from "../../../dist/index.js";
import { SelectHandler } from "../types.js";

const BEATS: Record<string, string> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const EMOJI: Record<string, string> = { rock: '🪨', paper: '📄', scissors: '✂️' };

export default {
	customId: 'rps_move',
	async execute(client, interaction) {
		const [playerMove] = interaction.values;
		const moves = Object.keys(BEATS);
		const botMove = moves[Math.floor(Math.random() * moves.length)];

		let result: string;
		if (playerMove === botMove) result = "It's a tie!";
		else if (BEATS[playerMove] === botMove) result = 'You win!';
		else result = 'You lose!';

		// Rebuilds the same select as commands/rps.ts so another round can be played right
		// away. A component that isn't sent back is gone, so anything meant to stay usable
		// has to be re-attached on every update. Worth extracting into a shared builder
		// function once the same menu appears in more than two places.
		const move = new StringSelectBuilder()
			.setCustomID('rps_move')
			.setPlaceholder('Choose your move')
			.addOption('Rock', 'rock', { emoji: { name: '🪨' } })
			.addOption('Paper', 'paper', { emoji: { name: '📄' } })
			.addOption('Scissors', 'scissors', { emoji: { name: '✂️' } });

		await interaction.update({
			content: `You played ${EMOJI[playerMove]} **${playerMove}**, I played ${EMOJI[botMove]} **${botMove}** - ${result}`,
			components: [new ActionRowBuilder().addComponents(move)]
		});
	}
} as SelectHandler;
