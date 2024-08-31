"use strict"

const supportsCompression = "DecompressionStream" in window
const wsCodesRetry = new Set([4000, 4003, 4005, 4007, 4008, 4009])

let charsSecret = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
while (charsSecret.length < 256) charsSecret += charsSecret

// eslint-disable-next-line no-unused-vars
class LocalUser {
	/**
	 * @param {SpecialUser|-1} userinfo
	 */
	constructor(userinfo) {
		if (userinfo == -1) return

		this.token = userinfo.token
		this.userinfo = userinfo
		this.serverurls = this.userinfo.serverurls
		this.info = this.serverurls
		this.initialized = false
		this.headers = {
			"Content-Type": "application/json; charset=UTF-8",
			Authorization: this.userinfo.token
		}

		this.pingEndpoint()
	}

	badges = new Map()
	userMap = new Map()
	noteCache = new Map()

	connectionSucceed = 0
	errorBackoff = 0

	/**
	 * @param {readyjson} ready
	 */
	gottenReady(ready) {
		this.initialized = true
		this.ready = ready
		this.guildids = new Map()
		this.guildhtml = new Map()
		this.user = User.checkuser(ready.d.user, this)
		this.user.setstatus("online")
		this.mfa_enabled = ready.d.user.mfa_enabled
		this.userinfo.username = this.user.username
		this.userinfo.pfpsrc = this.user.getpfpsrc()
		this.usersettings = null
		this.channelfocus = null
		this.lookingguild = null

		const members = {}
		for (const thing of ready.d.merged_members) {
			members[thing[0].guild_id] = thing[0]
		}

		this.settings = this.ready.d.user_settings
		localStorage.setItem("theme", this.settings.theme)
		setTheme(this.settings.theme)

		if (!this.settings.view_nsfw_guilds) ready.d.guilds = ready.d.guilds.filter(guild => !guild.nsfw)
		for (const guildJSON of ready.d.guilds) {
			const guild = new Guild(guildJSON, this, members[guildJSON.id])
			this.guildids.set(guild.id, guild)
		}

		const dmChannels = new Direct(ready.d.private_channels, this)
		this.guildids.set(dmChannels.id, dmChannels)

		for (const guildSettings of ready.d.user_guild_settings.entries) {
			this.guildids.get(guildSettings.guild_id).notisetting(guildSettings)
		}

		for (const readState of ready.d.read_state.entries) {
			const guild = this.resolveChannelFromID(readState.id)?.guild
			if (!guild) continue

			this.guildids.get(guild.id).channelids[readState.channel_id].readStateInfo(readState)
		}

		for (const relationships of ready.d.relationships) {
			const user = new User(relationships.user, this)
			user.nickname = relationships.nickname
			user.relationshipType = relationships.type
		}
	}
	outoffocus() {
		document.getElementById("servers").innerHTML = ""
		document.getElementById("channels").innerHTML = ""
		this.lookingguild = null

		if (this.channelfocus) this.channelfocus.infinite.delete()
		this.channelfocus = null
	}
	unload() {
		if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout)
		this.initialized = false
		this.outoffocus()
		this.guildids = new Map()
		if (this.ws) this.ws.close(1000)
		SnowFlake.clear()
	}
	lastSequence = null
	swapped = false
	async initwebsocket() {
		let returny = null
		const promise = new Promise(resolve => {
			returny = resolve
		})
		this.ws = new WebSocket((this.ready && this.ready.d ? this.ready.d.resume_gateway_url : this.info.gateway) + "/?v=9&encoding=json" + (supportsCompression ? "&compress=zlib-stream" : ""))

		this.ws.addEventListener("open", () => {
			console.log("WebSocket connected")
			document.getElementById("load-additional").textContent = ""

			this.ws.send(JSON.stringify({
				op: 2,
				d: {
					token: this.token,
					capabilities: 16381,
					properties: {
						os: "Redacted",
						device: "Redacted",
						browser: "Jank Client (Tomato fork)",
						client_build_number: 0,
						release_channel: "Custom"
					},
					compress: supportsCompression
				}
			}))
		})

		let ds
		let w
		let r
		let arr
		if (supportsCompression) {
			ds = new DecompressionStream("deflate")
			w = ds.writable.getWriter()
			r = ds.readable.getReader()
			arr = new Uint8Array()
		}

		let build = ""
		const textdecode = new TextDecoder()

		const decode = async () => {
			while (true) {
				const read = await r.read()
				const data = textdecode.decode(read.value)

				build += data
				try {
					const temp = JSON.parse(build)
					build = ""
					if (temp.op == 0 && temp.t == "READY") returny()
					await this.handleEvent(temp)
				} catch {}
			}
		}
		decode()

		let order = new Promise(res => {
			res()
		})
		this.ws.addEventListener("message", async event => {
			const temp2 = order
			let res
			order = new Promise(resolve => {
				res = resolve
			})
			await temp2
			let temp

			try {
				if (event.data instanceof Blob) {
					const buff = await event.data.arrayBuffer()
					const array = new Uint8Array(buff)
					const temparr = new Uint8Array(array.length + arr.length)
					temparr.set(arr, 0)
					temparr.set(array, arr.length)
					arr = temparr
					const len = array.length
					if (!(array[len - 1] == 255 && array[len - 2] == 255 && array[len - 3] == 0 && array[len - 4] == 0)) {
						res()
						return
					}

					w.write(arr.buffer)
					arr = new Uint8Array()
					res()
					return
				} else temp = JSON.parse(event.data)

				if (temp.op == 0 && temp.t == "READY") returny()
				await this.handleEvent(temp)
			} catch (e) {
				console.error(e)
			}

			res()
		})

		this.ws.addEventListener("close", async event => {
			console.log("WebSocket closed with code " + event.code)

			this.unload()
			const loading = document.getElementById("loading")
			loading.classList.remove("doneloading")
			loading.classList.add("loading")

			this.fetchingmembers = new Map()
			this.noncemap = new Map()
			this.noncebuild = new Map()

			const loadDesc = document.getElementById("load-desc")
			if (((event.code > 1000 && event.code < 1016) || wsCodesRetry.has(event.code))) {
				if (this.connectionSucceed != 0 && Date.now() > this.connectionSucceed + 20000) this.errorBackoff = 0
				else this.errorBackoff = Math.min(this.errorBackoff + 1, 64)
				this.connectionSucceed = 0

				loadDesc.innerHTML = "Unable to connect to the Spacebar instance, retrying in <b>" + Math.round(0.2 + (this.errorBackoff * 2.8)) + "</b> seconds..."

				const loadAdditional = document.getElementById("load-additional")
				switch (this.errorBackoff) { // try to recover from bad domain
					case 4:
						const newURLsWellKnown = await getAPIURLs(this.info.wellknown)
						if (newURLsWellKnown) {
							this.info = newURLsWellKnown
							this.serverurls = newURLsWellKnown
							this.userinfo.json.serverurls = this.info
							this.userinfo.updateLocal()
							loadAdditional.textContent += "Server URLs have been updated to \"" + this.info.wellknown + "\""
						} else loadAdditional.textContent += "Unable to load connection info from \"" + this.info.wellknown + "\" (server offline or no internet?)"
						break
					case 10:
						const urlOrigin = new URL(this.info.wellknown).origin
						const newURLsOrigin = await getAPIURLs(urlOrigin)
						if (newURLsOrigin) {
							this.info = newURLsOrigin
							this.serverurls = newURLsOrigin
							this.userinfo.json.serverurls = this.info
							this.userinfo.updateLocal()
							loadAdditional.textContent += "Server URLs have been updated to \"" + urlOrigin + "\""
						} else loadAdditional.textContent += "Unable to load connection info from \"" + urlOrigin + "\" (server offline or no internet?)"
						break
				}

				setTimeout(() => {
					if (this.swapped) return
					loadDesc.textContent = "Retrying..."

					this.initwebsocket().then(() => {
						this.loaduser()
						this.init()
						loading.classList.add("doneloading")
						loading.classList.remove("loading")

						loadDesc.textContent = "This shouldn't take long"
					})
				}, 200 + (this.errorBackoff * 2800))
			} else if (!this.swapped) loadDesc.textContent = "Unable to connect to the Spacebar instance. Please try logging out and back in."
		})

		await promise
	}
	async handleEvent(json) {
		console.log(json)

		if (json.s) this.lastSequence = json.s

		if (json.op == 0) {
			switch (json.t) {
				case "READY":
					this.gottenReady(json)
					break
				case "MESSAGE_CREATE":
					if (this.initialized) this.messageCreate(json)
					break
				case "MESSAGE_DELETE":
					SnowFlake.getSnowFlakeFromID(json.d.id, Message).getObject().deleteEvent()
					break
				case "MESSAGE_UPDATE":
					const messageUpdated = SnowFlake.getSnowFlakeFromID(json.d.id, Message).getObject()
					messageUpdated.giveData(json.d)
					break
				case "MESSAGE_REACTION_ADD":
					if (SnowFlake.hasSnowFlakeFromID(json.d.message_id, Message)) {
						const messageReactionAdd = SnowFlake.getSnowFlakeFromID(json.d.message_id, Message).getObject()
						messageReactionAdd.reactionAdd(json.d.emoji, json.d.user_id)
					}
					break
				case "MESSAGE_REACTION_REMOVE":
					if (SnowFlake.hasSnowFlakeFromID(json.d.message_id, Message)) {
						const messageReactionRemove = SnowFlake.getSnowFlakeFromID(json.d.message_id, Message).getObject()
						messageReactionRemove.reactionRemove(json.d.emoji, json.d.user_id)
					}
					break
				case "MESSAGE_REACTION_REMOVE_ALL":
					if (SnowFlake.hasSnowFlakeFromID(json.d.message_id, Message)) {
						const messageReactionRemoveAll = SnowFlake.getSnowFlakeFromID(json.d.message_id, Message).getObject()
						messageReactionRemoveAll.reactionRemoveAll()
					}
					break
				case "MESSAGE_REACTION_REMOVE_EMOJI":
					if (SnowFlake.hasSnowFlakeFromID(json.d.message_id, Message)) {
						const messageReactionRemoveEmoji = SnowFlake.getSnowFlakeFromID(json.d.message_id, Message).getObject()
						messageReactionRemoveEmoji.reactionRemoveEmoji(json.d.emoji)
					}
					break
				case "MESSAGE_ACK":
					const messageAcked = SnowFlake.getSnowFlakeFromID(json.d.message_id, Message).getObject()

					const messageAckedChannel = SnowFlake.getSnowFlakeFromID(json.d.channel_id, Channel).getObject()
					messageAckedChannel.lastreadmessageid = messageAcked.snowflake
					messageAckedChannel.guild.unreads()

					break
				case "TYPING_START":
					if (this.initialized) this.typingStart(json.d)
					break
				case "USER_UPDATE":
					if (this.initialized) {
						const user = this.userMap.get(json.d.id)
						if (user) user.userupdate(json.d)
					}
					break
				case "USER_NOTE_UPDATE":
					this.noteCache.set(json.d.id, json.d.note)
					setTimeout(() => this.noteCache.delete(json.d.id), 1000 * 60 * 2)
					break
				case "CHANNEL_UPDATE":
					if (this.initialized) this.updateChannel(json.d)
					break
				case "CHANNEL_CREATE":
					if (this.initialized) this.createChannel(json.d)
					break
				case "CHANNEL_DELETE":
					if (this.initialized) this.delChannel(json.d)
					break
				case "GUILD_DELETE": {
					const guildy = this.guildids.get(json.d.id)
					this.guildids.delete(json.d.id)
					guildy.html.remove()

					if (this.guildids.size <= 1) document.getElementById("bottomseparator").setAttribute("hidden", "")
					break
				}
				case "GUILD_CREATE": {
					const guildy = new Guild(json.d, this, this.user)

					document.getElementById("bottomseparator").removeAttribute("hidden")
					this.guildids.set(guildy.id, guildy)
					document.getElementById("servers").insertBefore(guildy.generateGuildIcon(), document.getElementById("bottomseparator"))
					break
				}
				case "GUILD_MEMBERS_CHUNK":
					this.gotChunk(json.d)
					break
			}
		} else if (json.op == 1)
			this.ws.send(JSON.stringify({
				op: 1,
				d: this.lastSequence
			}))
		else if (json.op == 10) {
			this.heartbeatInterval = json.d.heartbeat_interval

			this.heartbeatTimeout = setTimeout(() => {
				this.ws.send(JSON.stringify({
					op: 1,
					d: this.lastSequence
				}))
			}, Math.round(json.d.heartbeat_interval * Math.random()))
		} else if (json.op == 11) {
			this.heartbeatTimeout = setTimeout(() => {
				if (!this.ws) return

				if (this.connectionSucceed == 0) this.connectionSucceed = Date.now()
				this.ws.send(JSON.stringify({
					op: 1,
					d: this.lastSequence
				}))
			}, this.heartbeatInterval)
		}
	}
	resolveChannelFromID(id) {
		return this.guildids.values().find(guild => guild.channelids[id])?.channelids[id]
	}
	updateChannel(json) {
		SnowFlake.getSnowFlakeFromID(json.guild_id, Guild).getObject().updateChannel(json)

		if (json.guild_id == this.lookingguild.id) this.loadGuild(json.guild_id)
	}
	createChannel(json) {
		json.guild_id ??= "@me"
		SnowFlake.getSnowFlakeFromID(json.guild_id, Guild).getObject().createChannelpac(json)

		if (json.guild_id == this.lookingguild.id) this.loadGuild(json.guild_id)
	}
	delChannel(json) {
		json.guild_id ??= "@me"
		this.guildids.get(json.guild_id).delChannel(json)

		if (json.guild_id == this.lookingguild.id) this.loadGuild(json.guild_id)
	}
	init() {
		this.buildservers()
		const loc = location.href.split("/")
		if (loc[3] == "channels") {
			const guildLoaded = this.loadGuild(loc[4])
			guildLoaded.loadChannel(loc[5])
			this.channelfocus = guildLoaded.channelids[loc[5]]
		}
	}
	loaduser() {
		document.getElementById("username").textContent = this.user.username
		document.getElementById("userpfp").src = this.user.getpfpsrc()
		document.getElementById("discriminator").textContent = "#" + this.user.discriminator
	}
	isAdmin() {
		return this.lookingguild.isAdmin()
	}
	loadGuild(id) {
		const guild = this.guildids.get(id) || this.guildids.get("@me")

		if (this.lookingguild) this.lookingguild.html.classList.remove("serveropen")
		this.lookingguild = guild

		if (guild.html) guild.html.classList.add("serveropen")
		else setTimeout(() => {
			if (guild.html) guild.html.classList.add("serveropen")
		}, 200)

		document.getElementById("servername").textContent = guild.properties.name
		document.getElementById("channels").innerHTML = ""
		document.getElementById("channels").appendChild(guild.getHTML())
		return guild
	}
	async buildservers() {
		const serverlist = document.getElementById("servers")
		serverlist.innerHTML = ""

		const div = document.createElement("div")
		div.classList.add("home", "servericon")
		const home = document.createElement("span")
		home.classList.add("svgtheme", "svgicon", "svg-home")
		home.all = this.guildids.get("@me")
		home.addEventListener("click", () => {
			home.all.loadGuild()
			home.all.loadChannel()
		})
		div.appendChild(home)

		const outdiv = document.createElement("div")
		this.guildids.get("@me").html = outdiv
		const unread = document.createElement("div")
		unread.classList.add("unread")
		outdiv.append(unread)
		outdiv.append(div)
		serverlist.append(outdiv)

		const sentdms = document.createElement("div")
		sentdms.classList.add("sentdms")
		serverlist.append(sentdms)
		sentdms.id = "sentdms"

		const hr = document.createElement("hr")
		hr.classList.add("lightbr")
		serverlist.appendChild(hr)

		for (const guild of this.guildids.values()) {
			if (guild instanceof Direct) {
				guild.unreaddms()
				continue
			}

			const divy = guild.generateGuildIcon()
			serverlist.append(divy)
		}
		this.unreads()

		const hr2 = document.createElement("hr")
		hr2.id = "bottomseparator"
		hr2.classList.add("lightbr")
		if (this.guildids.size <= 1) hr2.setAttribute("hidden", "")
		serverlist.appendChild(hr2)

		const joinCreateButton = document.createElement("p")
		joinCreateButton.classList.add("home", "servericon")
		joinCreateButton.appendChild(await LocalUser.loadSVG("add"))
		joinCreateButton.addEventListener("click", () => {
			this.createGuild()
		})
		serverlist.appendChild(joinCreateButton)

		const guildDiscoveryContainer = document.createElement("div")
		guildDiscoveryContainer.classList.add("home", "servericon")
		const guildDiscoveryIcon = document.createElement("span")
		guildDiscoveryIcon.classList.add("svgtheme", "svgicon", "svg-explore")
		guildDiscoveryContainer.appendChild(guildDiscoveryIcon)
		guildDiscoveryContainer.addEventListener("click", () => {
			this.guildDiscovery()
		})
		serverlist.appendChild(guildDiscoveryContainer)
	}
	createGuild() {
		let inviteurl = ""
		const inviteError = document.createElement("span")

		const fields = {
			name: "",
			icon: null
		}
		const full = new Dialog(["tabs", [
			["Join using invite",
				["vdiv",
					["textbox",
						"Invite Link/Code",
						"",
						event => {
							inviteurl = event.target.value
						}
					],
					["html", inviteError],
					["button",
						"",
						"Submit",
						async () => {
							let parsed = ""
							if (inviteurl.includes("/")) parsed = inviteurl.split("/")[inviteurl.split("/").length - 1]
							else parsed = inviteurl

							const res = await fetch(this.info.api + "/invites/" + parsed, {
								method: "POST",
								headers: this.headers
							})
							if (res.ok) full.hide()
							else {
								const json = await res.json()
								inviteError.textContent = json.message || "An error occurred (response code " + res.status + ")"
								console.error("Unable to join guild using " + inviteurl, json)
							}
						}
					]
				]
			],
			["Create server",
				["vdiv",
					["title", "Create a server"],
					["fileupload", "Icon:", event => {
						const reader = new FileReader()
						reader.readAsDataURL(event.target.files[0])
						reader.onload = () => {
							fields.icon = reader.result
						}
					}],
					["textbox", "Name:", "", event => {
						fields.name = event.target.value
					}],
					["button", "", "submit", () => {
						this.makeGuild(fields).then(json => {
							if (json.message) alert(json.errors.name._errors[0].message)
							else full.hide()
						})
					}]
				]
			]
		]])
		full.show()
	}
	async makeGuild(fields) {
		const res = await fetch(this.info.api + "/guilds", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify(fields)
		})
		return await res.json()
	}
	async guildDiscovery() {
		const container = document.createElement("div")
		container.textContent = "Loading..."

		const dialog = new Dialog(["html", container])
		dialog.show()

		const categoryRes = await fetch(this.info.api + "/discovery/categories", {
			headers: this.headers
		})
		if (!categoryRes.ok) {
			container.textContent = "An error occurred (response code " + categoryRes.status + ")"
			return
		}
		const categories = await categoryRes.json()

		const res = await fetch(this.info.api + "/discoverable-guilds?limit=50", {
			headers: this.headers
		})
		if (!res.ok) {
			container.textContent = "An error occurred (response code " + res.status + ")"
			return
		}

		const json = await res.json()
		container.innerHTML = ""

		const title = document.createElement("h2")
		title.textContent = "Server discovery (" + json.total + " entries)"
		container.appendChild(title)

		const guilds = document.createElement("div")
		guilds.id = "discovery-guild-content"

		json.guilds.forEach(guild => {
			const content = document.createElement("div")
			content.classList.add("discovery-guild")

			if (guild.discovery_splash) {
				const banner = document.createElement("img")
				banner.classList.add("banner")
				banner.crossOrigin = "anonymous"
				banner.src = this.info.cdn + "/discovery-splashes/" + guild.id + "/" + guild.discovery_splash + ".png?size=256"
				banner.alt = ""
				banner.loading = "lazy"
				content.appendChild(banner)
			}

			const nameContainer = document.createElement("div")
			nameContainer.classList.add("flex")

			const img = document.createElement("img")
			img.classList.add("pfp", "servericon")
			img.crossOrigin = "anonymous"
			img.src = this.info.cdn + "/" + (guild.icon ? ("icons/" + guild.id + "/" + guild.icon + ".png?size=48") : "embed/avatars/" + ((guild.id >>> 22) % 6) + ".png")
			img.alt = ""
			img.loading = "lazy"
			nameContainer.appendChild(img)

			const name = document.createElement("h3")
			name.textContent = guild.name
			nameContainer.appendChild(name)
			content.appendChild(nameContainer)

			const desc = document.createElement("p")
			desc.textContent = guild.description
			content.appendChild(desc)

			if (categories.length > 0 && guild.primary_category_id && categories.some(category => category.id == guild.primary_category_id)) {
				const category = document.createElement("p")
				category.textContent = "Category: " + categories.find(cat => cat.id == guild.primary_category_id).name
				content.appendChild(category)
			}

			content.addEventListener("click", async () => {
				const joinRes = await fetch(this.info.api + "/guilds/" + guild.id + "/members/@me", {
					method: "PUT",
					headers: this.headers
				})
				if (joinRes.ok) dialog.hide()
				else {
					const joinJSON = await joinRes.json()
					alert(joinJSON.message || "An error occurred (response code " + joinRes.status + ")")
				}
			})
			guilds.appendChild(content)
		})
		container.appendChild(guilds)
	}
	messageCreate(messagep) {
		messagep.d.guild_id ??= "@me"
		this.guildids.get(messagep.d.guild_id).channelids[messagep.d.channel_id].messageCreate(messagep)
		this.unreads()
	}
	unreads() {
		for (const guild of this.guildids.values()) {
			if (guild.id == "@me") continue

			guild.unreads(this.guildhtml.get(guild.id))
		}
	}
	typing = new Map()
	async typingStart(typing = {}) {
		if (this.channelfocus.id == typing.channel_id) {
			const guild = this.guildids.get(typing.guild_id)
			const member = await Member.new(typing.member, guild)
			if (!member || member.id == this.user.id) return

			this.typing.set(member, Date.now())

			this.rendertyping()
			setTimeout(this.rendertyping.bind(this), 5000)
		}
	}
	rendertyping() {
		const typingUsers = []
		let showing = false
		const curtime = Date.now() - 5000
		for (const member of this.typing.keys()) {
			if (this.typing.get(member) > curtime) {
				typingUsers.push(member.nick || member.user.global_name || member.user.username)
				showing = true
			} else this.typing.delete(member)
		}

		if (showing) {
			document.getElementById("typing").classList.remove("hidden")
			document.getElementById("typing-users").textContent = typingUsers.length > 1
				? typingUsers.slice(1).join(", ") + " and " + typingUsers[0]
				: typingUsers[0]
			document.getElementById("typing-plural").textContent = typingUsers.length > 1 ? "are" : "is"
		} else document.getElementById("typing").classList.add("hidden")
	}
	updateProfileImage(property = "", file = null) {
		if (file) {
			const reader = new FileReader()
			reader.readAsDataURL(file)
			reader.onload = () => {
				fetch(this.info.api + "/users/@me", {
					method: "PATCH",
					headers: this.headers,
					body: JSON.stringify({
						[property]: reader.result
					})
				})
			}
		} else {
			fetch(this.info.api + "/users/@me", {
				method: "PATCH",
				headers: this.headers,
				body: JSON.stringify({
					[property]: null
				})
			})
		}
	}
	updateProfile(json) {
		fetch(this.info.api + "/users/@me/profile", {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(json)
		})
	}
	updateSettings(settings = {}) {
		this.settings = {
			...this.settings,
			...settings
		}
		fetch(this.info.api + "/users/@me/settings", {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(settings)
		})
	}
	async updateAccount(json) {
		const res = await fetch(this.info.api + "/users/@me", {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(json)
		})
		return await res.json()
	}
	async showusersettings() {
		const settings = new Settings("Settings")
		this.usersettings = settings

		const userOptions = settings.addButton("User profile", { ltr: true })
		const hypotheticalProfile = document.createElement("div")
		let avatarFile = null
		let newpronouns
		let newbio
		let color = this.user.accent_color ? "#" + this.user.accent_color.toString(16) : "transparent"
		const hypouser = this.user.clone()

		const regen = async () => {
			hypotheticalProfile.textContent = ""
			const hypoprofile = await hypouser.buildprofile(-1, -1)
			hypotheticalProfile.appendChild(hypoprofile)
		}
		regen()

		const profileLeft = userOptions.addOptions("")
		const profileRight = userOptions.addOptions("")
		profileRight.addHTMLArea(hypotheticalProfile)

		const avatarInput = profileLeft.addFileInput("Upload avatar:", () => {
			if (avatarFile) this.updateProfileImage("avatar", avatarFile)
		}, { clear: true })
		avatarInput.watchForChange(value => {
			if (value.length > 0) {
				avatarFile = value[0]
				const blob = URL.createObjectURL(avatarFile)
				hypouser.avatar = blob
			} else {
				avatarFile = null
				hypouser.avatar = null
			}
			hypouser.hypotheticalpfp = true
			regen()
		})

		let bannerFile
		const bannerInput = profileLeft.addFileInput("Upload banner:", () => {
			if (bannerFile !== void 0) this.updateProfileImage("banner", bannerFile)
		}, { clear: true })
		bannerInput.watchForChange(value => {
			if (value.length > 0) {
				bannerFile = value[0]
				const blob = URL.createObjectURL(bannerFile)
				hypouser.banner = blob
			} else {
				bannerFile = null
				hypouser.banner = null
			}
			hypouser.hypotheticalbanner = true
			regen()
		})

		let changed = false
		const pronounbox = profileLeft.addTextInput("Pronouns", () => {
			if (newpronouns || newbio || changed) this.updateProfile({
				pronouns: newpronouns,
				bio: newbio,
				accent_color: Number.parseInt("0x" + color.slice(1), 16)
			})
		}, { initText: this.user.pronouns })
		pronounbox.watchForChange(value => {
			hypouser.pronouns = value
			newpronouns = value
			regen()
		})

		const bioBox = profileLeft.addMDInput("Bio", () => {}, { initText: this.user.bio.rawString })
		bioBox.watchForChange(value => {
			newbio = value
			hypouser.bio = new MarkDown(value, this)
			regen()
		})

		const colorPicker = profileLeft.addColorInput("Profile color", () => {}, { initColor: color })
		colorPicker.watchForChange(value => {
			color = value
			hypouser.accent_color = Number.parseInt("0x" + value.slice(1), 16)
			changed = true
			regen()
		})

		const baseData = settings.addButton("Account user data")
		const baseDataRequest = {
			fetchURL: this.info.api + "/users/@me",
			headers: this.headers,
			method: "PATCH"
		}
		baseData.addButtonInput("", "Change discriminator", () => {
			const form = baseData.addSubForm("Change discriminator", () => {
				baseData.returnFromSub()
			}, baseDataRequest)
			form.addTextInput("New discriminator:", "discriminator")
		})
		baseData.addButtonInput("", "Change email", () => {
			const form = baseData.addSubForm("Change email address", () => {
				baseData.returnFromSub()
			}, baseDataRequest)
			form.addTextInput("Password:", "password", { fieldType: "password" })
			if (this.mfa_enabled) form.addTextInput("MFA Code:", "code")
			form.addTextInput("New email:", "email")
		})
		baseData.addButtonInput("", "Change username", () => {
			const form = baseData.addSubForm("Change username", () => {
				baseData.returnFromSub()
			}, baseDataRequest)
			form.addTextInput("Password:", "password", { fieldType: "password" })
			if (this.mfa_enabled) form.addTextInput("MFA Code:", "code")
			form.addTextInput("New username:", "username")
		})

		const security = settings.addButton("Account security")
		const securityUpdate = () => {
			security.removeAll()
			if (this.mfa_enabled) {
				security.addButtonInput("", "Disable MFA", () => {
					const form = security.addSubForm("Disable MFA", json => {
						if (json.message) {
							switch (json.code) {
								case 60008:
									form.error("code", "Invalid code")
									break
							}
						} else {
							this.mfa_enabled = false
							securityUpdate()
							security.returnFromSub()
						}
					}, {
						fetchURL: this.info.api + "/users/@me/mfa/totp/disable",
						headers: this.headers
					})
					form.addTextInput("MFA Code:", "code", { required: true })
				})
			} else {
				security.addButtonInput("", "Enable MFA", async () => {
					const randomBytes = new Uint8Array(32)
					crypto.getRandomValues(randomBytes)
					let secret = "" // Cannot use .map()
					for (const byte of randomBytes) {
						secret += charsSecret.charAt(byte)
					}

					const form = security.addSubForm("MFA Setup", _ => {
						if (_.message) {
							switch (_.code) {
								case 60008:
									form.error("code", "Invalid code")
									break
								case 400:
									form.error("password", "Incorrect password")
									break
							}
						} else {
							this.mfa_enabled = true
							securityUpdate()
							security.returnFromSub()
						}
					}, {
						fetchURL: this.info.api + "/users/@me/mfa/totp/enable",
						headers: this.headers
					})
					form.addTitle("Copy this secret into your totp(time-based one time password) app")
					form.addText("Your secret is: " + secret + " and it's 6 digits, with a 30 second token period")
					form.addTextInput("Account Password:", "password", { required: true, fieldType: "password" })
					form.addTextInput("MFA Code:", "code", { required: true })
					form.setValue("secret", secret)
				})
			}

			security.addButtonInput("", "Change password", () => {
				const form = security.addSubForm("Change password", () => {
					security.returnFromSub()
				}, {
					fetchURL: this.info.api + "/users/@me",
					headers: this.headers,
					method: "PATCH"
				})
				form.addTextInput("Old password:", "password", { fieldType: "password" })
				if (this.mfa_enabled) form.addTextInput("MFA Code:", "code")

				let in1 = ""
				form.addTextInput("New password:", "").watchForChange(value => {
					in1 = value
				})

				let in2 = ""
				const passwordRepeat = form.addTextInput("New password again:", "")
				passwordRepeat.watchForChange(value => {
					in2 = value
				})
				form.setValue("new_password", () => {
					if (in1 == in2) return in1
					throw new FormError(passwordRepeat, "Passwords don't match")
				})
			})
		}
		securityUpdate()

		const userSettings = settings.addButton("Account settings")
		const newSettings = {}

		userSettings.addButtonInput("", "Change status", () => {
			const status = ["online", "invisible", "idle", "dnd"]
			const form = userSettings.addSubForm("Change status", json => {
				if (json.message) form.error("status", json.message)
				else {
					userSettings.returnFromSub()

					this.status = status[form.names.get("status")]
				}
			}, {
				fetchURL: this.info.api + "/users/@me/settings",
				headers: this.headers,
				method: "PATCH"
			})

			form.addSelect("Status:", "status", status, {
				defaultIndex: status.includes(this.status) ? status.indexOf(this.status) : 0
			})

			//form.addTextInput("Custom status text:", "custom_status.text")
			//form.addTextInput("Custom status emoji ID:", "custom_status.emoji_id")
		})

		userSettings.addTextInput("Locale:", value => {
			if (value != this.settings.locale) {
				if (value.length != 5) return alert("Please use a valid locale code (e.g. en-US)")
				newSettings.locale = value
			}
		}, { initText: this.settings.locale })

		let reRender = false
		userSettings.addCheckboxInput("Animate emojis", value => {
			if (value != this.settings.animate_emoji) {
				newSettings.animate_emoji = value
				reRender = true
			}
		}, { initState: this.settings.animate_emoji })
		userSettings.addCheckboxInput("Animate stickers", value => {
			if (value != this.settings.animate_stickers) {
				newSettings.animate_stickers = value
				reRender = true
			}
		}, { initState: this.settings.animate_stickers })
		userSettings.addCheckboxInput("Convert emojis (:D -> 😄)", value => {
			if (value != this.settings.convert_emoticons) newSettings.convert_emoticons = value
		}, { initState: this.settings.convert_emoticons })
		userSettings.addCheckboxInput("Developer mode", value => {
			if (value != this.settings.developer_mode) newSettings.developer_mode = value
		}, { initState: this.settings.developer_mode })
		userSettings.addCheckboxInput("Enable & play TTS command", value => {
			if (value != this.settings.enable_tts_command) newSettings.enable_tts_command = value
		}, { initState: this.settings.enable_tts_command })
		userSettings.addCheckboxInput("Compact message display", value => {
			if (value != this.settings.message_display_compact) {
				newSettings.message_display_compact = value
				reRender = true
			}
		}, { initState: this.settings.message_display_compact })
		userSettings.addCheckboxInput("Render embeds", value => {
			if (value != this.settings.render_embeds) {
				newSettings.render_embeds = value
				reRender = true
			}
		}, { initState: this.settings.render_embeds })
		userSettings.addCheckboxInput("Render reactions", value => {
			if (value != this.settings.render_reactions) {
				newSettings.render_reactions = value
				reRender = true
			}
		}, { initState: this.settings.render_reactions })
		userSettings.addCheckboxInput("Display NSFW guilds", value => {
			if (value != this.settings.view_nsfw_guilds) newSettings.view_nsfw_guilds = value

			this.updateSettings(newSettings)

			reRender = false
			if (reRender && this.channelfocus) {
				for (const thing of this.channelfocus.messages) {
					thing[1].generateMessage()
				}
			}
		}, { initState: this.settings.view_nsfw_guilds })

		const tas = settings.addButton("Themes & sounds")

		const themes = ["dark", "light"]
		tas.addSelect("Theme:", value => {
			const newTheme = themes[value]
			localStorage.setItem("theme", newTheme)
			setTheme(newTheme)
			this.updateSettings({theme: newTheme})
		}, themes.map(theme => theme.charAt(0).toUpperCase() + theme.slice(1)), {
			defaultIndex: themes.indexOf(localStorage.getItem("theme"))
		})

		const sounds = Audio.sounds
		tas.addSelect("Notification sound:", value => {
			Audio.setNotificationSound(sounds[value])
		}, sounds, {
			defaultIndex: sounds.indexOf(Audio.getNotificationSound())
		}).watchForChange(value => {
			Audio.noises(sounds[value])
		})

		tas.addColorInput("Accent color:", value => {
			const userinfos = getBulkInfo()
			userinfos.accent_color = value
			localStorage.setItem("userinfos", JSON.stringify(userinfos))
			document.documentElement.style.setProperty("--accent-color", userinfos.accent_color)
		}, { initColor: getBulkInfo().accent_color })

		const connections = settings.addButton("Connections")
		const connectionContainer = document.createElement("div")
		connectionContainer.id = "connection-container"

		fetch(this.info.api + "/connections", {
			headers: this.headers
		}).then(r => r.json()).then(json => {
			Object.keys(json).sort(key => json[key].enabled ? -1 : 1).forEach(key => {
				const connection = json[key]

				const container = document.createElement("div")
				container.textContent = key.charAt(0).toUpperCase() + key.slice(1)

				if (connection.enabled) {
					container.addEventListener("click", async () => {
						const connectionRes = await fetch(this.info.api + "/connections/" + key + "/authorize", {
							headers: this.headers
						})
						const connectionJSON = await connectionRes.json()
						window.open(connectionJSON.url, "_blank", "noopener noreferrer")
					})
				} else {
					container.classList.add("disabled")
					container.title = "This connection has been disabled server-side."
				}

				connectionContainer.appendChild(container)
			})
		})
		connections.addHTMLArea(connectionContainer)

		const devPortal = settings.addButton("Developer Portal")

		const teamsRes = await fetch(this.info.api + "/teams", {
			headers: this.headers
		})
		const teams = await teamsRes.json()

		const newApplication = {}
		devPortal.addTextInput("Name", value => {
			newApplication.name = value
		})
		devPortal.addSelect("Team", value => {
			newApplication.team_id = value == 0 ? void 0 : teams[value - 1].id
		}, ["Personal", ...teams.map(team => team.name)], {
			defaultIndex: 0
		})
		devPortal.addButtonInput("", "Create application", async () => {
			if (!newApplication.name || newApplication.name.trim().length == 0) return alert("Please enter a name for the application.")

			const res = await fetch(this.info.api + "/applications", {
				method: "POST",
				headers: this.headers,
				body: JSON.stringify(newApplication)
			})
			const json = await res.json()
			this.manageApplication(json.id)
		})

		const appListContainer = document.createElement("div")
		appListContainer.id = "app-list-container"
		fetch(this.info.api + "/applications", {
			headers: this.headers
		}).then(r => r.json()).then(json => {
			json.forEach(application => {
				const container = document.createElement("div")

				const appIcon = application.cover_image || application.icon
				if (appIcon) {
					const cover = document.createElement("img")
					cover.crossOrigin = "anonymous"
					cover.src = this.info.cdn + "/app-icons/" + application.id + "/" + appIcon + "." + (appIcon.startsWith("a_") ? "gif" : "png") + "?size=256"
					cover.alt = ""
					cover.loading = "lazy"
					container.appendChild(cover)
				}

				const name = document.createElement("h2")
				name.textContent = application.name + (application.bot ? " (has bot)" : "")
				container.appendChild(name)

				if (application.team) {
					const team = document.createElement("p")
					team.textContent = "Team: " + application.team.name
					container.appendChild(team)
				}

				container.addEventListener("click", async () => {
					this.manageApplication(application.id)
				})
				appListContainer.appendChild(container)
			})
		})
		devPortal.addHTMLArea(appListContainer)

		settings.show()
	}
	async manageApplication(appId) {
		const res = await fetch(this.info.api + "/applications/" + appId, {
			headers: this.headers
		})
		const json = await res.json()

		const fields = {}
		const appDialog = new Dialog(
			["vdiv",
				["title",
					"Editing " + json.name
				],
				["hdiv",
					["textbox", "Application name:", json.name, event => {
						fields.name = event.target.value
					}],
					["mdbox", "Description:", json.description, event => {
						fields.description = event.target.value
					}],
					["vdiv",
						json.icon
							? ["img", this.info.cdn + "/app-icons/" + appId + "/" + json.icon + "." + (json.icon.startsWith("a_") ? "gif" : "png") + "?size=128", [128, 128]]
							: ["text", "No icon"],
						["fileupload", "Application icon:", event => {
							const reader = new FileReader()
							reader.readAsDataURL(event.target.files[0])
							reader.onload = () => {
								fields.icon = reader.result
							}
						}]
					]
				],
				["hdiv",
					["textbox", "Privacy policy URL:", json.privacy_policy_url || "", event => {
						fields.privacy_policy_url = event.target.value
					}],
					["textbox", "Terms of Service URL:", json.terms_of_service_url || "", event => {
						fields.terms_of_service_url = event.target.value
					}],
					["textbox", "Tags (comma-separated):", json.tags?.join(", ") || "", event => {
						fields.tags = event.target.value.split(",").map(tag => tag.trim())
					}]
				],
				["hdiv",
					["textbox", "Interactions endpoint URL:", json.interactions_endpoint_url || "", event => {
						fields.interactions_endpoint_url = event.target.value
					}],
					["textbox", "Role connection verification URL:", json.role_connections_verification_url || "", event => {
						fields.role_connections_verification_url = event.target.value
					}]
				],
				["hdiv",
					["checkbox", "Make bot publicly inviteable?", json.bot_public, event => {
						fields.bot_public = event.target.checked
					}],
					["checkbox", "Require code grant to invite the bot?", json.bot_require_code_grant, event => {
						fields.bot_require_code_grant = event.target.checked
					}]
				],
				["hdiv",
					["button",
						"",
						"Save changes",
						async () => {
							const updateRes = await fetch(this.info.api + "/applications/" + appId, {
								method: "PATCH",
								headers: this.headers,
								body: JSON.stringify(fields)
							})
							if (updateRes.ok) appDialog.hide()
							else {
								const updateJSON = await updateRes.json()
								alert("An error occurred: " + updateJSON.message)
							}
						}
					],
					["button",
						"",
						(json.bot ? "Manage" : "Add") + " bot",
						async () => {
							if (!json.bot) {
								if (!confirm("Are you sure you want to add a bot to this application? There's no going back.")) return

								const updateRes = await fetch(this.info.api + "/applications/" + appId + "/bot", {
									method: "POST",
									headers: this.headers
								})
								const updateJSON = await updateRes.json()
								alert("Bot token:\n" + updateJSON.token)
							}

							appDialog.hide()
							this.manageBot(appId)
						}
					]
				]
			]
		)
		appDialog.show()
	}
	async manageBot(appId) {
		const res = await fetch(this.info.api + "/applications/" + appId, {
			headers: this.headers
		})
		const json = await res.json()
		if (!json.bot) return alert("For some reason, this application doesn't have a bot (yet).")

		const fields = {
			username: json.bot.username,
			avatar: json.bot.avatar ? (this.info.cdn + "/app-icons/" + appId + "/" + json.bot.avatar + ".png?size=256") : ""
		}
		const botDialog = new Dialog(
			["vdiv",
				["title",
					"Editing bot: " + json.bot.username
				],
				["hdiv",
					["textbox", "Bot username:", json.bot.username, event => {
						fields.username = event.target.value
					}],
					["vdiv",
						fields.avatar ? ["img", fields.avatar, [128, 128]] : ["text", "No avatar"],
						["fileupload", "Bot avatar:", event => {
							const reader = new FileReader()
							reader.readAsDataURL(event.target.files[0])
							reader.onload = () => {
								fields.avatar = reader.result
							}
						}]
					]
				],
				["hdiv",
					["button",
						"",
						"Save changes",
						async () => {
							const updateRes = await fetch(this.info.api + "/applications/" + appId + "/bot", {
								method: "PATCH",
								headers: this.headers,
								body: JSON.stringify(fields)
							})
							if (updateRes.ok) botDialog.hide()
							else {
								const updateJSON = await updateRes.json()
								alert("An error occurred: " + updateJSON.message)
							}
						}
					],
					["button",
						"",
						"Reset token",
						async () => {
							if (!confirm("Are you sure you want to reset the token? Your bot will stop working until you update it.")) return

							const updateRes = await fetch(this.info.api + "/applications/" + appId + "/bot/reset", {
								method: "POST",
								headers: this.headers
							})
							const updateJSON = await updateRes.json()
							alert("New token:\n" + updateJSON.token)
							botDialog.hide()
						}
					]
				]
			]
		)
		botDialog.show()
	}
	static async loadSVG(name = "") {
		const res = await fetch("/icons/bootstrap/" + name + ".svg", {
			headers: {
				Accept: "image/svg+xml"
			},
			cache: "force-cache"
		})
		const xml = await res.text()
		const parser = new DOMParser()
		return parser.parseFromString(xml, "image/svg+xml").documentElement
	}

	waitingmembers = new Map()
	async resolvemember(id, guildid) {
		if (guildid == "@me") return

		if (!this.waitingmembers.has(guildid)) this.waitingmembers.set(guildid, new Map())

		let res
		const promise = new Promise(r => {
			res = r
		})
		this.waitingmembers.get(guildid).set(id, res)
		this.getmembers()
		return await promise
	}
	fetchingmembers = new Map()
	noncemap = new Map()
	noncebuild = new Map()
	presences = new Map()
	async gotChunk(chunk) {
		for (const thing of chunk.presences) {
			this.presences.set(thing.user.id, thing)
		}

		chunk.members ??= []
		const arr = this.noncebuild.get(chunk.nonce)
		arr[0] = arr[0].concat(chunk.members)
		if (chunk.not_found) arr[1] = chunk.not_found

		arr[2].push(chunk.chunk_index)
		if (arr[2].length == chunk.chunk_count) {
			this.noncebuild.delete(chunk.nonce)

			const func = this.noncemap.get(chunk.nonce)
			func([arr[0], arr[1]])
			this.noncemap.delete(chunk.nonce)
		}
	}
	async getmembers() {
		let res
		const promise = new Promise(r => {
			res = r
		})
		setTimeout(res, 10)
		await promise // allow for more to be sent at once

		if (this.ws) {
			this.waitingmembers.forEach(async (value, guildId) => {
				const keys = value.keys()
				if (this.fetchingmembers.has(guildId)) return

				const build = []
				for (const key of keys) {
					build.push(key)
					if (build.length == 100) break
				}

				if (build.length == 0) {
					this.waitingmembers.delete(guildId)
					return
				}

				let res2
				const promise2 = new Promise(r => {
					res2 = r
				})

				const nonce = "" + Math.floor(Math.random() * 100000000000)
				this.noncemap.set(nonce, res2)
				this.noncebuild.set(nonce, [[], [], []])
				this.ws.send(JSON.stringify({
					op: 8,
					d: {
						user_ids: build,
						guild_id: guildId,
						limit: 100,
						nonce,
						presences: true
					}
				}))
				this.fetchingmembers.set(guildId, true)

				const prom = await promise2
				for (const thing of prom[0]) {
					if (value.has(thing.id)) {
						value.get(thing.id)(thing)
						value.delete(thing.id)
					}
				}
				for (const thing of prom[1]) {
					if (value.has(thing)) {
						value.get(thing)()
						value.delete(thing)
					}
				}

				this.fetchingmembers.delete(guildId)
				this.getmembers()
			})
		}
	}
	async pingEndpoint() {
		const userInfo = getBulkInfo()
		if (!userInfo.instances) userInfo.instances = {}
		const wellknown = this.info.wellknown
		if (!userInfo.instances[wellknown]) {
			const pingRes = await fetch(this.info.api + "/ping")
			const pingJSON = await pingRes.json()
			userInfo.instances[wellknown] = pingJSON
			localStorage.setItem("userinfos", JSON.stringify(userInfo))
		}
		this.instancePing = userInfo.instances[wellknown].instance

		this.pageTitle("Loading...")
	}
	pageTitle(channelName = "", guildName = "") {
		document.getElementById("channelname").textContent = channelName
		document.getElementsByTagName("title")[0].textContent = channelName + (guildName ? " | " + guildName : "") + " | " + this.instancePing.name + " | Jank Client (Tomato fork)"
	}
	async showUpdates() {
		const res = await fetch(this.info.api + "/updates?platform=web")
		const json = await res.json()

		const container = document.createElement("div")
		container.classList.add("updates")

		const date = document.createElement("small")
		date.textContent = "Released: " + new Date(json.pub_date).toLocaleString()
		container.appendChild(date)

		const url = document.createElement("a")
		url.href = json.url
		url.textContent = json.url
		url.target = "_blank"
		url.rel = "noopener noreferrer"
		container.appendChild(url)

		container.appendChild(document.createElement("br"))
		container.appendChild(new MarkDown(json.notes, this).makeHTML())

		const dialog = new Dialog(["vdiv",
			["title", "Update: " + json.name],
			["html", container]
		])
		dialog.show()
	}
	async instanceStats() {
		const res = await fetch(this.info.api + "/policies/stats", {
			headers: this.headers
		})
		const json = await res.json()

		const dialog = new Dialog(["vdiv",
			["title", "Instance stats: " + this.instancePing.name],
			["text", "Registered users: " + json.counts.user],
			["text", "Servers: " + json.counts.guild],
			["text", "Messages: " + json.counts.message],
			["text", "Members: " + json.counts.members]
		])
		dialog.show()
	}
	async gifSearch() {
		const res = await fetch(this.info.api + "/gifs/search?q=hello&media_format=gif&locale=de", {
			headers: this.headers
		})
		const json = await res.json()
		console.log(json)
	}
}
