import { Client } from "../Client.js";
import { DiscordChannel, DiscordChannelTypes } from "../Types/DiscordAPITypes.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { Guild } from "./Guild.js";

export class BaseChannel extends APIGuildStructure<DiscordChannel> {
	id!: string
	type!: ObjectValues<typeof DiscordChannelTypes>
	name?: string | null
	flags?: number
	guild_id?: string

	constructor(client: Client, guild: Guild, data: DiscordChannel) {
		super(client, guild);
		this.patch(data);
	}

	patch(data: DiscordChannel): void {
		this.id = data.id;
		this.type = data.type;
		if (data.name !== undefined) this.name = data.name;
		if (data.flags !== undefined) this.flags = data.flags;
		if (data.guild_id !== undefined) this.guild_id = data.guild_id;
	}

	async delete(): Promise<void> {
		await this.client.rest.delete(`/channels/${this.id}`);
	}

	// shared internal - concrete classes expose their own typed modify()
	async modify(options: Partial<DiscordChannel>): Promise<void> {
		await this.client.rest.patch(`/channels/${this.id}`, options);
	}
}