import { Channel } from "../Types/index.js";
import { Guild, Member } from "../Structures/index.js";
import { ChannelPermissionManager } from "../Managers/ChannelPermissionManager.js";
import { DiscordPermissions } from "../Constants.js";
import { BitField } from "../DataStructures/BitField.js";

const ALL_PERMISSIONS: bigint = Object.values(DiscordPermissions).reduce( (x, a) => x | a );

/**
 * Resolves the effective permissions for a member in a guild and optionally a channel.
 *
 * This implements the Discord permission resolution algorithm:
 * 1. Start with @everyone role permissions
 * 2. OR in permissions from all roles the member has
 * 3. Return all permissions if ADMINISTRATOR is granted
 * 4. Apply channel-level permission overwrites in order: @everyone, roles (aggregated), member-specific
 *
 * @param guild The guild the member belongs to
 * @param member The member whose permissions are being resolved
 * @param channel Optional channel to apply channel-specific overwrites. If not provided, returns guild-level permissions only.
 * @returns A bitfield representing the resolved permissions
 *
 * @example
 * ```ts
 * const member = guild.members.get("user-id");
 * const channel = guild.channels.get("channel-id");
 *
 * // Get guild-level permissions
 * const guildPerms = ResolvePermissions(guild, member);
 *
 * // Get channel-specific permissions with overwrites applied
 * const channelPerms = ResolvePermissions(guild, member, channel);
 *
 * // Check if member can send messages in the channel
 * if (channelPerms.has("SEND_MESSAGES")) {
 *   // Member can send messages
 * }
 * ```
 *
 * @see https://docs.discord.com/developers/topics/permissions#permission-overwrites
 */
export function ResolvePermissions(guild: Guild, member: Member, channel?: Channel & { permission_overwrites: ChannelPermissionManager }): BitField<typeof DiscordPermissions> {
	if (member.user.id === guild.owner_id) {
		return new BitField(DiscordPermissions, ALL_PERMISSIONS);
	}

	let permissions = 0n;

	const everyoneRole = guild.roles.get(guild.id)!;
	permissions |= everyoneRole.permissions.value;

	for (const roleID of member.roles) {
		const role = guild.roles.get(roleID);
		if (!role) throw new Error("Role does not exist in cache");

		permissions |= role.permissions.value;
		if (permissions & DiscordPermissions.ADMINISTRATOR) {
			permissions = ALL_PERMISSIONS;
			break;
		}
	}

	if (!channel || permissions === ALL_PERMISSIONS) return new BitField(DiscordPermissions, permissions);

	// Apply @everyone role overwrite
	const everyoneOverwrite = channel.permission_overwrites.get(guild.id);
	if (everyoneOverwrite) {
		permissions &= ~BigInt(everyoneOverwrite.deny);
		permissions |= BigInt(everyoneOverwrite.allow);
	}

	// Aggregate all role-specific overwrites for roles the member has
	let roleAllow = 0n;
	let roleDeny = 0n;
	for (const roleID of member.roles) {
		const roleOverwrite = channel.permission_overwrites.get(roleID);
		if (roleOverwrite) {
			roleAllow |= BigInt(roleOverwrite.allow);
			roleDeny |= BigInt(roleOverwrite.deny);
		}
	}
	permissions &= ~roleDeny;
	permissions |= roleAllow;

	// Apply member-specific overwrite
	const memberOverwrite = channel.permission_overwrites.get(member.user.id);
	if (memberOverwrite) {
		permissions &= ~BigInt(memberOverwrite.deny);
		permissions |= BigInt(memberOverwrite.allow);
	}

	return new BitField(DiscordPermissions, permissions);
}