import { Client } from "../Client.js";
import {
	DiscordAvatarDecoration,
	DiscordChannel,
	DiscordNameplate,
	DiscordUser,
	DiscordUserPrimaryGuild
} from "../Types/DiscordAPITypes.js";
import { APIClientStructure } from "../Contracts/DiscordStructure.js";
import { MessagePayload } from "../Types/Internal.js";
import { CreateMessagePayload, Message } from "./Message.js";
import { DiscordMessage } from "../Types/MessageComponents.js";

export class User extends APIClientStructure<DiscordUser> {
	/** Cached DM channel used by `send()` after the first create/open call */
	#dmChannel: DiscordChannel | undefined;

	id!: string
	/** Username without discriminator formatting */
	username!: string
	/** Legacy discriminator string (for migrated users this may be `"0"`) */
	discriminator!: string
	/** Display name chosen by the user, or `null` when unset */
	global_name!: string | null
	/** User avatar hash, or `null` when no custom avatar is set */
	avatar!: string | null
	/** Whether this user account is a bot */
	bot?: boolean
	/** Whether this account is a Discord system user */
	system?: boolean
	/** Whether multifactor authentication is enabled */
	mfa_enabled?: boolean
	/** User banner hash, or `null` when no banner is set */
	banner?: string | null
	/** Accent color integer for profile styling, or `null` when unset */
	accent_color?: number | null
	/** User locale, typically present on OAuth/current-user responses */
	locale?: string
	/** Email verification status, when provided by the API */
	verified?: boolean
	/** User email address, when scope and endpoint provide it */
	email?: string | null
	/** User account flags bitfield */
	flags?: number
	/** Nitro/premium subscription tier */
	premium_type?: number
	/** Public user flags bitfield */
	public_flags?: number
	/** Avatar decoration metadata keyed by decoration id */
	avatar_decoration_data?: Record<string, DiscordAvatarDecoration> | null
	/** Collectible profile metadata such as nameplates */
	collectibles?: Record<string, DiscordNameplate> | null
	/** Primary guild metadata for the user profile */
	primary_guild?: Record<string, DiscordUserPrimaryGuild> | null

	constructor(client: Client, data: DiscordUser) {
		super(client);
		this.patch(data)
	}

	patch(data: DiscordUser): void {
		this.id = data.id;
		this.username = data.username;
		this.discriminator = data.discriminator;
		this.global_name = data.global_name;
		this.avatar = data.avatar;

		if ('bot' in data && data.bot !== undefined) {
			this.bot = data.bot;
		}

		if ('system' in data && data.system !== undefined) {
			this.system = data.system;
		}

		if ('mfa_enabled' in data && data.mfa_enabled !== undefined) {
			this.mfa_enabled = data.mfa_enabled;
		}

		if ('banner' in data && data.banner !== undefined) {
			this.banner = data.banner;
		}

		if ('accent_color' in data && data.accent_color !== undefined) {
			this.accent_color = data.accent_color;
		}

		if ('locale' in data && data.locale !== undefined) {
			this.locale = data.locale;
		}

		if ('verified' in data && data.verified !== undefined) {
			this.verified = data.verified;
		}

		if ('email' in data && data.email !== undefined) {
			this.email = data.email;
		}

		if ('flags' in data && data.flags !== undefined) {
			this.flags = data.flags;
		}

		if ('premium_type' in data && data.premium_type !== undefined) {
			this.premium_type = data.premium_type;
		}

		if ('public_flags' in data && data.public_flags !== undefined) {
			this.public_flags = data.public_flags;
		}

		if ('avatar_decoration_data' in data && data.avatar_decoration_data !== undefined) {
			this.avatar_decoration_data = data.avatar_decoration_data;
		}

		if ('collectibles' in data && data.collectibles !== undefined) {
			this.collectibles = data.collectibles;
		}

		if ('primary_guild' in data && data.primary_guild !== undefined) {
			this.primary_guild = data.primary_guild;
		}
	}

	/** Generate a ping for the user: `Hello, ${user.toString()}` -> `Hello, @musicmaker` */
	toString(): string {
		return `<@${this.id}>`;
	}

	/** Send a direct message to the user, might fail if they have DMs closed or have blocked the bot */
	async send(content: string | MessagePayload): Promise<Message> {
		const payload = CreateMessagePayload(content);

		if (!this.#dmChannel) {
			this.#dmChannel = await this.client.rest.post<DiscordChannel>(`/users/@me/channels`, {
				recipient_id: this.id
			})
		}

		const response = await this.client.rest.post<DiscordMessage>(`/channels/${this.#dmChannel.id}/messages`, payload);
		return new Message(this.client, response);
	}
}