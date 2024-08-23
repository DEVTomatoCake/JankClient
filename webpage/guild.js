"use strict"

class Guild {
	static contextmenu = new Contextmenu()
	static setupcontextmenu() {
		Guild.contextmenu.addbutton("Copy guild id", (event, guild) => {
			navigator.clipboard.writeText(guild.id)
		}, null, owner => owner.localuser.settings.developer_mode)

		Guild.contextmenu.addbutton("Mark as read", (event, guild) => {
			guild.markAsRead()
		})

		Guild.contextmenu.addbutton("Create invite", async (event, guild) => {
			if (Object.keys(guild.channelids).length == 0) return alert("No channels to create invite for")

			let res = await fetch(guild.info.api + "/channels/" + (guild.prevchannel ? guild.prevchannel.id : Object.keys(guild.channelids)[0]) + "/invites", {
				method: "POST",
				headers: guild.headers
			})
			let json = await res.json()
			console.log(json)

			const inviteCreateError = document.createElement("span")
			if (res.ok) inviteCreateError.textContent = "Invite created: " + new URL(guild.info.api).origin + "/invite/" + json.code
			else {
				inviteCreateError.textContent = json.message || "An error occurred (response code " + res.status + ")"
				console.error("Unable to create invite", json)
			}

			const dialog = new Dialog(["vdiv",
				["html", inviteCreateError],
				["button",
					"",
					"Create invite",
					async () => {
						res = await fetch(guild.info.api + "/channels/" + (guild.prevchannel ? guild.prevchannel.id : Object.keys(guild.channelids)[0]) + "/invites", {
							method: "POST",
							headers: guild.headers
						})
						json = await res.json()
						console.log(json)

						if (res.ok) inviteCreateError.textContent = "Invite created: " + new URL(guild.info.api).origin + "/invite/" + json.code
						else {
							inviteCreateError.textContent = json.message || "An error occurred (response code " + res.status + ")"
							console.error("Unable to create invite", json)
						}
					}
				]
			])
			dialog.show()
		})

		Guild.contextmenu.addbutton("Settings", (event, guild) => {
			guild.generateSettings()
		})

		Guild.contextmenu.addbutton("Notifications", (event, guild) => {
			guild.setNotification()
		})

		Guild.contextmenu.addbutton("Edit server profile", (event, guild) => {
			guild.editProfile()
		})

		Guild.contextmenu.addbutton("Leave server", (event, guild) => {
			guild.confirmLeave()
		}, null, g => g.properties.owner_id != g.member.user.id)

		Guild.contextmenu.addbutton("Delete server", (event, guild) => {
			guild.confirmDelete()
		}, null, g => g.properties.owner_id == g.member.user.id)
	}

	generateSettings() {
		const settings = new Settings("Settings for " + this.properties.name)

		if (this.member.hasPermission("MANAGE_GUILD")) {
			const guildSettings = settings.addButton("Server settings")
			const newSettings = {}

			guildSettings.addTextInput("Name", value => {
				if (value.trim() && this.properties.name.trim() != value.trim()) newSettings.name = value.trim()

				this.updateSettings(newSettings)
			}, { initText: this.properties.name })
			guildSettings.addTextInput("Description", value => {
				if (value.trim() && this.properties.description?.trim() != value.trim()) newSettings.description = value.trim()
			}, { initText: this.properties.description || "" })

			let iconFile
			const iconInput = guildSettings.addFileInput("Upload icon:", () => {
				if (iconFile !== void 0) this.updateGuildImage("icon", iconFile)
			}, { clear: true })
			iconInput.watchForChange(value => {
				if (value.length > 0) iconFile = value[0]
				else iconFile = null
			})

			let bannerFile
			const bannerInput = guildSettings.addFileInput("Upload banner:", () => {
				if (bannerFile !== void 0) this.updateGuildImage("banner", bannerFile)
			}, { clear: true })
			bannerInput.watchForChange(value => {
				if (value.length > 0) bannerFile = value[0]
				else bannerFile = null
			})

			let splashFile
			const splashInput = guildSettings.addFileInput("Upload splash:", () => {
				if (splashFile !== void 0) this.updateGuildImage("splash", splashFile)
			}, { clear: true })
			splashInput.watchForChange(value => {
				if (value.length > 0) splashFile = value[0]
				else splashFile = null
			})

			let discoverySplashFile
			const discoverySplashInput = guildSettings.addFileInput("Upload discovery splash:", () => {
				if (discoverySplashFile !== void 0) this.updateGuildImage("discovery_splash", discoverySplashFile)
			}, { clear: true })
			discoverySplashInput.watchForChange(value => {
				if (value.length > 0) discoverySplashFile = value[0]
				else discoverySplashFile = null
			})

			const verificationLevels = [
				"None: unrestricted",
				"Low: must have verified email on the account",
				"Medium: must be registered on the Spacebar instance for longer than 5 minutes",
				"High: must be a member of the server for longer than 10 minutes",
				"Very high: must have a verified phone number"
			]
			guildSettings.addSelect("Verification level", value => {
				if (value != this.properties.verification_level) newSettings.verification_level = value
			}, verificationLevels, {
				defaultIndex: this.properties.verification_level
			})

			const messageNotifs = [
				"All messages: members will receive notifications for all messages by default",
				"Mentions only: members will receive notifications only for messages that @mention them by default"
			]
			guildSettings.addSelect("Default message notifications", value => {
				if (value != this.properties.default_message_notifications) newSettings.default_message_notifications = value
			}, messageNotifs, {
				defaultIndex: this.properties.default_message_notifications
			})

			const contentFilter = [
				"Disabled: media content will not be scanned",
				"Members without roles: media content sent by members without roles will be scanned",
				"All members: media content sent by all members will be scanned"
			]
			guildSettings.addSelect("Default message notifications", value => {
				if (value != this.properties.default_message_notifications) newSettings.default_message_notifications = value
			}, contentFilter, {
				defaultIndex: this.properties.default_message_notifications
			})

			guildSettings.addCheckboxInput("Enable premium (boost level) progress bar", value => {
				if (value != this.properties.premium_progress_bar_enabled) newSettings.premium_progress_bar_enabled = value
			}, { initState: this.properties.premium_progress_bar_enabled })

			guildSettings.addTextInput("Preferred locale", value => {
				if (value == this.properties.preferred_locale) return
				if (value.length != 5) return alert("Please use a valid locale code (e.g. en-US)")
				newSettings.preferred_locale = value
			}, { initText: this.properties.locale })

			const guildFeatures = settings.addButton("Server features")
			const features = [
				...(this.properties.features.includes("COMMUNITY") ? ["COMMUNITY"] : []),
				...(this.properties.features.includes("INVITES_DISABLED") ? ["INVITES_DISABLED"] : []),
				...(this.properties.features.includes("DISCOVERABLE") ? ["DISCOVERABLE"] : [])
			]

			guildFeatures.addCheckboxInput("Enable community", value => {
				if (value) features.push("COMMUNITY")
				else features.splice(features.indexOf("COMMUNITY"), 1)

				this.updateSettings({features})
			}, { initState: features.includes("COMMUNITY") })
			guildFeatures.addCheckboxInput("Disable all server invites", value => {
				if (value) features.push("INVITES_DISABLED")
				else features.splice(features.indexOf("INVITES_DISABLED"), 1)
			}, { initState: features.includes("INVITES_DISABLED") })
			guildFeatures.addCheckboxInput("Show server in Server discovery", value => {
				if (value) features.push("DISCOVERABLE")
				else features.splice(features.indexOf("DISCOVERABLE"), 1)
			}, { initState: features.includes("DISCOVERABLE") })

			/*const guildWidget = settings.addButton("Widget")
			guildWidget.addCheckboxInput("Enable widget", value => {
				if (value != )
			}, { initState: this.properties. })*/
		}

		const roles = settings.addButton("Roles")
		const permlist = []
		for (const role of this.roles) {
			permlist.push([role.snowflake, role.permissions])
		}
		roles.options.push(new RoleList(permlist, this, this.updateRolePermissions.bind(this)))

		settings.show()
	}

	/**
	 * @param {guildjson|-1} json
	 * @param {LocalUser} owner
	 * @param {memberjson|User|null} member
	 */
	constructor(json, owner, member) {
		if (json == -1 || member === null) return

		this.owner = owner
		this.headers = this.owner.headers

		this.channels = []
		this.channelids = {}
		this.snowflake = new SnowFlake(json.id, this)
		this.properties = json.properties
		this.roles = []
		this.roleids = new Map()
		this.emojis = json.emojis
		this.prevchannel = void 0
		this.message_notifications = 0

		for (const roley of json.roles) {
			const roleh = new Role(roley, this)
			this.roles.push(roleh)
			this.roleids.set(roleh.snowflake, roleh)
		}

		if (member instanceof User) Member.resolveMember(member, this).then(m => this.member = m)
		else Member.new(member, this).then(m => this.member = m)

		for (const thing of json.channels) {
			const temp = new Channel(thing, this)
			this.channels.push(temp)
			this.channelids[temp.id] = temp
		}

		this.headchannels = []
		for (const thing of this.channels) {
			if (thing.resolveparent(this)) this.headchannels.push(thing)
		}
	}
	calculateReorder() {
		let position = -1
		const build = []
		for (const thing of this.headchannels) {
			const thisthing = {
				id: thing.id,
				position: void 0,
				parent_id: void 0
			}

			if (thing.position <= position) {
				thisthing.position = position + 1
				thing.position = thisthing.position
			}
			position = thing.position
			if (thing.move_id && thing.move_id != thing.parent_id) {
				thing.parent_id = thing.move_id
				thisthing.parent_id = thing.parent_id.id
				thing.move_id = null
			}
			if (thisthing.position || thisthing.parent_id) build.push(thisthing)

			if (thing.children.length > 0) {
				const things = thing.calculateReorder()
				for (const thing2 of things) {
					build.push(thing2)
				}
			}
		}
		if (build.length == 0) return

		fetch(this.info.api + "/guilds/" + this.id + "/channels", {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(build)
		})
	}
	get localuser() {
		return this.owner
	}
	get info() {
		return this.owner.info
	}
	get id() {
		return this.snowflake.id
	}
	sortchannels() {
		this.headchannels.sort((a, b) => a.position - b.position)
	}
	unreads(html) {
		if (html) this.html = html
		else html = this.html

		let read = true
		for (const channel of this.channels) {
			if (channel.hasunreads) {
				read = false
				break
			}
		}

		if (html) {
			if (read) html.children[0].classList.remove("notiunread")
			else html.children[0].classList.add("notiunread")
		}
	}
	getHTML() {
		this.sortchannels()

		const build = document.createElement("div")
		if (this.id == "@me") build.classList.add("dm-container")

		for (const thing of this.headchannels) {
			const createdChannel = thing.createGuildHTML(this.isAdmin())
			if (createdChannel) build.appendChild(createdChannel)
		}
		return build
	}
	isAdmin() {
		return this.member.isAdmin()
	}
	async markAsRead() {
		const build = {read_states: []}
		for (const thing of this.channels) {
			if (thing.hasunreads) {
				build.read_states.push({channel_id: thing.id, message_id: thing.lastmessageid, read_state_type: 0})
				thing.lastreadmessageid = thing.lastmessageid
				thing.myhtml.classList.remove("cunread")
			}
		}
		this.unreads()
		fetch(this.info.api + "/read-states/ack-bulk", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify(build)
		})
	}
	hasRole(r) {
		if (r instanceof Role) r = r.id
		return this.member.hasRole(r)
	}
	loadChannel(id) {
		if (id && this.channelids[id]) {
			this.channelids[id].getHTML()
			return
		}
		if (this.prevchannel) {
			this.prevchannel.getHTML()
			return
		}

		for (const thing of this.channels) {
			if (thing.children.length == 0) {
				thing.getHTML()
				return
			}
		}
	}
	loadGuild() {
		this.localuser.loadGuild(this.id)
	}
	updateChannel(json) {
		SnowFlake.getSnowFlakeFromID(json.id, Channel).getObject().updateChannel(json)
		for (const thing of this.channels) {
			thing.children = []
		}

		this.headchannels = []
		for (const thing of this.channels) {
			if (thing.resolveparent(this)) this.headchannels.push(thing)
		}
	}
	createChannelpac(json) {
		const thischannel = new Channel(json, this)
		this.channelids[json.id] = thischannel
		this.channels.push(thischannel)
		thischannel.resolveparent(this)
		if (!thischannel.parent) this.headchannels.push(thischannel)

		this.calculateReorder()
	}
	createchannels() {
		let name = ""
		let type = 0
		const channelselect = new Dialog(
			["vdiv",
				["radio", "Choose channel type",
					["Text", "Voice", "Announcement"],
					value => {
						type = { text: 0, voice: 2, announcement: 5 }[value.toLowerCase()]
					},
					0
				],
				["textbox", "Channel name", "", event => {
					name = event.target.value
				}],
				["button", "", "submit", () => {
					this.createChannel(name, type)
					channelselect.hide()
				}]
			])
		channelselect.show()
	}
	createcategory() {
		let name = ""
		const channelselect = new Dialog(
			["vdiv",
				["textbox", "Name of category", "", event => {
					name = event.target.value
				}],
				["button", "", "submit", () => {
					this.createChannel(name, 4)
					channelselect.hide()
				}]
			])
		channelselect.show()
	}
	delChannel(json) {
		const channel = this.channelids[json.id]
		delete this.channelids[json.id]

		this.channels.splice(this.channels.indexOf(channel), 1)
		const indexy = this.headchannels.indexOf(channel)
		if (indexy != -1) this.headchannels.splice(indexy, 1)
	}
	createChannel(name, type) {
		fetch(this.info.api + "/guilds/" + this.id + "/channels", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({ name, type })
		})
	}
	notisetting(settings) {
		this.message_notifications = settings.message_notifications
	}
	setNotification() {
		const fields = {
			message_notifications: this.message_notifications,
			muted: this.muted,
			suppress_everyone: this.suppress_everyone,
			suppress_roles: this.suppress_roles
		}

		const notiselect = new Dialog(
		["vdiv",
			["radio", "select notifications type",
				["all", "only mentions", "none"],
				i => {
					fields.message_notifications = ["all", "only mentions", "none"].indexOf(i)
				},
				fields.message_notifications
			],
			["checkbox", "Muted", this.muted, event => {
				fields.muted = event.target.checked
			}],
			["checkbox", "Suppress @everyone/@here mentions", this.suppress_everyone, event => {
				fields.suppress_everyone = event.target.checked
			}],
			["checkbox", "Suppress role mentions", this.suppress_roles, event => {
				fields.suppress_roles = event.target.checked
			}],
			["button", "", "submit", () => {
				fetch(this.info.api + "/users/@me/guilds/" + this.id + "/settings", {
					method: "PATCH",
					headers: this.headers,
					body: JSON.stringify(fields)
				})

				this.message_notifications = fields.message_notifications
				this.muted = fields.muted
				this.suppress_everyone = fields.suppress_everyone
				this.suppress_roles = fields.suppress_roles
			}]
		])
		notiselect.show()
	}
	confirmLeave() {
		const full = new Dialog([
			"vdiv",
			["title",
				"Are you sure you want to leave?"
			],
			["hdiv",
				["button",
					"",
					"Yes, I'm sure",
					async () => {
						await this.leave()
						full.hide()
					}
				],
				["button",
					"",
					"Nevermind",
					() => {
						full.hide()
					}
				]
			]
		])
		full.show()
	}
	async leave() {
		return fetch(this.info.api + "/users/@me/guilds/" + this.id, {
			method: "DELETE",
			headers: this.headers
		})
	}
	generateGuildIcon() {
		const divy = document.createElement("div")

		const noti = document.createElement("div")
		noti.classList.add("unread")
		if (this.properties.icon) noti.classList.add("servericon-unread")
		divy.append(noti)

		this.localuser.guildhtml.set(this.id, divy)
		if (this.properties.icon) {
			const img = document.createElement("img")
			img.classList.add("pfp", "servericon")
			img.crossOrigin = "anonymous"
			img.src = this.info.cdn + "/icons/" + this.properties.id + "/" + this.properties.icon + ".png?size=48"
			img.alt = "Server: " + this.properties.name
			divy.appendChild(img)

			img.addEventListener("click", () => {
				this.loadGuild()
				this.loadChannel()
			})
			Guild.contextmenu.bindContextmenu(img, this)
		} else {
			const div = document.createElement("div")
			div.textContent = this.properties.name.replace(/'s /g, " ").replace(/\w+/g, word => word[0]).replace(/\s/g, "")
			div.classList.add("blankserver", "servericon")
			divy.appendChild(div)
			div.addEventListener("click", () => {
				this.loadGuild()
				this.loadChannel()
			})
			Guild.contextmenu.bindContextmenu(div, this)
		}
		return divy
	}
	confirmDelete() {
		let confirmname = ""
		const full = new Dialog([
			"vdiv",
			["title",
				"Are you sure you want to delete the server \"" + this.properties.name + "\"?"
			],
			["textbox",
				"Name of server:",
				"",
				event => {
					confirmname = event.target.value
				}
			],
			["hdiv",
				["button",
					"",
					"Yes, I'm sure",
					async () => {
						if (confirmname != this.properties.name) return

						await this.delete()
						full.hide()
					}
				],
				["button",
					"",
					"Nevermind",
					() => {
						full.hide()
					}
				]
			]
		])
		full.show()
	}
	async delete() {
		return fetch(this.info.api + "/guilds/" + this.id + "/delete", {
			method: "POST",
			headers: this.headers
		})
	}
	async createRole(name) {
		const fetched = await fetch(this.info.api + "/guilds/" + this.id + "/roles", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({
				name,
				color: 0,
				permissions: "0"
			})
		})
		const json = await fetched.json()

		const role = new Role(json, this)
		this.roleids.set(role.snowflake, role)
		this.roles.push(role)
		return role
	}
	async updateRolePermissions(id, perms) {
		const role = this.roleids[id]
		role.permissions.allow = perms.allow

		await fetch(this.info.api + "/guilds/" + this.id + "/roles/" + this.id, {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify({
				color: role.color,
				hoist: role.hoist,
				icon: role.icon,
				mentionable: role.mentionable,
				name: role.name,
				permissions: role.permissions.allow.toString(),
				unicode_emoji: role.unicode_emoji
			})
		})
	}
	editProfile() {
		const fields = {}

		const profileDialog = new Dialog(["vdiv",
			["textbox",
				"Nickname",
				this.member.nick || "",
				event => {
					fields.nick = event.target.value
				}
			],
			["textbox",
				"Pronouns",
				this.member.pronouns || "",
				event => {
					fields.pronouns = event.target.value
				}
			],
			["mdbox",
				"Bio:",
				this.member.bio || "",
				event => {
					fields.description = event.target.value
				}
			],
			["vdiv",
				this.member.banner ? ["img", this.member.banner, [128, 128]] : ["text", "No banner"],
				["fileupload", "Server profile banner:", event => {
					const reader = new FileReader()
					reader.readAsDataURL(event.target.files[0])
					reader.onload = () => {
						fields.banner = reader.result
					}
				}]
			],
			["button",
				"",
				"Save changes",
				async () => {
					const updateRes = await fetch(this.info.api + "/guilds/" + this.id + "/profile/" + this.member.id, {
						method: "PATCH",
						headers: this.headers,
						body: JSON.stringify(fields)
					})
					if (updateRes.ok) profileDialog.hide()
					else {
						const updateJSON = await updateRes.json()
						alert("An error occurred: " + updateJSON.message)
					}
				}
			]
		])
		profileDialog.show()
	}
	async updateSettings(json) {
		fetch(this.info.api + "/guilds/" + this.id, {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(json)
		})
	}
	updateGuildImage(property = "", file = null) {
		if (file) {
			const reader = new FileReader()
			reader.readAsDataURL(file)
			reader.onload = () => {
				fetch(this.info.api + "/guilds/" + this.id, {
					method: "PATCH",
					headers: this.headers,
					body: JSON.stringify({
						[property]: reader.result
					})
				})
			}
		} else {
			fetch(this.info.api + "/guilds/" + this.id, {
				method: "PATCH",
				headers: this.headers,
				body: JSON.stringify({
					[property]: null
				})
			})
		}
	}
}

Guild.setupcontextmenu()
