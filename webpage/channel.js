"use strict"

class Channel {
	idToPrev = new Map()
	idToNext = new Map()
	static contextmenu = new Contextmenu()
	static setupcontextmenu() {
		this.contextmenu.addbutton("Copy channel id", function() {
			navigator.clipboard.writeText(this.id)
		}, null, owner => owner.localuser.settings.developerMode)

		this.contextmenu.addbutton("Mark as read", function() {
			this.readbottom()
		})

		this.contextmenu.addbutton("Settings", function() {
			this.generateSettings()
		})

		this.contextmenu.addbutton("Delete channel", function() {
			this.deleteChannel()
		}, null, owner => owner.isAdmin())

		this.contextmenu.addbutton("Edit channel", function() {
			editchannel(this)
		}, null, owner => owner.isAdmin())

		this.contextmenu.addbutton("Make invite", function() {
			this.createInvite()
		}, null, owner => owner.hasPermission("CREATE_INSTANT_INVITE") && owner.type != 4)
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
		copycontainer.onclick = () => {
			navigator.clipboard.writeText(text.value)
		}
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
	generateSettings() {
		this.sortPerms()
		const settings = new Settings("Settings for " + this.name)
		const s1 = settings.addButton("roles")
		s1.options.push(new RoleList(this.permission_overwritesar, this.guild, this.updateRolePermissions.bind(this), true))
		settings.show()
	}
	sortPerms() {
		this.permission_overwritesar.sort((a, b) =>
			this.guild.roles.findIndex(role => role.snowflake == a[0]) - this.guild.roles.findIndex(role => role.snowflake == b[0])
		)
	}

	setUpInfiniteScroller() {
		const ids = new Map()
		this.infinite = new InfiniteScroller((async (id, offset) => {
			const snowflake = SnowFlake.getSnowFlakeFromID(id, Message)
			if (offset == 1) {
				if (this.idToPrev.has(snowflake)) return this.idToPrev.get(snowflake)?.id
				else {
					await this.grabBefore(id)
					return this.idToPrev.get(snowflake)?.id
				}
			} else {
				if (this.idToNext.has(snowflake)) return this.idToNext.get(snowflake)?.id
				if (this.lastmessage.id != id) {
					await this.grabAfter(id)
					return this.idToNext.get(snowflake)?.id
				}
			}
		}), (async id => {
			let res
			const promise = new Promise(_ => {
				res = _
			})
			const snowflake = SnowFlake.getSnowFlakeFromID(id, Message)
			if (!snowflake.getObject()) {
				await this.grabAround(id)
			}
			const html = snowflake.getObject().buildhtml(this.messageids.get(this.idToPrev.get(snowflake)), promise)
			ids.set(id, res)
			return html
		}), (id => {
			ids.get(id)()
			ids.delete(id)
			return true
		}), this.readbottom.bind(this))
	}

	constructor(json, owner) {
		if (json == -1) return

		this.type = json.type
		this.owner = owner
		this.headers = this.owner.headers
		this.name = json.name
		this.snowflake = new SnowFlake(json.id, this)
		this.parent_id = new SnowFlake(json.parent_id, void 0)
		this.parent = null
		this.children = []
		this.guild_id = json.guild_id
		this.messageids = new Map()
		this.topic = json.topic
		this.nsfw = json.nsfw
		this.position = json.position
		this.lastreadmessageid = null
		this.lastmessageid = SnowFlake.getSnowFlakeFromID(json.last_message_id, Message)
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
		this.lastreadmessageid = SnowFlake.getSnowFlakeFromID(json.last_message_id, Message)
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

		return this.lastmessageid != this.lastreadmessageid && this.type != 4 && Boolean(this.lastmessageid.id)
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
				thing.move_id = void 0
			}
			if (thisthing.position || thisthing.parent_id) build.push(thisthing)
		}
		return build
	}
	static dragged = []
	createGuildHTML(admin = false) {
		const div = document.createElement("div")
		if (!this.hasPermission("VIEW_CHANNEL")) {
			let quit = true
			for (const thing of this.children) {
				if (thing.hasPermission("VIEW_CHANNEL")) quit = false
			}
			if (quit) return div
		}
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

			const decdiv = document.createElement("div")
			decdiv.classList.add("channeleffects")

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
				addchannel.onclick = function() {
					this.guild.createchannels()
				}.bind(this)
				this.coatDropDiv(decdiv, childrendiv)
			}
			div.appendChild(caps)
			caps.classList.add("flex")

			Channel.contextmenu.bind(decdiv, this)
			decdiv.all = this

			for (const channel2 of this.children) {
				childrendiv.appendChild(channel2.createGuildHTML(admin))
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

			Channel.contextmenu.bind(div, this)
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
					decoration.classList.add("space", "spacee")
				} else if (this.type == 13) {
					decoration.textContent = "🎭"
					decoration.classList.add("space", "spacee")
				} else if (this.type == 15) {
					decoration.textContent = "🗂️"
					decoration.classList.add("space", "spacee")
				} else if (this.type == 16) {
					decoration.textContent = "📸"
					decoration.classList.add("space", "spacee")
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
		this.guild.unreads()
		if (this.myhtml !== null) this.myhtml.classList.remove("cunread")
	}
	coatDropDiv(div, container = false) {
		div.addEventListener("dragenter", event => {
			event.preventDefault()
		})

		div.addEventListener("dragover", event => {
			event.preventDefault()
		})

		div.addEventListener("drop", event => {
			const that = Channel.dragged[0]
			event.preventDefault()
			if (container) {
				that.move_id = this.snowflake
				if (that.parent) that.parent.children.splice(that.parent.children.indexOf(that), 1)

				that.parent = this
				container.prepend(Channel.dragged[1])
				console.log(this, that)
				this.children.unshift(that)
			} else {
				that.move_id = this.parent_id
				if (that.parent) that.parent.children.splice(that.parent.children.indexOf(that), 1)
				else this.guild.headchannels.splice(this.guild.headchannels.indexOf(that), 1)

				that.parent = this.parent
				if (that.parent) {
					const build = []
					for (let i = 0; i < that.parent.children.length; i++) {
						build.push(that.parent.children[i])
						if (that.parent.children[i] === this) build.push(that)
					}
					that.parent.children = build
				} else {
					const build = []
					for (let i = 0; i < this.guild.headchannels.length; i++) {
						build.push(this.guild.headchannels[i])
						if (this.guild.headchannels[i] === this) build.push(that)
					}
					this.guild.headchannels = build
				}
				div.after(Channel.dragged[1])
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
	editChannel() {
		let name = this.name
		let topic = this.topic
		let nsfw = this.nsfw
		const thisid = this.id
		const thistype = this.type
		const full = new Dialog(
			["hdiv",
				["vdiv",
					["textbox", "Channel name:", this.name, event => {
						name = event.target.value
					}],
					["mdbox", "Channel topic:", this.topic, event => {
						topic = event.target.value
					}],
					["checkbox", "NSFW Channel", this.nsfw, event => {
						nsfw = event.target.checked
					}],
					["button", "", "submit", () => {
						fetch(this.info.api + "/channels/" + thisid, {
							method: "PATCH",
							headers: this.headers,
							body: JSON.stringify({
								name,
								type: thistype,
								topic,
								nsfw/*,
								bitrate: 64000,
								user_limit: 0,
								flags: 0,
								rate_limit_per_user: 0*/
							})
						})
						full.hide()
					}]
				]

			])
		full.show()
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
		const snowflake = SnowFlake.getSnowFlakeFromID(id, Message)
		if (snowflake.getObject()) return snowflake.getObject()

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

		if (this.localuser.channelfocus && this.localuser.channelfocus.myhtml) this.localuser.channelfocus.myhtml.classList.remove("viewChannel")
		this.myhtml.classList.add("viewChannel")

		this.owner.prevchannel = this
		this.localuser.channelfocus = this
		const prom = this.infinite.delete()

		history.pushState(null, "", "/channels/" + this.guild_id + "/" + this.id)
		document.getElementById("channelname").textContent = "#" + this.name

		if (this.topic) {
			document.getElementById("channelTopic").textContent = this.topic
			document.getElementById("channelTopic").removeAttribute("hidden")
		} else document.getElementById("channelTopic").setAttribute("hidden", "")

		await this.putmessages()
		await prom
		if (id != Channel.genid) return

		this.makereplybox()
		await this.buildmessages()

		if (this.canMessage) document.getElementById("typebox").contentEditable = true
		else document.getElementById("typebox").contentEditable = false
	}
	async putmessages() {
		if (this.allthewayup) return

		const res = await fetch(this.info.api + "/channels/" + this.id + "/messages?limit=100", {
			headers: this.headers
		})

		const json = await res.json()
		if (json.length != 100) this.allthewayup = true

		let prev
		for (const thing of json) {
			const message = new Message(thing, this)
			if (prev) {
				this.idToNext.set(message.snowflake, prev.snowflake)
				this.idToPrev.set(prev.snowflake, message.snowflake)
			} else this.lastmessage = message
			prev = message

			if (!this.messageids.has(message.snowflake)) this.messageids.set(message.snowflake, message)
		}
	}
	delChannel(json) {
		const build = []
		for (const child of this.children) {
			if (child.id != json.id) build.push(child)
		}
		this.children = build
	}
	async grabBefore(id) {
		if (this.topid && this.topid.id == id) return

		const res = await fetch(this.info.api + "/channels/" + this.id + "/messages?before=" + id + "&limit=100", {
			headers: this.headers
		})
		const json = await res.json()

		if (json.length < 100) {
			this.allthewayup = true
			if (json.length == 0) this.topid = SnowFlake.getSnowFlakeFromID(id, Message)
		}

		let previd = SnowFlake.getSnowFlakeFromID(id, Message)
		for (const i in json) {
			let messager
			let willbreak = false
			if (SnowFlake.hasSnowFlakeFromID(json[i].id, Message)) {
				messager = SnowFlake.getSnowFlakeFromID(json[i].id, Message).getObject()
				willbreak = true
			} else messager = new Message(json[i], this)

			this.idToNext.set(messager.snowflake, previd)
			this.idToPrev.set(previd, messager.snowflake)
			previd = messager.snowflake
			this.messageids.set(messager.snowflake, messager)
			if (json.length - 1 == i && json.length < 100) this.topid = previd

			if (willbreak) break
		}
	}
	async grabAfter(id) {
		if (this.lastmessage.id == id) return

		await fetch(this.info.api + "/channels/" + this.id + "/messages?limit=100&after=" + id, {
			headers: this.headers
		}).then(j => j.json()).then(json => {
			let previd = SnowFlake.getSnowFlakeFromID(id, Message)
			for (const i in json) {
				let messager
				let willbreak = false
				if (SnowFlake.hasSnowFlakeFromID(json[i].id, Message)) {
					messager = SnowFlake.getSnowFlakeFromID(json[i].id, Message).getObject()
					willbreak = true
				} else messager = new Message(json[i], this)

				this.idToPrev.set(messager.snowflake, previd)
				this.idToNext.set(previd, messager.snowflake)
				previd = messager.snowflake
				this.messageids.set(messager.snowflake, messager)

				if (willbreak) break
			}
		})
	}
	buildmessage(message, next) {
		const built = message.buildhtml(next)
		document.getElementById("messages").prepend(built)
	}
	async buildmessages() {
		this.infinitefocus = false
		this.tryfocusinfinite()
	}
	infinitefocus = false
	async tryfocusinfinite() {
		if (this.infinitefocus) return

		const messages = document.getElementById("channelw")
		messages.innerHTML = ""
		let id
		if (this.lastreadmessageid && this.lastreadmessageid.getObject()) id = this.lastreadmessageid
		else if (this.lastmessage && this.lastmessage.snowflake) id = this.goBackIds(this.lastmessage.snowflake, 50)

		if (!id) {
			const title = document.createElement("h2")
			title.textContent = "No messages appear to be here, be the first to say something!"
			title.classList.add("titlespace")
			messages.append(title)
			return
		}
		messages.innerHTML = ""

		messages.append(await this.infinite.getDiv(id.id))
		this.infinite.updatestuff()
		this.infinite.watchForChange().then(async () => {
			await new Promise(resolve => {
				setTimeout(resolve, 0)
			})
			this.infinite.focus(id.id, false) //if someone could figure out how to make this work correctly without this, that's be great :P
		})
		this.infinite.focus(id.id, false)
		this.infinitefocus = true
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
	findClosest(snowflake) {
		if (!this.lastmessage)
			return
		let flake = this.lastmessage.snowflake
		if (!snowflake) {
			return
		}

		const time = snowflake.getUnixTime()
		let flaketime = flake.getUnixTime()
		while (flake && time > flaketime) {
			flake = this.idToNext.get(flake)
			if (!flake) return

			flaketime = flake.getUnixTime()
		}
		return flake
	}
	updateChannel(json) {
		this.type = json.type
		this.name = json.name
		this.parent_id = new SnowFlake(json.parent_id, void 0)
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
		this.idToNext.set(this.lastmessageid, messagez.snowflake)
		this.idToPrev.set(messagez.snowflake, this.lastmessageid)
		this.lastmessage = messagez
		this.lastmessageid = messagez.snowflake
		this.messageids.set(messagez.snowflake, messagez)

		if (messagez.author === this.localuser.user) {
			this.lastreadmessageid = messagez.snowflake
			if (this.myhtml) this.myhtml.classList.remove("cunread")
		} else if (this.myhtml) this.myhtml.classList.add("cunread")

		this.guild.unreads()
		if (this === this.localuser.channelfocus) {
			if (!this.infinitefocus) this.tryfocusinfinate()
			this.infinite.addedBottom()
		}

		if (messagez.author === this.localuser.user) return
		if (this.localuser.lookingguild.prevchannel === this && document.hasFocus()) return

		if (this.notification == "all" || (this.notification == "mentions" && messagez.mentionsuser(this.localuser.user))) this.notify(messagez)
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

Channel.setupcontextmenu()

document.addEventListener("DOMContentLoaded", () => {
	let last
	const dud = document.createElement("p")
	dud.classList.add("svgtheme")
	document.body.append(dud)
	const css = window.getComputedStyle(dud)

	const fixsvgtheme = () => {
		const thing = css.color.replace("rgb(", "").replace(")", "").split(",")
		const r = Number.parseInt(thing[0]) / 255
		const g = Number.parseInt(thing[1]) / 255
		const b = Number.parseInt(thing[2]) / 255
		const max = Math.max(r, g, b)
		const min = Math.min(r, g, b)
		const l = (max + min) / 2
		let s
		let h
		if (max == min) {
			s = 0
			h = 0
		} else {
			if (l <= 0.5) s = (max - min) / (max + min)
			else s = (max - min) / (2 - max - min)

			if (r == max) h = (g - b) / (max - min)
			else if (g == max) h = 2 + (b - r) / (max - min)
			else if (b == max) h = 4 + (r - g) / (max - min)
		}

		const rot = Math.floor(h * 60) + "deg"
		const invert = 0.5 - (s / 2) + ""
		const brightness = Math.floor((l * 200)) + "%"
		const current = rot + invert + brightness
		if (current != last) {
			last = current
			document.documentElement.style.setProperty("--rot", rot)
			document.documentElement.style.setProperty("--invert", invert)
			document.documentElement.style.setProperty("--brightness", brightness)
		}
	}
	setInterval(fixsvgtheme, 100)
})
