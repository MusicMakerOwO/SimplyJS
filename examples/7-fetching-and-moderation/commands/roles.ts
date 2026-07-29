import { CommandHandler } from "../types.js";

export default {
	name: 'roles',
	async execute(client, message, args) {
		const guild = message.guild!;
		const roles = Array.from(guild.roles.values()).sort((a, b) => b.position - a.position);
		await message.reply(roles.map(r => `${r.name} (${r.id})`).join('\n'));
	}
} as CommandHandler;