import { CommandHandler } from "../types.js";

export default {
	name: 'roles',
	async execute(client, message, args) {
		const guild = message.guild!;
		// Sorted high to low. Position is what Discord's whole hierarchy runs on: the bot can
		// only act on members whose highest role sits below its own, which is the usual
		// reason a kick or role change fails despite the permission being granted.
		const roles = Array.from(guild.roles.values()).sort((a, b) => b.position - a.position);
		await message.reply(roles.map(r => `${r.name} (${r.id})`).join('\n'));
	}
} as CommandHandler;