/**
 * @typedef {Object} readyjson
 * @property {number} op
 * @property {string} t
 * @property {number} s
 * @property {Object} d
 * @property {number} d.v
 * @property {mainuserjson} d.user
 * @property {Object} d.user_settings
 * @property {number} d.user_settings.index
 * @property {number} d.user_settings.afk_timeout
 * @property {boolean} d.user_settings.allow_accessibility_detection
 * @property {boolean} d.user_settings.animate_emoji
 * @property {number} d.user_settings.animate_stickers
 * @property {boolean} d.user_settings.contact_sync_enabled
 * @property {boolean} d.user_settings.convert_emoticons
 * @property {string} d.user_settings.custom_status
 * @property {boolean} d.user_settings.default_guilds_restricted
 * @property {boolean} d.user_settings.detect_platform_accounts
 * @property {boolean} d.user_settings.developer_mode
 * @property {boolean} d.user_settings.disable_games_tab
 * @property {boolean} d.user_settings.enable_tts_command
 * @property {0} d.user_settings.explicit_content_filter
 * @property {0} d.user_settings.friend_discovery_flags
 * @property {Object} d.user_settings.friend_source_flags
 * @property {boolean} d.user_settings.friend_source_flags.all
 * @property {boolean} d.user_settings.gateway_connected
 * @property {boolean} d.user_settings.gif_auto_play
 * @property {[]} d.user_settings.guild_folders
 * @property {[]} d.user_settings.guild_positions
 * @property {boolean} d.user_settings.inline_attachment_media
 * @property {boolean} d.user_settings.inline_embed_media
 * @property {string} d.user_settings.locale
 * @property {boolean} d.user_settings.message_display_compact
 * @property {boolean} d.user_settings.native_phone_integration_enabled
 * @property {boolean} d.user_settings.render_embeds
 * @property {boolean} d.user_settings.render_reactions
 * @property {[]} d.user_settings.restricted_guilds
 * @property {boolean} d.user_settings.show_current_game
 * @property {string} d.user_settings.status
 * @property {boolean} d.user_settings.stream_notifications_enabled
 * @property {string} d.user_settings.theme
 * @property {number} d.user_settings.timezone_offset
 * @property {boolean} d.user_settings.view_nsfw_guilds
 * @property {guildjson[]} d.guilds
 * @property {any[]} d.relationships
 * @property {Object} d.read_state
 * @property {{
				id: string,
				channel_id: string,
				last_message_id: string,
				last_pin_timestamp: string,
				mention_count: number //in theory, the server doesn't actually send this as far as I'm aware
			}[]} d.read_state.entries
 * @property {boolean} d.read_state.partial
 * @property {number} d.read_state.version
 * @property {Object} d.user_guild_settings
 * @property {{
				channel_overrides: unknown[], //will have to find example
				message_notifications: number,
				flags: number,
				hide_muted_channels: boolean,
				mobile_push: boolean,
				mute_config: null,
				mute_scheduled_events: boolean,
				muted: boolean,
				notify_highlights: number,
				suppress_everyone: boolean,
				suppress_roles: boolean,
				version: number,
				guild_id: string
			}[]} d.user_guild_settings.entries
 * @property {boolean} d.user_guild_settings.partial
 * @property {number} d.user_guild_settings.version
 * @property {dirrectjson[]} d.private_channels
 * @property {string} d.session_id
 * @property {string} d.country_code
 * @property {userjson[]} d.users
 * @property {memberjson[]} d.merged_members
 * @property {{
			active: boolean,
			activities: [], //will need to find example of this
			client_info: {
				version: number
			},
			session_id: string,
			status: string
		}[]} d.sessions
 * @property {string} d.resume_gateway_url
 * @property {Object} d.consents
 * @property {Object} d.consents.personalization
 * @property {boolean} d.consents.personalization.consented
 * @property {[]} d.experiments
 * @property {[]} d.guild_join_requests
 * @property {[]} d.connected_accounts
 * @property {[]} d.guild_experiments
 * @property {[]} d.geo_ordered_rtc_regions
 * @property {number} d.api_code_version
 * @property {number} d.friend_suggestion_count
 * @property {string} d.analytics_token
 * @property {boolean} d.tutorial
 * @property {string} d.session_type
 * @property {string} d.auth_session_id_hash
 * @property {Object} d.notification_settings
 * @property {number} d.notification_settings.flags
 */
/**
 * @typedef {userjson & {
 *     flags: number,
 *     mfa_enabled?: boolean,
 *     email?: string,
 *     phone?: string,
 *     verified: boolean,
 *     nsfw_allowed: boolean,
 *     premium: boolean,
 *     purchased_flags: number,
 *     premium_usage_flags: number,
 *     disabled: boolean
 * }} mainuserjson
 */
/**
 * @typedef {Object} userjson
 * @property {string} username
 * @property {string} discriminator
 * @property {string} id
 * @property {number} public_flags
 * @property {string} avatar
 * @property {string} accent_color
 * @property {string} banner
 * @property {string} bio
 * @property {boolean} bot
 * @property {string} premium_since
 * @property {number} premium_type
 * @property {string} theme_colors
 * @property {string} pronouns
 * @property {string} badge_ids
 */
/**
 * @typedef {Object} memberjson
 * @property {number} [index]
 * @property {string} id
 * @property {userjson|null} user
 * @property {string} guild_id
 * @property {Object} guild
 * @property {string} guild.id
 * @property {string} nick
 * @property {string[]} roles
 * @property {string} joined_at
 * @property {string} premium_since
 * @property {boolean} deaf
 * @property {boolean} mute
 * @property {boolean} pending
 * @property {boolean} [last_message_id]
 */
/**
 * @typedef {Object} guildjson
 * @property {{[key:string]:number}} application_command_counts
 * @property {channeljson[]} channels
 * @property {string} data_mode
 * @property {[]} emojis
 * @property {[]} guild_scheduled_events
 * @property {string} id
 * @property {boolean} large
 * @property {boolean} lazy
 * @property {number} member_count
 * @property {number} premium_subscription_count
 * @property {Object} properties
 * @property {string} properties.name
 * @property {string} properties.description
 * @property {string} properties.icon
 * @property {string} properties.splash
 * @property {string} properties.banner
 * @property {string[]} properties.features
 * @property {string} properties.preferred_locale
 * @property {string} properties.owner_id
 * @property {string} properties.application_id
 * @property {string} properties.afk_channel_id
 * @property {number} properties.afk_timeout
 * @property {string} properties.system_channel_id
 * @property {number} properties.verification_level
 * @property {number} properties.explicit_content_filter
 * @property {number} properties.default_message_notifications
 * @property {number} properties.mfa_level
 * @property {number} properties.vanity_url_code
 * @property {number} properties.premium_tier
 * @property {boolean} properties.premium_progress_bar_enabled
 * @property {number} properties.system_channel_flags
 * @property {string} properties.discovery_splash
 * @property {string} properties.rules_channel_id
 * @property {string} properties.public_updates_channel_id
 * @property {number} properties.max_video_channel_users
 * @property {number} properties.max_members
 * @property {number} properties.nsfw_level
 * @property {null} properties.hub_type
 * @property {null} properties.home_header
 * @property {string} properties.id
 * @property {string} properties.latest_onboarding_question_id
 * @property {number} properties.max_stage_video_channel_users
 * @property {boolean} properties.nsfw
 * @property {string} properties.safety_alerts_channel_id
 * @property {rolesjson[]} roles
 * @property {[]} stage_instances
 * @property {[]} stickers
 * @property {[]} threads
 * @property {string} version
 * @property {{}} guild_hashes
 * @property {string} joined_at
 */
/**
 * @typedef {Object} channeljson
 * @property {string} id
 * @property {string} created_at
 * @property {string} name
 * @property {string} icon
 * @property {number} type
 * @property {string} last_message_id
 * @property {string} guild_id
 * @property {string} parent_id
 * @property {string} last_pin_timestamp
 * @property {number} default_auto_archive_duration
 * @property {{
		id: string,
		allow: string,
		deny: string,
	}[]} permission_overwrites
 * @property {null} video_quality_mode
 * @property {boolean} nsfw
 * @property {string} topic
 * @property {string} retention_policy_id
 * @property {number} flags
 * @property {number} default_thread_rate_limit_per_user
 * @property {number} position
 */
/**
 * @typedef {Object} rolesjson
 * @property {string} id
 * @property {string} guild_id
 * @property {number} color
 * @property {boolean} hoist
 * @property {boolean} managed
 * @property {boolean} mentionable
 * @property {string} name
 * @property {string} permissions
 * @property {number} position
 * @property {string} icon
 * @property {string} unicode_emoji
 * @property {number} flags
 */
/**
 * @typedef {Object} dirrectjson
 * @property {string} id
 * @property {number} flags
 * @property {string} last_message_id
 * @property {number} type
 * @property {userjson[]} recipients
 * @property {boolean} is_spam
 */
/**
 * @typedef {Object} messagejson
 * @property {string} id
 * @property {string} channel_id
 * @property {string} guild_id
 * @property {userjson} author
 * @property {memberjson} [member]
 * @property {string} content
 * @property {string} timestamp
 * @property {string} edited_timestamp
 * @property {boolean} tts
 * @property {boolean} mention_everyone
 * @property {[]} mentions
 * @property {[]} mention_roles
 * @property {filejson[]} attachments
 * @property {embedjson[]} embeds
 * @property {{
		count: number,
		emoji: {
            name: string,
            id?: string,
            animated?: boolean
		},
		me: boolean
	}[]} reactions
 * @property {string} nonce
 * @property {boolean} pinned
 * @property {number} type
 */
/**
 * @typedef {Object} filejson
 * @property {string} id
 * @property {string} filename
 * @property {string} content_type
 * @property {number} width
 * @property {number} height
 * @property {string|undefined} proxy_url
 * @property {string} url
 * @property {number} size
 */
/**
 * @typedef {Object} embedjson
 * @property {string|null} type
 * @property {number} [color]
 * @property {Object} author
 * @property {string} [author.icon_url]
 * @property {string} [author.name]
 * @property {string} [author.url]
 * @property {string} [author.title]
 * @property {string} [title]
 * @property {string} [url]
 * @property {string} [description]
 * @property {{
		name:string,
		value:string,
		inline:boolean,
	}[]} [fields]
 * @property {Object} [footer]
 * @property {string} [footer.icon_url]
 * @property {string} [footer.text]
 * @property {string} [footer.thumbnail]
 * @property {string} [timestamp]
 * @property {Object} thumbnail
 * @property {string} thumbnail.proxy_url
 * @property {string} thumbnail.url
 * @property {Object} provider
 * @property {string} provider.name
 */
