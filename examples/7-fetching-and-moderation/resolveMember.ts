import { Member } from "../../dist/index";
import { FullClient } from "./types";

/**
 * Turns a ping or a raw id argument into a Member.
 *
 * Every command here needs the same three steps, so they live in one place rather than being
 * repeated eight times over. Checks the guild's member cache first and only falls back to a
 * fetch if needed, since a cache hit costs nothing and a fetch spends a rate limit.
 */
export async function resolveMember(client: FullClient, guildId: string, input: string | undefined): Promise<Member | null> {
	if (!input) return null;

	// Pinging someone puts the literal text "<@123456789>" in the message, so the first run
	// of digits is the user's ID. Typing the ID out by hand lands on the same branch.
	const id = (/\d+/.exec(input) ?? [])[0];
	if (!id) return null;

	const guild = client.guilds.get(guildId);
	if (!guild) return null;

	return guild.members.get(id) ?? await guild.members.fetch(id).catch(() => null);
}