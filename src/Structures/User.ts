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
import { CreateMessagePayload, Message, SplitAttachments } from "./Message.js";
import { DiscordMessage } from "../Types/MessageComponents.js";

/**
 * Cached DM channels used by `User.send()` after the first create/open call, keyed by user.
 *
 * Held out here rather than in a `#private` field so that `clone()` - which copies own properties
 * onto a bare instance and cannot carry private fields across - produces a usable `User`. A clone
 * simply starts with no cached DM channel and opens its own on first send.
 */
const dmChannels = new WeakMap<User, DiscordChannel>();

/**
 * A Discord user account. Represents the global identity behind a {@link Member} in a guild,
 * or the other party in a direct message.
 */
export class User extends APIClientStructure<DiscordUser> {
	id!: string
	/** Username without discriminator formatting */
	username!: string
	/** Legacy discriminator string (for migrated users this may be `"0"`) */
	discriminator!: string
	/** Display name chosen by the user, or `null` when unset */
	globalName!: string | null
	/** User avatar hash, or `null` when no custom avatar is set */
	avatar!: string | null
	/** Whether this user account is a bot */
	bot?: boolean
	/** Whether this account is a Discord system user */
	system?: boolean
	/** Whether multifactor authentication is enabled */
	mfaEnabled?: boolean
	/** User banner hash, or `null` when no banner is set */
	banner?: string | null
	/** Accent color integer for profile styling, or `null` when unset */
	accentColor?: number | null
	/** User locale, typically present on OAuth/current-user responses */
	locale?: string
	/** Email verification status, when provided by the API */
	verified?: boolean
	/** User email address, when scope and endpoint provide it */
	email?: string | null
	/** User account flags bitfield */
	flags?: number
	/** Nitro/premium subscription tier */
	premiumType?: number
	/** Public user flags bitfield */
	publicFlags?: number
	/** Avatar decoration metadata keyed by decoration id */
	avatarDecorationData?: Record<string, DiscordAvatarDecoration> | null
	/** Collectible profile metadata such as nameplates */
	collectibles?: Record<string, DiscordNameplate> | null
	/** Primary guild metadata for the user profile */
	primaryGuild?: Record<string, DiscordUserPrimaryGuild> | null

	constructor(client: Client, data: DiscordUser) {
		super(client);
		this.patch(data)
	}

	patch(data: DiscordUser): void {
		// Discord types these five as always present, but sends partial user objects on several payloads.
		// `PRESENCE_UPDATE` carries only `id`. Assigning them unconditionally would blank
		// an already-cached user, so they are guarded like every optional field below. The `!`
		// markers still hold in practice: a user is only ever constructed from a full payload, and a
		// partial one can then only leave those fields untouched.
		if ('id' in data && data.id !== undefined) {
			this.id = data.id;
		}

		if ('username' in data && data.username !== undefined) {
			this.username = data.username;
		}

		if ('discriminator' in data && data.discriminator !== undefined) {
			this.discriminator = data.discriminator;
		}

		if ('global_name' in data && data.global_name !== undefined) {
			this.globalName = data.global_name;
		}

		if ('avatar' in data && data.avatar !== undefined) {
			this.avatar = data.avatar;
		}

		if ('bot' in data && data.bot !== undefined) {
			this.bot = data.bot;
		}

		if ('system' in data && data.system !== undefined) {
			this.system = data.system;
		}

		if ('mfa_enabled' in data && data.mfa_enabled !== undefined) {
			this.mfaEnabled = data.mfa_enabled;
		}

		if ('banner' in data && data.banner !== undefined) {
			this.banner = data.banner;
		}

		if ('accent_color' in data && data.accent_color !== undefined) {
			this.accentColor = data.accent_color;
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
			this.premiumType = data.premium_type;
		}

		if ('public_flags' in data && data.public_flags !== undefined) {
			this.publicFlags = data.public_flags;
		}

		if ('avatar_decoration_data' in data && data.avatar_decoration_data !== undefined) {
			this.avatarDecorationData = data.avatar_decoration_data;
		}

		if ('collectibles' in data && data.collectibles !== undefined) {
			this.collectibles = data.collectibles;
		}

		if ('primary_guild' in data && data.primary_guild !== undefined) {
			this.primaryGuild = data.primary_guild;
		}
	}

	/** Generate a ping for the user: `Hello, ${user.toString()}` -> `Hello, @musicmaker` */
	toString(): string {
		return `<@${this.id}>`;
	}

	/**
	 * Builds the URL for this user's default avatar, used as a fallback when no custom
	 * `avatar` is set. The index is derived from the user id (or discriminator, for
	 * legacy-format accounts) so it is stable per-user.
	 * @returns The default avatar image URL.
	 */
	defaultAvatarURL(): string {
		const index = this.discriminator === "0"
			? (BigInt(this.id) >> 22n) % 6n
			: BigInt(this.id) % 5n

		return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
	}

	/**
	 * Builds the URL for this user's custom avatar, or falls back to
	 * {@link User.defaultAvatarURL} when none is set.
	 * @param animated Whether to request the animated `.gif` variant when the avatar supports it.
	 * @default true
	 * @returns The avatar image URL.
	 */
	avatarURL(animated?: boolean): string {
		if (!this.avatar) return this.defaultAvatarURL();
		const isAnimated = (animated ?? true) && this.avatar.startsWith("a_"); // nullish collation, only overrides `undefined`
		return isAnimated
			? `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.gif?size=1024`
			: `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.png?size=1024`
	}

	/** Send a direct message to the user, might fail if they have DMs closed or have blocked the bot */
	async send(content: string | MessagePayload): Promise<Message> {
		const { body, files } = SplitAttachments(CreateMessagePayload(content));

		let dmChannel = dmChannels.get(this);
		if (!dmChannel) {
			dmChannel = await this.client.rest.post<DiscordChannel>(`/users/@me/channels`, {
				recipient_id: this.id
			});
			dmChannels.set(this, dmChannel);
		}

		const response = await this.client.rest.post<DiscordMessage>(`/channels/${dmChannel.id}/messages`, body, undefined, files);
		return new Message(this.client, response);
	}
}