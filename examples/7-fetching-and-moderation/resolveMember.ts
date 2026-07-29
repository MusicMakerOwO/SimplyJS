import { Member } from "../../dist/index";
import { FullClient } from "./types";

/**
 * Turns a "@user" or raw id argument into a Member.
 * Checks the guild's member cache first and only falls back to a fetch if needed.
 */
export async function resolveMember(client: FullClient, guildId: string, input: string | undefined): Promise<Member | null> {
	if (!input) return null;

	const id = (/\d+/.exec(input) ?? [])[0];
	if (!id) return null;

	const guild = client.guilds.get(guildId);
	if (!guild) return null;

	return guild.members.get(id) ?? await guild.members.fetch(id).catch(() => null);
}