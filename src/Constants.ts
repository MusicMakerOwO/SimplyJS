/** @see https://docs.discord.com/developers/topics/permissions */
export const DiscordPermissions = {
	/** Allows creation of instant invites */
	CREATE_INSTANT_INVITE: 1n << 0n,
	/** Allows kicking members */
	KICK_MEMBERS: 1n << 1n,
	/** Allows banning members */
	BAN_MEMBERS: 1n << 2n,
	/** Allows all permissions and bypasses channel permission overwrites */
	ADMINISTRATOR: 1n << 3n,
	/** Allows management and editing of channels */
	MANAGE_CHANNELS: 1n << 4n,
	/** Allows management and editing of the guild */
	MANAGE_GUILD: 1n << 5n,
	/** Allows adding new reactions to messages */
	ADD_REACTIONS: 1n << 6n,
	/** Allows viewing audit logs */
	VIEW_AUDIT_LOG: 1n << 7n,
	/** Allows using priority speaker in a voice channel */
	PRIORITY_SPEAKER: 1n << 8n,
	/** Allows the user to go live */
	STREAM: 1n << 9n,
	/** Allows viewing channels */
	VIEW_CHANNEL: 1n << 10n,
	/** Allows sending messages */
	SEND_MESSAGES: 1n << 11n,
	/** Allows sending TTS messages */
	SEND_TTS_MESSAGES: 1n << 12n,
	/** Allows deleting other users' messages */
	MANAGE_MESSAGES: 1n << 13n,
	/** Links sent by users with this permission are auto-embedded */
	EMBED_LINKS: 1n << 14n,
	/** Allows uploading files and images */
	ATTACH_FILES: 1n << 15n,
	/** Allows reading message history */
	READ_MESSAGE_HISTORY: 1n << 16n,
	/** Allows @everyone and @here mentions */
	MENTION_EVERYONE: 1n << 17n,
	/** Allows usage of external emojis */
	USE_EXTERNAL_EMOJIS: 1n << 18n,
	/** Allows viewing guild insights */
	VIEW_GUILD_INSIGHTS: 1n << 19n,
	/** Allows connecting to voice channels */
	CONNECT: 1n << 20n,
	/** Allows speaking in voice channels */
	SPEAK: 1n << 21n,
	/** Allows muting members in voice channels */
	MUTE_MEMBERS: 1n << 22n,
	/** Allows deafening members in voice channels */
	DEAFEN_MEMBERS: 1n << 23n,
	/** Allows moving members between voice channels */
	MOVE_MEMBERS: 1n << 24n,
	/** Allows voice activity detection */
	USE_VAD: 1n << 25n,
	/** Allows changing own nickname */
	CHANGE_NICKNAME: 1n << 26n,
	/** Allows changing others' nicknames */
	MANAGE_NICKNAMES: 1n << 27n,
	/** Allows management and editing of roles */
	MANAGE_ROLES: 1n << 28n,
	/** Allows management and editing of webhooks */
	MANAGE_WEBHOOKS: 1n << 29n,
	/** Allows managing guild expressions */
	MANAGE_GUILD_EXPRESSIONS: 1n << 30n,
	/** Allows using application commands */
	USE_APPLICATION_COMMANDS: 1n << 31n,
	/** Allows requesting to speak in stage channels */
	REQUEST_TO_SPEAK: 1n << 32n,
	/** Allows managing scheduled events */
	MANAGE_EVENTS: 1n << 33n,
	/** Allows managing threads */
	MANAGE_THREADS: 1n << 34n,
	/** Allows creating public threads */
	CREATE_PUBLIC_THREADS: 1n << 35n,
	/** Allows creating private threads */
	CREATE_PRIVATE_THREADS: 1n << 36n,
	/** Allows usage of external stickers */
	USE_EXTERNAL_STICKERS: 1n << 37n,
	/** Allows sending messages in threads */
	SEND_MESSAGES_IN_THREADS: 1n << 38n,
	/** Allows using embedded activities */
	USE_EMBEDDED_ACTIVITIES: 1n << 39n,
	/** Allows moderating members (timeouts) */
	MODERATE_MEMBERS: 1n << 40n,
	/** Allows viewing creator monetization analytics */
	VIEW_CREATOR_MONETIZATION_ANALYTICS: 1n << 41n,
	/** Allows using soundboard */
	USE_SOUNDBOARD: 1n << 42n,
	/** Allows creating guild expressions */
	CREATE_GUILD_EXPRESSIONS: 1n << 43n,
	/** Allows creating scheduled events */
	CREATE_EVENTS: 1n << 44n,
	/** Allows using external sounds */
	USE_EXTERNAL_SOUNDS: 1n << 45n,
	/** Allows sending voice messages */
	SEND_VOICE_MESSAGES: 1n << 46n,
	/** Allows setting voice channel status */
	SET_VOICE_CHANNEL_STATUS: 1n << 48n,
	/** Allows sending polls */
	SEND_POLLS: 1n << 49n,
	/** Allows user-installed apps to send public responses */
	USE_EXTERNAL_APPS: 1n << 50n,
	/** Allows pinning and unpinning messages */
	PIN_MESSAGES: 1n << 51n,
	/** Allows bypassing slowmode restrictions */
	BYPASS_SLOWMODE: 1n << 52n,
} as const;