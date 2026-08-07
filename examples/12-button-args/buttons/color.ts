import { ButtonHandler } from "../types.js";

const ROLE_NAMES: Record<string, string> = {
	red: 'Red',
	blue: 'Blue',
	green: 'Green',
	yellow: 'Yellow'
};

// One handler for all four color buttons - `color:red`, `color:blue`, etc. all land here,
// with only the color arg changing. Without button args this would otherwise be four
// near-identical handlers, one per color.
export default {
	id: 'color',
	async execute(client, interaction, colorArg) {
		// Careful here: it's interaction.guildId, but message.guild_id back in the prefix
		// examples. Interactions expose camelCase, messages mirror Discord's raw snake_case
		// payload.
		const guild = interaction.guildId ? client.guilds.get(interaction.guildId) : undefined;
		const member = interaction.member;
		const roleName = ROLE_NAMES[colorArg];

		if (!guild || !member) {
			await interaction.reply('Color roles only work inside a server');
			return;
		}

		const role = Array.from(guild.roles.values()).find(role => role.name === roleName);
		if (!role) {
			await interaction.reply(`No "${roleName}" role exists in this server yet - ask an admin to create one`);
			return;
		}

		// Toggle: clicking a color you already have takes it back off.
		// member.roles is a plain array of role ids, not a cache like guild.roles - the
		// member only stores which roles it has, the guild owns the roles themselves.
		//
		// These replies post a new visible message on every click, which gets noisy fast in a
		// public channel. A real picker would use an ephemeral reply so only the clicker sees
		// the confirmation.
		if (member.roles.includes(role.id)) {
			await member.removeRole(role.id);
			await interaction.reply(`Removed the **${roleName}** role.`);
		} else {
			await member.addRole(role.id);
			await interaction.reply(`Gave you the **${roleName}** role.`);
		}
	}
} as ButtonHandler;