import { Client } from "../Client.js";
import { DiscordOverwrite } from "../Types/index.js";
import { BaseChannel } from "../Structures/BaseChannel.js";

export class ChannelPermissionManager {
	#client: Client;
	#channel: BaseChannel;

	cache: Map<string, DiscordOverwrite>;

	constructor(client: Client, channel: BaseChannel, overwrites: DiscordOverwrite[]) {
		this.#client = client;
		this.#channel = channel;
		this.cache = new Map();
		this.patch(overwrites);
	}

	patch(overwrites: DiscordOverwrite[]): void {
		this.cache.clear();
		for (const overwrite of overwrites) {
			this.cache.set(overwrite.id, overwrite);
		}
	}

	get(id: string): DiscordOverwrite | undefined {
		return this.cache.get(id);
	}

	has(id: string): boolean {
		return this.cache.has(id);
	}

	async upsert(overwrite: DiscordOverwrite): Promise<void> {
		await this.#client.rest.put(`/channels/${this.#channel.id}/permissions/${overwrite.id}`, {
			allow: overwrite.allow,
			deny: overwrite.deny,
			type: overwrite.type
		});
	}

	async delete(id: string): Promise<void> {
		await this.#client.rest.delete(`/channels/${this.#channel.id}/permissions/${id}`);
	}
}