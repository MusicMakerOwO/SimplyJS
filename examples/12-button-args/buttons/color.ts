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
		if (member.roles.includes(role.id)) {
			await member.removeRole(role.id);
			await interaction.reply(`Removed the **${roleName}** role.`);
		} else {
			await member.addRole(role.id);
			await interaction.reply(`Gave you the **${roleName}** role.`);
		}
	}
} as ButtonHandler;