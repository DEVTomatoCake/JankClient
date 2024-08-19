"use strict"

class Guild {
	static contextmenu = new Contextmenu()
	static setupcontextmenu() {
		Guild.contextmenu.addbutton("Copy guild id", function() {
			navigator.clipboard.writeText(this.id)
		}, null, owner => owner.localuser.settings.developer_mode)

		Guild.contextmenu.addbutton("Mark as read", function() {
			this.markAsRead()
		})

		Guild.contextmenu.addbutton("Create Invite", async function() {
			if (Object.keys(this.channelids).length == 0) return alert("No channels to create invite for")

			let res = await fetch(this.info.api + "/channels/" + (this.prevchannel ? this.prevchannel.id : Object.keys(this.channelids)[0]) + "/invites", {
				method: "POST",
				headers: this.headers
			})
			let json = await res.json()
			console.log(json)

			const inviteCreateError = document.createElement("span")
			if (res.ok) inviteCreateError.textContent = "Invite created: " + new URL(this.info.api).origin + "/invite/" + json.code
			else {
				inviteCreateError.textContent = json.message || "An error occurred (response code " + res.status + ")"
				console.error("Unable to create invite", json)
			}

			const full = new Dialog(["vdiv",
				["html", inviteCreateError],
				["button",
					"",
					"Create invite",
					async () => {
						res = await fetch(this.info.api + "/channels/" + (this.prevchannel ? this.prevchannel.id : Object.keys(this.channelids)[0]) + "/invites", {
							method: "POST",
							headers: this.headers
						})
						json = await res.json()
						console.log(json)

						if (res.ok) inviteCreateError.textContent = "Invite created: " + new URL(this.info.api).origin + "/invite/" + json.code
						else {
							inviteCreateError.textContent = json.message || "An error occurred (response code " + res.status + ")"
							console.error("Unable to create invite", json)
						}
					}
				]
			])
			full.show()
		})

		Guild.contextmenu.addbutton("Settings", function() {
			this.generateSettings()
		})

		Guild.contextmenu.addbutton("Notifications", function() {
			this.setNotification()
		})

		Guild.contextmenu.addbutton("Edit server profile", function() {
			this.editProfile()
		})

		Guild.contextmenu.addbutton("Leave server", function() {
			this.confirmLeave()
		}, null, g => g.properties.owner_id != g.member.user.id)

		Guild.contextmenu.addbutton("Delete server", function() {
			this.confirmDelete()
		}, null, g => g.properties.owner_id == g.member.user.id)
	}
	generateSettings() {
		const settings = new Settings("Settings for " + this.properties.name)
		const s1 = settings.addButton("roles")
		const permlist = []
		for (const thing of this.roles) {
			permlist.push([thing.snowflake, thing.permissions])
		}
		s1.options.push(new RoleList(permlist, this, this.updateRolePermissions.bind(this)))
		settings.show()
	}

	constructor(json, owner, member) {
		if (json == -1) return

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
				thing.move_id = void 0
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
			build.appendChild(thing.createGuildHTML(this.isAdmin()))
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
		let noti = this.message_notifications
		const notiselect = new Dialog(
		["vdiv",
			["radio", "select notifications type",
				["all", "only mentions", "none"],
				i => {
					noti = ["all", "only mentions", "none"].indexOf(i)
				},
				noti
			],
			["button", "", "submit", () => {
				fetch(this.info.api + "/users/@me/guilds/" + this.id + "/settings", {
					method: "PATCH",
					headers: this.headers,
					body: JSON.stringify({
						message_notifications: noti
					})
				})
				this.message_notifications = noti
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
			Guild.contextmenu.bind(img, this)
		} else {
			const div = document.createElement("div")
			div.textContent = this.properties.name.replace(/'s /g, " ").replace(/\w+/g, word => word[0]).replace(/\s/g, "")
			div.classList.add("blankserver", "servericon")
			divy.appendChild(div)
			div.addEventListener("click", () => {
				this.loadGuild()
				this.loadChannel()
			})
			Guild.contextmenu.bind(div, this)
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
				function() {
					confirmname = this.value
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
}

Guild.setupcontextmenu()
