import { Webhook } from "../Structures/Webhook.js";
import { GuildScopedCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordWebhook } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";

/** The fields accepted by {@link WebhookCache.create} */
export type WebhookCreateOptions = {
	/** name of the webhook, 1-80 characters and cannot contain "clyde" or "discord" */
	name: string;
	/** image for the default webhook avatar, as a data URI */
	avatar?: string | null;
}

/**
 * Cache of a single guild's {@link Webhook}s.
 *
 * Discord never includes webhooks in the `GUILD_CREATE` payload, so this cache starts empty and is
 * filled by an explicit {@link WebhookCache.fetchAll} call. A `WebhooksUpdate` event is Discord's
 * hint that something changed in a channel without saying what, so
 * {@link WebhookCache.fetchChannel} is the way to resync after one.
 */
export class WebhookCache extends GuildScopedCache<string, Webhook, DiscordWebhook> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordWebhook): Webhook {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, new Webhook(this.client, data));
		}
		return this.get(data.id)!;
	}

	/**
	 * Fetches a single webhook by id and caches it.
	 * Requires the `MANAGE_WEBHOOKS` permission and will error otherwise.
	 *
	 * The returned webhook has no {@link Webhook.token} unless the bot's own application created it.
	 * @param id Id of the webhook to fetch
	 * @see https://docs.discord.com/developers/resources/webhook#get-webhook
	 */
	async fetch(id: string): Promise<Webhook> {
		const fetched = await this.client.rest.get<DiscordWebhook>(`/webhooks/${id}`);
		return this.upsert(fetched);
	}

	/**
	 * Fetches every webhook in this guild and caches them.
	 * Requires the `MANAGE_WEBHOOKS` permission and will error otherwise.
	 * @see https://docs.discord.com/developers/resources/webhook#get-guild-webhooks
	 */
	async fetchAll(): Promise<Webhook[]> {
		const fetched = await this.client.rest.get<DiscordWebhook[]>(`/guilds/${this.guild.id}/webhooks`);
		return fetched.map(webhook => this.upsert(webhook));
	}

	/**
	 * Fetches every webhook belonging to one channel and caches them. This is the call to make after
	 * a `WebhooksUpdate` event, which names the channel but not the webhook.
	 * Requires the `MANAGE_WEBHOOKS` permission and will error otherwise.
	 * @param channelId Id of the channel to list webhooks for
	 * @see https://docs.discord.com/developers/resources/webhook#get-channel-webhooks
	 */
	async fetchChannel(channelId: string): Promise<Webhook[]> {
		const fetched = await this.client.rest.get<DiscordWebhook[]>(`/channels/${channelId}/webhooks`);
		return fetched.map(webhook => this.upsert(webhook));
	}

	/**
	 * Creates a webhook in one of this guild's channels and caches it.
	 * Requires the `MANAGE_WEBHOOKS` permission and will error otherwise.
	 *
	 * The created webhook comes back with its {@link Webhook.token}, so it can be executed with
	 * {@link Webhook.send} straight away.
	 * @param channelId Id of the channel to create the webhook in
	 * @param options Name and optional avatar for the webhook
	 * @param reason Optional audit log reason.
	 * @see https://docs.discord.com/developers/resources/webhook#create-webhook
	 */
	async create(channelId: string, options: WebhookCreateOptions, reason?: string): Promise<Webhook> {
		const created = await this.client.rest.post<DiscordWebhook>(
			`/channels/${channelId}/webhooks`,
			options,
			reason ? { 'X-Audit-Log-Reason': reason } : {}
		);
		return this.upsert(created);
	}
}
