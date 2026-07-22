# Documentation TODOs

I scanned the codebase for declarations that still lack JSDoc comments.
This file is a checklist only; I did **not** edit source files.

- Missing declaration items found: **683** across **43** files.
- Sections are merged per file so functions and properties live together in the same place.

## JSDoc checklist
- [x] `src/Builders/EmbedBuilder.ts`
- [x] `src/Cache/Channels.ts`
- [x] `src/Cache/Roles.ts`
- [x] `src/Cache/TTLCache.ts`
- [ ] `src/Client.ts`
- [ ] `src/Contracts/DiscordStructure.ts`
- [x] `src/DataStructures/BitField.ts`
- [ ] `src/Rest.ts`
- [ ] `src/Structures/Channel.ts`
- [x] `src/Structures/Emoji.ts`
- [ ] `src/Structures/Guild.ts`
- [x] `src/Structures/Member.ts`
- [ ] `src/Structures/Message.ts`
- [ ] `src/Structures/Role.ts`
- [x] `src/Structures/Sticker.ts`
- [x] `src/Structures/User.ts`
- [ ] `src/Types/DiscordAPITypes.ts`
- [ ] `src/Types/Internal.ts`
- [ ] `src/WSClient.ts`

## Needs judgment / property review

Some properties are obvious protocol mirrors and may not need JSDoc (`id`, `name`, `token`, etc.), but others are easy to misread.
I left a separate review section for fields that are especially likely to benefit from a short explanation:

- `src/Structures/Channel.ts` — `position` should clarify it is relative ordering within the parent/category, not a global sort order.
- `src/Structures/Message.ts` — `tts`, `pinned`, `mention_everyone`, and gateway-only extras can be easy to misinterpret without a note.
- `src/Structures/Role.ts` — role ordering fields and derived accessors should explain Discord’s hierarchy rules.
- `src/Structures/Member.ts` — permission-related and derived cache-backed fields should explain what is resolved versus stored.
- `src/Structures/Guild.ts` — Discord-specific settings like `system_channel_flags`, `premium_progress_bar_enabled`, and `incidents_data` may need a short description.
- `src/Cache/TTLCache.ts` — TTL bookkeeping fields and return values like `remainingTTL` and `touch` are easy to misunderstand.
- `src/Types/SimplicityTypes.ts` — event payload fields may deserve notes where the public event surface narrows or reshapes Discord data.

## Notes

- Private helpers are included when they appeared in the audit without JSDoc, even though they are lower priority than public API members.
- If you add or move declarations, rerun the audit before merging updates into this file.