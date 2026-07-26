import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents, GatewayInvite } from "../Types/DiscordGateway.js";
import { ClientEvents, InviteDeletePayload } from "../Types/SimplicityTypes.js";
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
	handler: (client, data: InviteDeletePayload) => {
		client.emit(ClientEvents.InviteDelete, data);
	}
});
