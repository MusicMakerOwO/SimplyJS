import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents, GatewayInvite } from "../Types/DiscordGateway.js";
import { ClientEvents, InviteDeletePayload } from "../Types/SimplyJSTypes.js";
import { Invite } from "../Structures/Invite.js";

export const InviteCreate = defineEvent({
	name: GatewayEvents.InviteCreate,
	handler: (client, data: GatewayInvite) => {
		client.emit(ClientEvents.InviteCreate, new Invite(client, data) );
	}
});

export const InviteDelete = defineEvent({
	name: GatewayEvents.InviteDelete,
	// Discord only sends the code and its location here, never an invite object,
	// so there is nothing to build an Invite from.
	handler: (client, data: { channel_id: string; guild_id?: string; code: string }) => {
		const payload: InviteDeletePayload = {
			channelId: data.channel_id,
			code: data.code,
			...(data.guild_id !== undefined ? { guildId: data.guild_id } : {})
		};
		client.emit(ClientEvents.InviteDelete, payload);
	}
});