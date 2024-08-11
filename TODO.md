# TODO list

List of properties which should be editable somewhere, and handled if necessary (e.g. for hiding reactions or embeds).

| Status | Meaning
| --- | ---
| ❌ | Not implemented but planned
| 🟨 | Partly implemented
| ✅ | Implemented
| ⛔ | Not planned or impossible due to missing information

## User data

`/users/@me/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ✅ | username | string - Constraints: 1 to 100 chars
| ✅ | avatar | string┃null
| ✅ | bio | string - Constraints: Max 1024 chars
| ❌ | accent_color | integer
| ❌ | banner | string┃null
| ❌ | new_password | string
| ❌ | email | string
| ❌ | discriminator | string

## User profile

`/users/{id}/profile/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ✅ | bio | string
| ❌ | accent_color | integer┃null
| ❌ | banner | string┃null
| ✅ | pronouns | string
| ❌ | theme_colors | [integer, integer]

## User settings

`/users/@me/settings/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | status | string - one of: dnd┃idle┃invisible┃online
| ❌ | afk_timeout | integer
| ⛔ | allow_accessibility_detection | boolean | What's this for?
| ❌ | animate_emoji | boolean
| ❌ | animate_stickers | integer
| ⛔ | contact_sync_enabled | boolean | Not possible in Web
| ❌ | convert_emoticons | boolean
| ❌ | custom_status | object - one of: 1: object: emoji_id: string, emoji_name: string, expires_at: integer, text: string; 2: null
| ⛔ | default_guilds_restricted | boolean | What's this for?
| ⛔ | detect_platform_accounts | boolean | What's this for?
| ❌ | developer_mode | boolean
| ⛔ | disable_games_tab | boolean | No use in SB
| ❌ | enable_tts_command | boolean
| ❌ | explicit_content_filter | integer
| ⛔ | friend_discovery_flags | integer | What's this for?
| ⛔ | friend_source_flags | object - all*: boolean | What's this for?
| ⛔ | gateway_connected | boolean | What's this for?
| ❌ | gif_auto_play | boolean
| ❌ | guild_folders | array of object: color*: integer, guild_ids*: [string], id*: integer, name*: string, guild_positions: [string]
| ⛔ | inline_attachment_media | boolean | What's this for?
| ⛔ | inline_embed_media | boolean | What's this for?
| ❌ | locale | string
| ❌ | message_display_compact | boolean
| ⛔ | native_phone_integration_enabled | boolean | What's this for?
| ❌ | render_embeds | boolean
| ❌ | render_reactions | boolean
| ⛔ | restricted_guilds | [string] | What's this for?
| ⛔ | show_current_game | boolean | Not possible in Web
| ⛔ | stream_notifications_enabled | boolean | What's this for?
| ✅ | theme | string - one of: dark┃light
| ❌ | timezone_offset | integer
| ❌ | view_nsfw_guilds | boolean

## Guild settings

`/users/@me/guilds/{guild_id}/settings/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | channel_overrides | object: [any-key]: object: message_notifications*: integer; mute_config*: object: end_time*: integer, selected_time_window*: integer, muted*: boolean, channel_id*: string┃null
| ❌ | message_notifications | integer
| ❌ | mobile_push | boolean
| ❌ | mute_config | object - one of: 1: object: end_time*: integer, selected_time_window*: integer; 2: null
| ❌ | muted | boolean
| ❌ | suppress_everyone | boolean
| ❌ | suppress_roles | boolean
| ⛔ | flags | integer | Which flags?
| ❌ | mute_scheduled_events | boolean
| ❌ | hide_muted_channels | boolean
| ⛔ | notify_highlights | number | What's this for?

## Guild member settings

`/guilds/{guild_id}/profile/{member_id}`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | banner | string┃null
| ❌ | nick | string
| ❌ | bio | string
| ❌ | pronouns | string
| ❌ | theme_colors | [integer, integer]
