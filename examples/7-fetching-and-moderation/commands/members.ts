import { CommandHandler } from "../types.js";

export default {
	// Lists members currently in the cache (populated by the gateway,
	// requires the GuildMembers intent). Doesn't hit the API at all.
	name: 'members',
	async execute(client, message, args) {
		const guild = message.guild!;
		const names = Array.from(guild.members.values()).map(m => m.nick ?? m.user.username);
		await message.reply(`**${names.length} cached member(s):** ${names.join(', ') || 'none'}`);
	}
} as CommandHandler;