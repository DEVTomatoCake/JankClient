"use strict"

class Channel {
	idToPrev = new Map()
	idToNext = new Map()
	messages = new Map()

	static contextmenu = new Contextmenu()
	static setupcontextmenu() {
		this.contextmenu.addbutton("Copy channel id", (event, channel) => {
			navigator.clipboard.writeText(channel.id)
		}, null, channel => channel.localuser.settings.developer_mode)

		this.contextmenu.addbutton("Mark as read", (event, channel) => {
			channel.readbottom()
		}, null, channel => channel.hasunreads)

		this.contextmenu.addbutton("Settings", (event, channel) => {
			channel.generateSettings()
		})

		this.contextmenu.addbutton("Delete channel", (event, channel) => {
			channel.deleteChannel()
		}, null, channel => channel.isAdmin())

		this.contextmenu.addbutton("Create invite", (event, channel) => {
			channel.createInvite()
		}, null, channel => channel.hasPermission("CREATE_INSTANT_INVITE") && channel.type != 4)
	}
	createInvite() {
		const div = document.createElement("div")
		div.classList.add("invitediv")

		const text = document.createElement("input")
		text.setAttribute("readonly", "")
		text.addEventListener("click", () => {
			text.select()
		})
		div.append(text)

		const copycontainer = document.createElement("div")
		copycontainer.classList.add("copycontainer")
		const copy = document.createElement("img")
		copy.src = "/icons/copy.svg"
		copy.classList.add("copybutton", "svgtheme")
		copycontainer.append(copy)
		copycontainer.addEventListener("click", () => {
			if (text.value) navigator.clipboard.writeText(text.value)
		})
		div.append(copycontainer)

		let uses = 0
		let expires = 1800
		const update = () => {
			fetch(this.info.api + "/channels/" + this.id + "/invites", {
				method: "POST",
				headers: this.headers,
				body: JSON.stringify({
					flags: 0,
					target_type: null,
					target_user_id: null,
					max_age: expires + "",
					max_uses: uses,
					temporary: uses != 0
				})
			}).then(res => res.json()).then(json => {
				const params = new URLSearchParams()
				params.set("instance", this.info.wellknown)
				text.value = location.origin + "/invite/" + json.code + "?" + params.toString()
			})
		}
		update()

		new Dialog(["vdiv",
			["title",
				"Invite someone"
			],
			["text",
				"to #" + this.name + " in " + this.guild.properties.name
			],
			["select",
				"Expire after:", ["30 Minutes", "1 Hour", "6 Hours", "12 Hours", "1 Day", "7 Days", "30 Days", "Never"], event => {
					expires = [60 * 30, 60 * 60, 60 * 60 * 6, 60 * 60 * 12, 60 * 60 * 24, 60 * 60 * 24 * 7, 60 * 60 * 24 * 30, 0][event.srcElement.selectedIndex]
					update()
				}, 0],
			["select",
				"Max uses:", ["No limit", "1 use", "5 uses", "10 uses", "25 uses", "50 uses", "100 uses"], event => {
					uses = [0, 1, 5, 10, 25, 50, 100][event.srcElement.selectedIndex]
					update()
				}, 0],
			["html", div]
		]).show()
	}
	async generateSettings() {
		const settings = new Settings("Settings for " + this.name)

		const channelSettings = settings.addButton("Channel settings")
		const newSettings = {}

		channelSettings.addTextInput("Name", value => {
			if (value.trim() && this.name.trim() != value.trim() && value.length <= 100) newSettings.name = value.trim()
		}, { initText: this.name })
		const topicBox = channelSettings.addMDInput("Channel topic", () => {}, { initText: this.topic ? this.topic.rawString : "" })
		topicBox.watchForChange(value => {
			newSettings.topic = value
		})
		channelSettings.addCheckboxInput("NSFW", value => {
			if (this.nsfw != value) newSettings.nsfw = value.trim()
		}, { initState: this.nsfw })

		if (this.type == 2) {
			const regionsRes = await fetch(this.info.api + "/voice/regions", {
				headers: this.headers
			})
			const regions = await regionsRes.json()

			channelSettings.addSelect("Region", value => {
				newSettings.rtc_region = regions[value].id
			}, regions.map(region => region.name + (region.optimal ? " (optimal)" : "")),
				{ defaultIndex: regions.findIndex(region => region.id == this.rtc_region) })
		}

		const roles = settings.addButton("Roles")
		this.sortPerms()
		roles.options.push(new RoleList(this.permission_overwritesar, this.guild, this.updateRolePermissions.bind(this), true))

		settings.show()
	}
	sortPerms() {
		this.permission_overwritesar.sort((a, b) =>
			this.guild.roles.findIndex(role => role.snowflake == a[0]) - this.guild.roles.findIndex(role => role.snowflake == b[0])
		)
	}

	setUpInfiniteScroller() {
		this.infinite = new InfiniteScroller(async (id, offset) => {
			const snowflake = id
			if (offset == 1) {
				if (this.idToPrev.has(snowflake)) return this.idToPrev.get(snowflake)
				else {
					await this.grabBefore(id)
					return this.idToPrev.get(snowflake)
				}
			} else {
				if (this.idToNext.has(snowflake)) return this.idToNext.get(snowflake)
				if (this.lastmessage.id != id) {
					await this.grabAfter(id)
					return this.idToNext.get(snowflake) || this.lastmessage.id
				}
			}
		}, async id => {
			const message = this.messages.get(id)

			try {
				if (message) return message.buildhtml()
			} catch (e) {
				console.error(e)
			}
		}, id => {
			const message = this.messages.get(id)
			try {
				if (message) message.deleteDiv()
			} catch (e) {
				console.error(e)
			}
		}, this.readbottom.bind(this))
	}

	constructor(json, owner) {
		if (json == -1) return

		this.name = json.name
		this.type = json.type
		this.topic = json.topic
		this.icon = json.icon
		this.bitrate = json.bitrate
		this.user_limit = json.user_limit
		this.rate_limit_per_user = json.rate_limit_per_user
		this.position = json.position
		this.nsfw = json.nsfw
		this.rtc_region = json.rtc_region
		this.default_auto_archive_duration = json.default_auto_archive_duration
		this.default_reaction_emoji = json.default_reaction_emoji
		this.flags = json.flags
		this.default_thread_rate_limit_per_user = json.default_thread_rate_limit_per_user
		this.video_quality_mode = json.video_quality_mode

		this.owner = owner
		this.headers = this.owner.headers
		this.snowflake = new SnowFlake(json.id, this)
		this.parent_id = new SnowFlake(json.parent_id, void 0)
		this.parent = null
		this.children = []
		this.guild_id = json.guild_id
		this.messageids = new Map()
		this.lastreadmessageid = void 0
		this.lastmessageid = json.last_message_id
		this.setUpInfiniteScroller()

		this.permission_overwrites = new Map()
		this.permission_overwritesar = []
		for (const override of json.permission_overwrites) {
			this.permission_overwrites.set(override.id, new Permissions(override.allow, override.deny))
			this.permission_overwritesar.push([SnowFlake.getSnowFlakeFromID(override.id, Role), this.permission_overwrites.get(override.id)])
		}
	}

	isAdmin() {
		return this.guild.isAdmin()
	}
	get guild() {
		return this.owner
	}
	get localuser() {
		return this.guild.localuser
	}
	get info() {
		return this.owner.info
	}
	get id() {
		return this.snowflake.id
	}
	readStateInfo(json) {
		this.lastreadmessageid = json.last_message_id
		this.mentions = json.mention_count
		this.mentions ??= 0
		this.lastpin = json.last_pin_timestamp
	}
	hasPermission(name, member = this.guild.member) {
		if (member.isAdmin()) return true

		for (const thing of member.roles) {
			if (this.permission_overwrites.has(thing.id)) {
				const perm = this.permission_overwrites.get(thing.id).getPermission(name)
				if (perm) return perm == 1
			}
			if (thing.permissions.hasPermission(name)) return true
		}
		return false
	}
	get hasunreads() {
		if (!this.hasPermission("VIEW_CHANNEL")) return false

		const hasUnreads = this.lastmessageid && this.lastmessageid != this.lastreadmessageid && this.type != 4

		try {
			if (hasUnreads && this.myhtml) this.myhtml.classList.add("cunread")
			else if (this.myhtml) this.myhtml.classList.remove("cunread")
		} catch {}

		return hasUnreads
	}
	get canMessage() {
		return this.hasPermission("SEND_MESSAGES")
	}
	sortchildren() {
		this.children.sort((a, b) => a.position - b.position)
	}
	resolveparent(guild) {
		this.parent = guild.channelids[this.parent_id?.id]
		this.parent ??= null
		if (this.parent !== null) this.parent.children.push(this)
		return this.parent === null
	}
	calculateReorder() {
		let position = -1
		const build = []
		for (const thing of this.children) {
			const thisthing = {
				id: thing.id
			}

			if (thing.position < position) {
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
		}
		return build
	}
	static dragged = []
	createGuildHTML(admin = false) {
		if (!this.hasPermission("VIEW_CHANNEL")) {
			let quit = true
			for (const channel of this.children) {
				if (channel.hasPermission("VIEW_CHANNEL")) quit = false
			}
			if (quit) return
		}

		const div = document.createElement("div")
		div.id = "ch-" + this.id
		div.all = this
		div.draggable = admin
		div.addEventListener("dragstart", e => {
			Channel.dragged = [this, div]
			e.stopImmediatePropagation()
		})
		div.addEventListener("dragend", () => {
			Channel.dragged = []
		})

		if (this.type == 4) {
			this.sortchildren()

			const caps = document.createElement("div")
			caps.classList.add("capsflex")

			const decdiv = document.createElement("div")
			decdiv.classList.add("channeleffects", "category")

			const decoration = document.createElement("img")
			decoration.src = "/icons/collapse.svg"
			decoration.classList.add("svgtheme", "collapse-icon")
			decdiv.appendChild(decoration)

			const myhtml = document.createElement("span")
			myhtml.textContent = this.name
			decdiv.appendChild(myhtml)

			caps.appendChild(decdiv)
			const childrendiv = document.createElement("div")
			if (admin) {
				const addchannel = document.createElement("span")
				addchannel.textContent = "+"
				addchannel.classList.add("addchannel")
				caps.appendChild(addchannel)
				addchannel.onclick = () => {
					this.guild.createchannels()
				}
				this.coatDropDiv(decdiv, childrendiv)
			}
			div.appendChild(caps)
			caps.classList.add("flex")

			Channel.contextmenu.bindContextmenu(decdiv, this)
			decdiv.all = this

			for (const channel2 of this.children) {
				const createdChannel = channel2.createGuildHTML(admin)
				if (createdChannel) childrendiv.appendChild(createdChannel)
			}
			childrendiv.classList.add("channels")
			setTimeout(() => {
				childrendiv.style.height = childrendiv.scrollHeight + "px"
			}, 100)

			let open = true
			decdiv.addEventListener("click", () => {
				if (open) {
					decoration.classList.add("hiddencat")
					childrendiv.style.height = "0"
				} else {
					decoration.classList.remove("hiddencat")
					childrendiv.style.height = childrendiv.scrollHeight + "px"
				}
				open = !open
			})
			div.appendChild(childrendiv)
		} else {
			div.classList.add("channel")
			if (this.hasunreads) div.classList.add("cunread")

			Channel.contextmenu.bindContextmenu(div, this)
			if (admin) this.coatDropDiv(div)

			div.all = this
			const myhtml = document.createElement("span")
			myhtml.textContent = this.name

			if (this.type == 0 || this.type == 2 || this.type == 5) {
				const icon = document.createElement("img")
				if (this.parent) icon.classList.add("indent")

				if (this.type == 0) {
					icon.src = "/icons/channel.svg"
					icon.classList.add("space", "svgtheme")
				} else if (this.type == 2) {
					icon.src = "/icons/voice.svg"
					icon.classList.add("space", "svgtheme")
				} else if (this.type == 5) {
					icon.src = "/icons/announce.svg"
					icon.classList.add("space", "svgtheme")
				}
				div.appendChild(icon)
			} else {
				const decoration = document.createElement("b")
				if (this.parent) decoration.classList.add("indent")

				if (this.type >= 10 && this.type <= 12) {
					decoration.textContent = "🧵"
					decoration.classList.add("space")
				} else if (this.type == 13) {
					decoration.textContent = "🎭"
					decoration.classList.add("space")
				} else if (this.type == 15) {
					decoration.textContent = "🗂️"
					decoration.classList.add("space")
				} else if (this.type == 16) {
					decoration.textContent = "📸"
					decoration.classList.add("space")
				} else {
					decoration.textContent = "❓"
					console.warn("Unable to handle channel type " + this.type)
				}
				div.appendChild(decoration)
			}

			div.appendChild(myhtml)
			div.addEventListener("click", () => {
				this.getHTML()
			})
		}
		return div
	}
	get myhtml() {
		const search = document.getElementById("channels").children[0].children
		if (this.guild !== this.localuser.lookingguild) return null
		else if (this.parent) {
			for (const thing of search) {
				if (thing.all === this.parent) {
					for (const thing2 of thing.children[1].children) {
						if (thing2.all === this) return thing2
					}
				}
			}
		} else {
			for (const thing of search) {
				if (thing.all === this) return thing
			}
		}
		return null
	}
	readbottom() {
		if (!this.hasunreads) return

		fetch(this.info.api + "/channels/" + this.id + "/messages/" + this.lastmessageid + "/ack", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({})
		})
		this.lastreadmessageid = this.lastmessageid
	}
	coatDropDiv(div, container = false) {
		div.addEventListener("dragenter", event => {
			event.preventDefault()
		})
		div.addEventListener("dragover", event => {
			event.preventDefault()
		})

		div.addEventListener("drop", event => {
			const dragged = Channel.dragged[0]
			if (!dragged) return

			event.preventDefault()
			if (container) {
				dragged.move_id = this.snowflake
				if (dragged.parent) dragged.parent.children.splice(dragged.parent.children.indexOf(dragged), 1)

				dragged.parent = this
				container.prepend(Channel.dragged[1])
				console.log(this, dragged)
				this.children.unshift(dragged)
			} else {
				dragged.move_id = this.parent_id
				if (dragged.parent) dragged.parent.children.splice(dragged.parent.children.indexOf(dragged), 1)
				else this.guild.headchannels.splice(this.guild.headchannels.indexOf(dragged), 1)

				dragged.parent = this.parent
				if (dragged.parent) {
					const build = []
					for (let i = 0; i < dragged.parent.children.length; i++) {
						build.push(dragged.parent.children[i])
						if (dragged.parent.children[i] === this) build.push(dragged)
					}
					dragged.parent.children = build
				} else {
					const build = []
					for (let i = 0; i < this.guild.headchannels.length; i++) {
						build.push(this.guild.headchannels[i])
						if (this.guild.headchannels[i] === this) build.push(dragged)
					}
					this.guild.headchannels = build
				}

				if (Channel.dragged[1]) div.after(Channel.dragged[1])
			}
			this.guild.calculateReorder()
		})

		return div
	}
	createChannel(name, type) {
		fetch(this.info.api + "/guilds/" + this.guild.id + "/channels", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({
				name,
				type,
				parent_id: this.id,
				permission_overwrites: []
			})
		})
	}
	deleteChannel() {
		if (confirm("Do you really want to delete the channel \"" + this.name + "\"?")) fetch(this.info.api + "/channels/" + this.id, {
			method: "DELETE",
			headers: this.headers
		})
	}
	setReplying(message) {
		if (this.replyingto) this.replyingto.div.classList.remove("replying")
		this.replyingto = message
		this.replyingto.div.classList.add("replying")
		this.makereplybox()
	}
	makereplybox() {
		const replybox = document.getElementById("replybox")
		if (this.replyingto) {
			replybox.innerHTML = ""
			const span = document.createElement("span")
			span.textContent = "Replying to " + this.replyingto.author.username

			const close = document.createElement("button")
			close.textContent = "⦻"
			close.classList.add("cancelReply")
			close.addEventListener("click", () => {
				this.replyingto.div.classList.remove("replying")
				replybox.classList.add("hideReplyBox")
				this.replyingto = null
				replybox.innerHTML = ""
			})

			replybox.classList.remove("hideReplyBox")
			replybox.append(span)
			replybox.append(close)
		} else replybox.classList.add("hideReplyBox")
	}
	async getmessage(id) {
		const message = this.messages.get(id)
		if (message) return message

		const res = await fetch(this.info.api + "/channels/" + this.id + "/messages?limit=1&around=" + id, {
			headers: this.headers
		})

		const json = await res.json()
		if (!json[0]) json[0] = {
			id,
			content: "*<Message not found>*",
			author: {
				id: "0",
				username: "Spacebar Ghost",
				avatar: null
			}
		}

		return new Message(json[0], this)
	}
	static genid = 0
	async getHTML() {
		const id = ++Channel.genid
		if (this.owner != this.localuser.lookingguild) this.owner.loadGuild()
		if (this.localuser.channelfocus) this.localuser.channelfocus.infinite.delete()

		if (this.localuser.channelfocus && this.localuser.channelfocus.myhtml)
			this.localuser.channelfocus.myhtml.classList.remove("viewChannel")
		this.myhtml.classList.add("viewChannel")

		this.owner.prevchannel = this
		this.localuser.channelfocus = this
		const prom = this.infinite.delete()

		history.pushState(null, "", "/channels/" + this.guild_id + "/" + this.id)
		this.localuser.pageTitle("#" + this.name, this.guild.properties.name)

		const topic = document.getElementById("channelTopic")
		if (this.topic) {
			topic.innerHTML = new MarkDown(this.topic, this).makeHTML().innerHTML
			topic.removeAttribute("hidden")
		} else topic.setAttribute("hidden", "")

		const loading = document.getElementById("loadingdiv")
		Channel.regenLoadingMessages()
		loading.classList.add("loading")

		await this.putmessages()
		await prom
		if (id != Channel.genid) return

		this.makereplybox()
		await this.buildmessages()

		if (this.canMessage) document.getElementById("typebox").contentEditable = true
		else document.getElementById("typebox").contentEditable = false
	}
	static regenLoadingMessages() {
		const loading = document.getElementById("loadingdiv")
		loading.innerHTML = ""

		for (let i = 0; i < 18; i++) {
			const div = document.createElement("div")
			div.classList.add("loadingmessage")

			if (Math.random() > 0.5) {
				const pfp = document.createElement("div")
				pfp.classList.add("pfp", "loadingpfp")

				const username = document.createElement("div")
				username.classList.add("loadingcontent")
				username.style.width = Math.floor(Math.random() * 96 * 1.5 + 40) + "px"
				div.append(pfp, username)
			}

			const content = document.createElement("div")
			content.classList.add("loadingcontent")
			content.style.width = Math.floor(Math.random() * 96 * 3 + 50) + "px"
			content.style.height = (Math.floor(Math.random() * 3 + 1) * 20) + "px"
			div.append(content)

			loading.append(div)
		}
	}
	async putmessages() {
		if (this.allthewayup) return
		if (this.lastreadmessageid && this.messages.has(this.lastreadmessageid)) return

		const res = await fetch(this.info.api + "/channels/" + this.id + "/messages?limit=100", {
			headers: this.headers
		})
		const json = await res.json()
		if (json.length != 100) this.allthewayup = true

		let prev
		for (const msg of json) {
			const message = new Message(msg, this)
			if (prev) {
				this.idToNext.set(message.id, prev.id)
				this.idToPrev.set(prev.id, message.id)
			} else {
				this.lastmessage = message
				this.lastmessageid = message.id
			}
			prev = message

			if (!this.messageids.has(message.snowflake)) this.messageids.set(message.snowflake, message)
		}

		if (json.some(msg => msg.author.id == this.localuser.user.id))
			this.lastselfmessage = this.messageids.get(json.find(msg => msg.author.id == this.localuser.user.id).id)
	}
	delChannel(json) {
		this.children = this.children.filter(child => child.id != json.id)
	}
	async grabBefore(id) {
		if (this.topid && this.topid == id) return

		const res = await fetch(this.info.api + "/channels/" + this.id + "/messages?before=" + id + "&limit=100", {
			headers: this.headers
		})
		const json = await res.json()

		if (json.length < 100) {
			this.allthewayup = true
			if (json.length == 0) this.topid = id
		}

		let previd = id
		for (const i in json) {
			let messager
			let willbreak = false
			if (this.messages.has(json[i].id)) {
				messager = this.messages.get(json[i].id)
				willbreak = true
			} else messager = new Message(json[i], this)

			this.idToNext.set(messager.id, previd)
			this.idToPrev.set(previd, messager.id)
			previd = messager.id
			this.messageids.set(messager.snowflake, messager)
			if (json.length - 1 == i && json.length < 100) this.topid = previd

			if (willbreak) break
		}
	}
	async grabAfter(id) {
		if (this.lastmessage.id == id) return

		const res = await fetch(this.info.api + "/channels/" + this.id + "/messages?limit=100&after=" + id, {
			headers: this.headers
		})
		const json = await res.json()

		let previd = SnowFlake.getSnowFlakeFromID(id, Message)
		for (const msg of json) {
			let messager
			let willbreak = false
			if (this.messages.has(msg.id)) {
				messager = this.messages.get(msg.id)
				willbreak = true
			} else messager = new Message(msg, this)

			this.idToNext.set(messager.id, previd)
			this.idToPrev.set(previd, messager.id)
			previd = messager.id
			this.messageids.set(messager.snowflake, messager)

			if (willbreak) break
		}
	}
	async buildmessages() {
		this.infinitefocus = false
		this.tryfocusinfinite()
	}
	infinitefocus = false
	async tryfocusinfinite() {
		if (this.infinitefocus) return
		this.infinitefocus = true

		const messages = document.getElementById("channelw")
		for (const thing of messages.getElementsByClassName("messagecontainer")) thing.remove()

		const loading = document.getElementById("loadingdiv")
		const removetitle = document.getElementById("removetitle")

		let id
		if (this.lastreadmessageid && this.messages.has(this.lastreadmessageid)) id = this.lastreadmessageid
		else if (this.lastmessageid && this.messages.has(this.lastmessageid)) id = this.goBackIds(this.lastmessageid, 50)

		if (!id) {
			if (document.getElementsByClassName("messagecontainer")[0]) document.getElementsByClassName("messagecontainer")[0].remove()
			if (!removetitle) {
				const title = document.createElement("h2")
				title.id = "removetitle"
				title.textContent = "No messages appear to be here, be the first to say something!"
				title.classList.add("titlespace")
				messages.append(title)
			}
			this.infinitefocus = false
			loading.classList.remove("loading")
			return
		} else if (removetitle) removetitle.remove()

		messages.append(await this.infinite.getDiv(id))
		this.infinite.updatestuff()
		this.infinite.watchForChange().then(async () => {
			this.infinite.focus(id, false) // if someone could figure out how to make this work correctly without this, that's be great :P
			loading.classList.remove("loading")
		})
	}
	goBackIds(id, back, returnIfNotExistent = true) {
		while (back != 0) {
			const nextid = this.idToPrev.get(id)
			if (nextid) {
				id = nextid
				back--
			} else {
				if (returnIfNotExistent) break
				return
			}
		}
		return id
	}
	findClosest(id) {
		if (!this.lastmessageid || !id) return

		let flake = this.lastmessageid
		const time = Number((BigInt(id) >> 22n) + 1420070400000n)
		let flaketime = Number((BigInt(flake) >> 22n) + 1420070400000n)
		while (flake && time < flaketime) {
			flake = this.idToPrev.get(flake)
			if (!flake) return

			flaketime = Number((BigInt(flake) >> 22n) + 1420070400000n)
		}
		return flake
	}
	updateChannel(json) {
		this.type = json.type
		this.name = json.name
		this.parent_id = SnowFlake.getSnowFlakeFromID(json.parent_id, Channel)
		this.parent = null
		this.children = []
		this.guild_id = json.guild_id
		this.messageids = new Map()
		this.topic = json.topic
		this.nsfw = json.nsfw

		this.permission_overwrites = new Map()
		this.permission_overwritesar = []
		for (const override of json.permission_overwrites) {
			this.permission_overwrites.set(override.id, new Permissions(override.allow, override.deny))
			this.permission_overwritesar.push([SnowFlake.getSnowFlakeFromID(override.id, Role), this.permission_overwrites.get(override.id)])
		}
	}
	typingstart() {
		if (this.typing > Date.now()) return

		this.typing = Date.now() + 6000
		fetch(this.info.api + "/channels/" + this.id + "/typing", {
			method: "POST",
			headers: this.headers
		})
	}
	get notification() {
		let notinumber = this.message_notifications
		if (notinumber == 3) notinumber = null
		notinumber ??= this.guild.message_notifications

		const notiTypes = ["all", "mentions", "none", "default"]
		return notiTypes[notinumber]
	}
	async sendMessage(content, {attachments = [], replyingto = null}) {
		let replyjson
		if (replyingto) replyjson = {
			message_id: replyingto.id
		}

		const body = {
			content,
			nonce: Math.floor(Math.random() * 1000000000)
		}
		if (replyjson) body.message_reference = replyjson

		if (attachments.length == 0) return await fetch(this.info.api + "/channels/" + this.id + "/messages", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify(body)
		})

		const formData = new FormData()

		formData.append("payload_json", JSON.stringify(body))
		for (const i in attachments) {
			formData.append("files[" + i + "]", attachments[i])
		}

		return await fetch(this.info.api + "/channels/" + this.id + "/messages", {
			method: "POST",
			headers: {
				Authorization: this.headers.Authorization
			},
			body: formData
		})
	}
	messageCreate(messagep) {
		if (!this.hasPermission("VIEW_CHANNEL")) return

		const messagez = new Message(messagep.d, this)
		if (this.lastmessageid) {
			this.idToNext.set(this.lastmessageid, messagez.id)
			this.idToPrev.set(messagez.id, this.lastmessageid)
		}
		this.lastmessage = messagez
		this.lastmessageid = messagez.id
		this.messageids.set(messagez.id, messagez)

		if (messagez.author === this.localuser.user) {
			this.lastreadmessageid = messagez.id
			if (this.myhtml) this.myhtml.classList.remove("cunread")
		} else if (this.myhtml) this.myhtml.classList.add("cunread")

		this.guild.unreads()
		if (this === this.localuser.channelfocus) {
			if (!this.infinitefocus) this.tryfocusinfinate()
			this.infinite.addedBottom()
		}

		if (messagez.author == this.localuser.user) this.lastselfmessage = messagez

		if (
			messagez.author !== this.localuser.user &&
			!this.guild.muted &&
			messagez.author.relationshipType != 2 &&
			this.localuser.lookingguild.prevchannel !== this &&
			!document.hasFocus() &&
			(this.notification == "all" || (this.notification == "mentions" && messagez.mentionsuser(this.localuser.user)))
		) this.notify(messagez)
	}
	notititle(message) {
		return message.author.username + " > " + this.guild.properties.name + " > " + this.name
	}
	async notify(message) {
		Audio.noises(Audio.getNotificationSound())
		if (!("Notification" in window)) return

		if (Notification.permission == "granted") {
			let noticontent = message.content.textContent

			if (message.system) noticontent ||= "System Message"
			else noticontent ||= "Blank Message"

			let imgurl = null
			const images = message.getimages()
			if (images.length > 0) {
				const image = images[0]
				imgurl ||= image.proxy_url || image.url
			}

			const notification = new Notification(this.notititle(message), {
				body: noticontent,
				icon: message.author.getpfpsrc(),
				image: imgurl
			})
			notification.addEventListener("click", () => {
				window.focus()
				this.getHTML()
			})
		} else if (Notification.permission != "denied") {
			const result = await Notification.requestPermission()
			if (result == "granted") this.notify(message)
		}
	}
	async addRoleToPerms(role) {
		await fetch(this.info.api + "/channels/" + this.id + "/permissions/" + role.id, {
			method: "PUT",
			headers: this.headers,
			body: JSON.stringify({
				allow: "0",
				deny: "0",
				id: role.id,
				type: 0
			})
		})
		const perm = new Permissions("0", "0")
		this.permission_overwrites.set(role.id, perm)
		this.permission_overwritesar.push([role.snowflake, perm])
	}
	async updateRolePermissions(id, perms) {
		const permission = this.permission_overwrites.get(id)
		if (permission) {
			permission.allow = perms.allow
			permission.deny = perms.deny
			await fetch(this.info.api + "/channels/" + this.id + "/permissions/" + id, {
				method: "PUT",
				headers: this.headers,
				body: JSON.stringify({
					allow: permission.allow.toString(),
					deny: permission.deny.toString(),
					id,
					type: 0
				})
			})
		}
	}
}

Channel.setupcontextmenu()
