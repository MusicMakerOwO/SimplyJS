/**
 * These are a list of all the OAuth2 scopes that Discord supports.
 * Some scopes require approval from Discord to use.
 */
export const DiscordOAuth2Scopes = {
  /** allows your app to fetch data from a user’s “Now Playing/Recently Played” list — not currently available for apps */
  ACTIVITIES_READ: 'activities.read',
  /** allows your app to update a user’s activity - not currently available for apps (NOT REQUIRED FOR GAMESDK ACTIVITY MANAGER) */
  ACTIVITIES_WRITE: 'activities.write',
  /** allows your app to read build data for a user’s applications */
  APPLICATIONS_BUILDS_READ: 'applications.builds.read',
  /** allows your app to upload/update builds for a user’s applications - only available to approved partners */
  APPLICATIONS_BUILDS_UPLOAD: 'applications.builds.upload',
  /** allows your app to add commands to a guild - included by default with the bot scope */
  APPLICATIONS_COMMANDS: 'applications.commands',
  /** allows your app to update its commands using a Bearer token - client credentials grant only */
  APPLICATIONS_COMMANDS_UPDATE: 'applications.commands.update',
  /** allows your app to update permissions for its commands in a guild a user has permissions to */
  APPLICATIONS_COMMANDS_PERMISSIONS_UPDATE: 'applications.commands.permissions.update',
  /** allows your app to read entitlements for a user’s applications */
  APPLICATIONS_ENTITLEMENTS: 'applications.entitlements',
  /** allows your app to read and update store data (SKUs, store listings, achievements, etc.) for a user’s applications */
  APPLICATIONS_STORE_UPDATE: 'applications.store.update',
  /** for oauth2 bots, this puts the bot in the user’s selected guild by default */
  BOT: 'bot',
  /** allows `/users/@me/connections` to return linked third-party accounts */
  CONNECTIONS: 'connections',
  /** allows your app to see information about the user’s DMs and group DMs - only available to approved partners */
  DM_CHANNELS_READ: 'dm_channels.read',
  /** enables `/users/@me` to return an email */
  EMAIL: 'email',
  /** allows your app to join users to a group dm */
  GDM_JOIN: 'gdm.join',
  /** allows `/users/@me/guilds` to return basic information about all of a user’s guilds */
  GUILDS: 'guilds',
  /** allows `/guilds/{guild.id}/members/{user.id}` to be used for joining users to a guild */
  GUILDS_JOIN: 'guilds.join',
  /** allows `/users/@me/guilds/{guild.id}/member` to return a user’s member information in a guild */
  GUILDS_MEMBERS_READ: 'guilds.members.read',
  /** allows `/users/@me` without email */
  IDENTIFY: 'identify',
  /** for local rpc server api access, this allows you to read messages from all client channels (otherwise restricted to channels/guilds your app creates) */
  MESSAGES_READ: 'messages.read',
  /** Allows your app to access a user’s Discord Friends list, their pending requests, and blocked users. This scope is part of our Social SDK - submit for access here. Social SDK Terms apply, including Section 5(a)(ii) to the data you obtain */
  RELATIONSHIPS_READ: 'relationships.read',
  /** allows your app to update a user’s connection and metadata for the app */
  ROLE_CONNECTIONS_WRITE: 'role_connections.write',
  /** for local rpc server access, this allows you to control a user’s local Discord client - only available to approved partners */
  RPC: 'rpc',
  /** for local rpc server access, this allows you to update a user’s activity - only available to approved partners */
  RPC_ACTIVITIES_WRITE: 'rpc.activities.write',
  /** for local rpc server access, this allows you to receive notifications pushed out to the user - only available to approved partners */
  RPC_NOTIFICATIONS_READ: 'rpc.notifications.read',
  /** for local rpc server access, this allows you to read a user’s voice settings and listen for voice events - only available to approved partners */
  RPC_VOICE_READ: 'rpc.voice.read',
  /** for local rpc server access, this allows you to update a user’s voice settings - only available to approved partners */
  RPC_VOICE_WRITE: 'rpc.voice.write',
  /** allows your app to connect to voice on user’s behalf and see all the voice members - only available to approved partners */
  VOICE: 'voice',
  /** this generates a webhook that is returned in the oauth token response for authorization code grants */
  WEBHOOK_INCOMING: 'webhook.incoming',
} as const;