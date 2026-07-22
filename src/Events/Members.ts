import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordMember, DiscordUser } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplicityTypes.js";

export const MemberCreate = defineEvent({
	name: GatewayEvents.GuildMemberAdd,
	handler: (client, data: DiscordMember & { guild_id: string }): void => {
		const guild = client.guilds.get(data.guild_id!);
		if (!guild) return;
		const member = guild.members.upsert(data);
		client.emit(ClientEvents.MemberCreate, member);
	}
});

export const MemberDelete = defineEvent({
	name: GatewayEvents.GuildMemberRemove,
	handler: (client, data: { user: DiscordUser, guild_id: string }): void => {
		const guild = client.guilds.get(data.guild_id!);
		if (!guild) return;
		const saved = guild.members.get(data.user.id);
		client.emit(ClientEvents.MemberDelete, saved ?? data.user);
		guild.members.delete(data.user.id);
	}
});

export const MemberUpdate = defineEvent({
	name: GatewayEvents.GuildMemberUpdate,
	handler: (client, data: DiscordMember & { guild_id: string }): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const oldMember = guild.members.get(data.user.id);
		const newMember = guild.members.upsert(data);
		client.emit(ClientEvents.MemberUpdate, oldMember, newMember);
	}
});