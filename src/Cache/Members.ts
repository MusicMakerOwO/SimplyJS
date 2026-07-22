import { Member } from "../Structures/Member.js";
import { GuildCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordMember } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";

export class MemberCache extends GuildCache<string, Member, DiscordMember> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordMember): Member {
		if (this.has(data.user.id)) {
			this.get(data.user.id)!.patch(data);
		} else {
			this.set(data.user.id, new Member(this.client, this.guild, data));
		}
		return this.get(data.user.id)!;
	}

	async fetch(id: string): Promise<Member> {
		const fetched = await this.client.rest.get<DiscordMember>(`/guilds/${this.guild.id}/members/${id}`);
		return this.upsert(fetched);
	}
}