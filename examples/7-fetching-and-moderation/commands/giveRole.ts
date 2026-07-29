import { CommandHandler } from "../types.js";
import { resolveMember } from "../resolveMember";

export default {
	// "!give-role @user Moderator" -> matches by role name (case-insensitive) or id
	name: 'give-role',
	async execute(client, message, args) {
		const member = await resolveMember(client, message.guild_id!, args.shift());
		if (!member) return message.reply("Couldn't find that member");

		const guild = message.guild!;
		const roleInput = args.join(' ');
		const role = guild.roles.get(roleInput)
			?? Array.from(guild.roles.values()).find(r => r.name.toLowerCase() === roleInput.toLowerCase());
		if (!role) return message.reply(`Couldn't find a role matching "${roleInput}"`);

		try {
			await member.addRole(role.id);
			await message.reply(`Gave **${member.user.username}** the **${role.name}** role`);
		} catch (error) {
			console.log(error);
			await message.reply("Something went wrong - do I have the Manage Roles permission, and is my role above theirs?");
		}
	}
} as CommandHandler;