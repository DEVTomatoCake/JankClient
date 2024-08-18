# TODO list

List of properties which should be editable somewhere, and handled if necessary (e.g. for hiding reactions or embeds).

| Status | Meaning
| --- | ---
| ❌ | Not implemented but planned
| 🟨 | Partly implemented
| ⚙️ | Partly implemented: Settings only
| 🗨️ | Partly implemented: Functionality/Displaying only
| ✅ | Implemented
| ⛔ | Not planned or impossible due to missing information

## Endpoints

### Global user

#### User data

`PATCH /users/@me/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ✅ | username | string - Constraints: 1 to 100 chars
| ✅ | avatar | string┃null
| ✅ | bio | string - Constraints: Max 1024 chars
| ❌ | accent_color | integer
| ❌ | banner | string┃null
| ❌ | new_password | string
| ❌ | email | string
| 🗨️ | discriminator | string

#### User profile

`PATCH /users/{id}/profile/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ✅ | bio | string
| ❌ | accent_color | integer┃null
| ❌ | banner | string┃null
| ✅ | pronouns | string
| ❌ | theme_colors | [integer, integer]

#### User settings

`PATCH /users/@me/settings/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | status | string - one of: dnd┃idle┃invisible┃online
| ⛔ | afk_timeout | integer | Where is this used?
| ⛔ | allow_accessibility_detection | boolean | What's this for?
| 🗨️ | animate_emoji | boolean
| ❌ | animate_stickers | integer | 0 = enabled, 1 = only on focus, 2 = disabled
| ⛔ | contact_sync_enabled | boolean | Not possible in Web
| 🗨️ | convert_emoticons | boolean
| ❌ | custom_status | object - one of: 1: object: emoji_id: string, emoji_name: string, expires_at: integer, text: string; 2: null
| ⛔ | default_guilds_restricted | boolean | What's this for?
| ⛔ | detect_platform_accounts | boolean | What's this for?
| ❌ | developer_mode | boolean
| ⛔ | disable_games_tab | boolean | No use in SB
| 🗨️ | enable_tts_command | boolean
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
| 🗨️ | render_embeds | boolean
| 🗨️ | render_reactions | boolean
| ⛔ | restricted_guilds | [string] | What's this for?
| ⛔ | show_current_game | boolean | Not possible in Web
| ⛔ | stream_notifications_enabled | boolean | What's this for?
| ✅ | theme | string - one of: dark┃light
| ⛔ | timezone_offset | integer | Where is this used?
| ❌ | view_nsfw_guilds | boolean

#### Connections

`PATCH /users/@me/connections/{connection_name}/{connection_id}/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | visibility | boolean
| ❌ | show_activity | boolean
| ❌ | metadata_visibility | boolean

#### Disable account

`POST /users/@me/disable/`

#### Delete account

`POST /users/@me/delete/`

### Per-guild user

#### Guild user settings

`PATCH /users/@me/guilds/{guild_id}/settings/`

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

#### Guild member profile

`PATCH /guilds/{guild_id}/profile/{member_id}`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | banner | string┃null
| ❌ | nick | string
| ❌ | bio | string
| ❌ | pronouns | string
| ❌ | theme_colors | [integer, integer]

#### Guild member nickname edit

`PATCH /guilds/{guild_id}/members/{member_id}/nick/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | nick* | string

### Guild moderation

#### Create ban

`PUT /guilds/{guild_id}/bans/{user_id}`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | delete_message_seconds | string
| ❌ | delete_message_days | string
| ❌ | reason | string

#### Bulk ban

`POST /guilds/{guild_id}/bulk-ban/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | user_ids* | [string]
| ❌ | delete_message_seconds | integer

#### Add role

`PUT /guilds/{guild_id}/members/{member_id}/roles/{role_id}/`

### Guild

#### Guild settings

`PATCH /guilds/{guild_id}/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | name | string
| ❌ | banner | string┃null
| ❌ | splash | string┃null
| ❌ | description | string
| ❌ | features | [string]
| ❌ | verification_level | integer
| ❌ | default_message_notifications | integer
| ❌ | system_channel_flags | integer
| ❌ | explicit_content_filter | integer
| ❌ | public_updates_channel_id | string
| ❌ | afk_timeout | integer
| ❌ | afk_channel_id | string
| ❌ | preferred_locale | string
| ❌ | premium_progress_bar_enabled | boolean
| ❌ | discovery_splash | string
| ❌ | icon | string┃null
| ❌ | region | string
| ❌ | guild_template_code | string
| ❌ | system_channel_id | string
| ❌ | rules_channel_id | string

#### Widget

`PATCH /guilds/{guild_id}/widget/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | enabled* | boolean
| ❌ | channel_id* | string

#### Welcome screen

`PATCH /guilds/{guild_id}/welcome-screen/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | welcome_channels | array of object: channel_id*: string, description*: string, emoji_id: string, emoji_name: string
| ❌ | enabled | boolean
| ❌ | description | string

#### Role positions

`PATCH /guilds/{guild_id}/roles/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | id* | string
| ❌ | position* | integer

#### Channel positions

`PATCH /guilds/{guild_id}/channels/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ✅ | id* | string
| ✅ | position | integer
| ❌ | lock_permissions | boolean
| ✅ | parent_id | string

#### Vanity URL

`PATCH /guilds/{guild_id}/vanity-url/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | code | string

#### Guild template

`POST /guilds/{guild_id}/templates/`

`PATCH /guilds/{guild_id}/templates/{code}`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | name* | string
| ❌ | description | string

### Guild emojis

#### Guild emoji create

`POST /guilds/{guild_id}/emojis/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | name | string
| ❌ | image* | string
| ❌ | require_colons | boolean┃null
| ❌ | roles | [string]

#### Guild emoji edit

`PATCH /guilds/{guild_id}/emojis/{emoji_id}`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | name | string
| ❌ | roles | [string]

#### Guild emoji delete

`DELETE /guilds/{guild_id}/emojis/{emoji_id}`

### Guild stickers

#### Guild sticker create

`POST /guilds/{guild_id}/stickers/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | name* | string: Constraints: 2 to 30 chars
| ❌ | description | string: Constraints: Max 100 chars
| ❌ | tags * | string: Constraints: Max 200 chars

#### Guild sticker edit

`PATCH /guilds/{guild_id}/stickers/{sticker_id}`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | name* | string: Constraints: 2 to 30 chars
| ❌ | description | string: Constraints: Max 100 chars
| ❌ | tags* | string

#### Guild sticker delete

`DELETE /guilds/{guild_id}/stickers/{sticker_id}`

### Channel

#### Channel settings

`PATCH /channels/{channel_id}/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ✅ | name | string: Constraints: Max 100 chars
| ❌ | type | number: Allowed: 0┃1┃10┃11┃12┃13┃14┃15┃2┃255┃3┃33┃34┃35┃4┃5┃6┃64┃7┃8┃9
| ✅ | topic | string
| ❌ | icon | string┃null
| ❌ | bitrate | integer
| ❌ | user_limit | integer
| ❌ | rate_limit_per_user | integer
| ✅ | position | integer | Handled by the `positions` endpoint
| 🟨 | permission_overwrites | array of object: id*: string, type*: number (Allowed: 0┃1┃2), allow*: string, deny*: string
| ⛔ | parent_id | string | Handled by the position endpoint
| ✅ | nsfw | boolean
| ❌ | rtc_region | string
| ❌ | default_auto_archive_duration | integer
| ❌ | default_reaction_emoji | string┃null
| ❌ | flags | integer
| ❌ | default_thread_rate_limit_per_user | integer
| ❌ | video_quality_mode | integer

### Application

#### Application create

`POST /applications/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ✅ | name* | string
| ❌ | team_id | string or integer

#### Application edit

`PATCH /applications/{id}/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ✅ | description | string
| ✅ | icon | string
| ❌ | interactions_endpoint_url | string
| ❌ | max_participants | integer┃null
| ✅ | name | string
| ✅ | privacy_policy_url | string
| ❌ | role_connections_verification_url | string
| ❌ | tags | [string]
| ✅ | terms_of_service_url | string
| ✅ | bot_public | boolean
| ✅ | bot_require_code_grant | boolean
| ❌ | flags | integer

#### Application delete

`POST /applications/{id}/delete`

### Webhook

#### Webhook create

`POST /channels/{channel_id}/webhooks/`

| Status | Field | Type | Notes
| --- | --- | --- | ---
| ❌ | name* | string: Constraints: Max 80 chars
| ❌ | avatar | string

## Message types

| Status | ID | Type | Deleteable
| --- | --- | --- | ---
| ✅ | 0 | DEFAULT | ✅
| ❌ | 1 | RECIPIENT_ADD | ❌
| ❌ | 2 | RECIPIENT_REMOVE | ❌
| ❌ | 3 | CALL | ❌
| ❌ | 4 | CHANNEL_NAME_CHANGE | ❌
| ❌ | 5 | CHANNEL_ICON_CHANGE | ❌
| ❌ | 6 | CHANNEL_PINNED_MESSAGE | ✅
| ❌ | 7 | USER_JOIN | ✅
| ❌ | 8 | GUILD_BOOST | ✅
| ❌ | 9 | GUILD_BOOST_TIER_1 | ✅
| ❌ | 10 | GUILD_BOOST_TIER_2 | ✅
| ❌ | 11 | GUILD_BOOST_TIER_3 | ✅
| ❌ | 12 | CHANNEL_FOLLOW_ADD | ✅
| ❌ | 14 | GUILD_DISCOVERY_DISQUALIFIED | ✅
| ❌ | 15 | GUILD_DISCOVERY_REQUALIFIED | ✅
| ❌ | 16 | GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING | ✅
| ❌ | 17 | GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING | ✅
| ❌ | 18 | THREAD_CREATED | ✅
| ✅ | 19 | REPLY | ✅
| ❌ | 20 | CHAT_INPUT_COMMAND | ✅
| ❌ | 21 | THREAD_STARTER_MESSAGE | ❌
| ❌ | 22 | GUILD_INVITE_REMINDER | ✅
| ❌ | 23 | CONTEXT_MENU_COMMAND | ✅
| ❌ | 24 | AUTO_MODERATION_ACTION | ✅*
| ❌ | 25 | ROLE_SUBSCRIPTION_PURCHASE | ✅
| ❌ | 26 | INTERACTION_PREMIUM_UPSELL | ✅
| ❌ | 27 | STAGE_START | ✅
| ❌ | 28 | STAGE_END | ✅
| ❌ | 29 | STAGE_SPEAKER | ✅
| ❌ | 31 | STAGE_TOPIC | ✅
| ❌ | 32 | GUILD_APPLICATION_PREMIUM_SUBSCRIPTION | ✅
| ❌ | 36 | GUILD_INCIDENT_ALERT_MODE_ENABLED | ✅
| ❌ | 37 | GUILD_INCIDENT_ALERT_MODE_DISABLED | ✅
| ❌ | 38 | GUILD_INCIDENT_REPORT_RAID | ✅
| ❌ | 39 | GUILD_INCIDENT_REPORT_FALSE_ALARM | ✅
| ❌ | 44 | PURCHASE_NOTIFICATION | ✅

* Can only be deleted by members with `MANAGE_MESSAGES` permission

## Gateway events

| Status | Type | Notes
| --- | --- | ---
| ✅ | READY
| ✅ | CHANNEL_CREATE
| ✅ | CHANNEL_UPDATE
| ✅ | CHANNEL_DELETE
| ❌ | CHANNEL_PINS_UPDATE
| ❌ | CHANNEL_RECIPIENT_ADD
| ❌ | CHANNEL_RECIPIENT_REMOVE
| ✅ | GUILD_CREATE
| ❌ | GUILD_UPDATE
| ✅ | GUILD_DELETE
| ❌ | GUILD_BAN_ADD
| ❌ | GUILD_BAN_REMOVE
| ❌ | GUILD_EMOJIS_UPDATE
| ❌ | GUILD_STICKERS_UPDATE
| ❌ | GUILD_INTEGRATIONS_UPDATE
| ❌ | GUILD_MEMBER_ADD
| ❌ | GUILD_MEMBER_REMOVE
| ❌ | GUILD_MEMBER_UPDATE
| ❌ | GUILD_MEMBER_SPEAKING
| ✅ | GUILD_MEMBERS_CHUNK
| ❌ | GUILD_MEMBER_LIST_UPDATE
| ❌ | GUILD_ROLE_CREATE
| ❌ | GUILD_ROLE_DELETE
| ❌ | GUILD_ROLE_UPDATE
| ⛔ | INVITE_CREATE | Not needed
| ⛔ | INVITE_DELETE | Not needed
| ✅ | MESSAGE_CREATE
| ✅ | MESSAGE_UPDATE
| ✅ | MESSAGE_DELETE
| ❌ | MESSAGE_DELETE_BULK
| ✅ | MESSAGE_REACTION_ADD
| ✅ | MESSAGE_REACTION_REMOVE
| ❌ | MESSAGE_REACTION_REMOVE_ALL
| ❌ | MESSAGE_REACTION_REMOVE_EMOJI
| ❌ | PRESENCE_UPDATE
| ✅ | TYPING_START
| ✅ | USER_UPDATE
| ❌ | USER_DELETE
| ❌ | USER_CONNECTIONS_UPDATE
| ✅ | USER_NOTE_UPDATE
| ❌ | WEBHOOKS_UPDATE
| ❌ | INTERACTION_CREATE
| ❌ | VOICE_STATE_UPDATE
| ❌ | VOICE_SERVER_UPDATE
| ❌ | APPLICATION_COMMAND_CREATE
| ❌ | APPLICATION_COMMAND_UPDATE
| ❌ | APPLICATION_COMMAND_DELETE
| ✅ | MESSAGE_ACK
| ❌ | RELATIONSHIP_ADD
| ❌ | RELATIONSHIP_REMOVE
| ❌ | SESSIONS_REPLACE
| ❌ | INVALIDATED
| ❌ | RATELIMIT
