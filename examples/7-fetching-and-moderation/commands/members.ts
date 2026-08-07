import { CommandHandler } from "../types.js";

export default {
	// Lists members currently in the cache (populated by the gateway,
	// requires the privileged GuildMembers intent). Doesn't hit the API at all.
	// An empty result almost always means that intent isn't enabled in the portal.
	name: 'members',
	async execute(client, message, args) {
		const guild = message.guild!;
		// `nick` is the per-server nickname and is null unless one was set, so fall back
		// to the account's global username.
		const names = Array.from(guild.members.values()).map(m => m.nick ?? m.user.username);
		// Watch out on a busy server: Discord rejects any message over 2000 characters,
		// so a real bot would page this or trim it.
		await message.reply(`**${names.length} cached member(s):** ${names.join(', ') || 'none'}`);
	}
} as CommandHandler;