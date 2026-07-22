import { User } from "../Structures/User.js";
import { GlobalCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordUser } from "../Types/DiscordAPITypes.js";

export class UserCache extends GlobalCache<string, User, DiscordUser> {
	constructor(client: Client) {
		super(client);
	}

	upsert(data: DiscordUser): User {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, new User(this.client, data));
		}
		return this.get(data.id)!;
	}

	async fetch(id: string): Promise<User> {
		const fetched = await this.client.rest.get<DiscordUser>(`/users/${id}`);
		return this.upsert(fetched);
	}
}