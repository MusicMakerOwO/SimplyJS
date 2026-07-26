import {
	DiscordApplication,
	DiscordInvite,
	DiscordInviteTargetTypes,
	DiscordInviteTypes, JSONObject,
	ObjectValues,
	DiscordRole, DiscordGuild, DiscordChannel, DiscordUser
} from "../Types/index.js";
import { Client } from "../Client.js";

export class Invite {

	client: Client;

	/** the type of invite */
	type: ObjectValues<typeof DiscordInviteTypes>;
	/** the invite code (unique ID) */
	code: string;
	/** the guild this invite is for */
	guild?: DiscordGuild;
	/** the channel this invite is for */
	channel: DiscordChannel | null;
	/** the user who created the invite */
	inviter?: DiscordUser;
	/** the type of target for this voice channel invite */
	target_type?: ObjectValues<typeof DiscordInviteTargetTypes>;
	/** the user whose stream to display for this voice channel stream invite */
	target_user?: DiscordUser;
	/** the embedded application to open for this voice channel embedded application invite */
	target_application?: DiscordApplication;
	/** approximate count of online members, returned from the GET /invites/<code> endpoint when with_counts is true */
	approximate_presence_count?: number;
	/** approximate count of total members, returned from the GET /invites/<code> endpoint when with_counts is true */
	approximate_member_count?: number;
	/** the expiration date of this invite */
	expires_at: string | null;
	/** guild scheduled event data, only included if guild_scheduled_event_id contains a valid guild scheduled event id */
	// TODO Guild events
	guild_scheduled_event?: JSONObject;
	/** guild invite flags for guild invites */
	flags?: number;
	/** the roles assigned to the user upon accepting the invite */
	roles?: Pick<DiscordRole, 'id' | 'name' | 'position' | 'color' | 'colors' | 'icon' | 'unicode_emoji'>[];

	constructor(client: Client, data: DiscordInvite) {
		this.client = client;
		this.type = data.type;
		this.code = data.code;
		this.channel = data.channel;
		this.expires_at = data.expires_at;
		if ('guild' in data) this.guild = data.guild;
		if ('inviter' in data) this.inviter = data.inviter;
		if ('target_type' in data) this.target_type = data.target_type;
		if ('target_user' in data) this.target_user = data.target_user;
		if ('target_application' in data) this.target_application = data.target_application;
		if ('approximate_presence_count' in data) this.approximate_presence_count = data.approximate_presence_count;
		if ('approximate_member_count' in data) this.approximate_member_count = data.approximate_member_count;
		if ('guild_scheduled_event' in data) this.guild_scheduled_event = data.guild_scheduled_event;
		if ('flags' in data) this.flags = data.flags;
		if ('roles' in data) this.roles = data.roles;
	}

	async delete(reason?: string): Promise<void> {
		return await this.client.rest.delete(`/invites/${this.code}`, reason ? { 'X-Audit-Log-Reason': reason } : {} );
	}

	toString(): string {
		return `https://discord.gg/${this.code}`
	}
}