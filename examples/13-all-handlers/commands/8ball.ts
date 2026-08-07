import { SlashCommandBuilder } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

const ANSWERS = [
	'It is certain.',
	'Without a doubt.',
	'Yes, definitely.',
	'Ask again later.',
	'Cannot predict now.',
	"Don't count on it.",
	'My sources say no.',
	'Very doubtful.'
];

// Plain command, no components at all - the baseline case the routing in
// events/slashCommandUsed.ts handles just as well as the fancier ones below.
export default {
	data: new SlashCommandBuilder()
		.setName('8ball')
		.setDescription('Ask the magic 8-ball a question')
		.addStringOption('question', 'What do you want to ask?', { required: true }),

	async execute(client, interaction) {
		const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
		await interaction.reply(`🎱 ${answer}`);
	}
} as CommandHandler;
