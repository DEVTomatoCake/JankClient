"use strict"

const isGerman = (navigator.language || navigator.userLanguage).startsWith("de")
const makeTime = date => date.toLocaleTimeString(isGerman ? "de-DE" : void 0, { hour: "2-digit", minute: "2-digit" })
const formatTime = date => {
	const now = new Date()
	const sameDay = date.getDate() == now.getDate() &&
		date.getMonth() == now.getMonth() &&
		date.getFullYear() == now.getFullYear()

	const yesterday = new Date(now)
	yesterday.setDate(now.getDate() - 1)
	const isYesterday = date.getDate() == yesterday.getDate() &&
		date.getMonth() == yesterday.getMonth() &&
		date.getFullYear() == yesterday.getFullYear()

	if (sameDay) return (isGerman ? "heute um" : "Today at") + " " + makeTime(date)
	if (isYesterday) return (isGerman ? "gestern um" : "Yesterday at") + " " + makeTime(date)
	return date.toLocaleDateString(isGerman ? "de-DE" : void 0, isGerman ? {year: "numeric", month: "2-digit", day: "2-digit"} : void 0) +
		" " + (isGerman ? "um" : "at") + " " + makeTime(date)
}

class Message {
	static setup() {
		this.del = new Promise(resolve => {
			this.resolve = resolve
		})
		Message.setupcmenu()
	}
	static async wipeChanel() {
		this.resolve()
		document.getElementById("messages").innerHTML = ""
		await Promise.allSettled([this.resolve])
		this.del = new Promise(resolve => {
			this.resolve = resolve
		})
	}

	static contextmenu = new Contextmenu()
	static setupcmenu() {
		Message.contextmenu.addbutton("Copy raw text", function() {
			navigator.clipboard.writeText(this.content.rawString)
		})
		Message.contextmenu.addbutton("Reply", function() {
			this.channel.setReplying(this)
		})

		Message.contextmenu.addbutton("Copy message id", function() {
			navigator.clipboard.writeText(this.id)
		}, null, owner => owner.localuser.settings.developerMode)

		Message.contextmenu.addsubmenu("Add reaction", function(e) {
			Emoji.emojiPicker(e.x, e.y, this.localuser).then(emoji => {
				this.reactionToggle(emoji)
			})
		})

		Message.contextmenu.addsubmenu("Mark as unread", function() {
			fetch(this.info.api + "/channels/" + this.channel.id + "/messages/" + this.id + "/ack", {
				method: "POST",
				headers: this.headers,
				body: JSON.stringify({})
			})
		})

		Message.contextmenu.addbutton("Edit", function() {
			this.channel.editing = this
			const markdown = document.getElementById("typebox").markdown
			markdown.txt = this.content.rawString
			markdown.boxupdate(document.getElementById("typebox"))
		}, null, m => m.author.id == m.localuser.user.id)

		Message.contextmenu.addbutton("Delete message", function() {
			this.delete()
		}, null, msg => msg.canDelete())
	}

	constructor(messagejson, owner) {
		this.owner = owner
		this.headers = this.owner.headers

		this.giveData(messagejson)
	}
	giveData(messagejson) {
		const snapBottom = this.channel.infinite.snapBottom()

		this.type = messagejson.type
		this.channel_id = messagejson.channel_id
		this.guild_id = messagejson.guild_id
		this.snowflake = new SnowFlake(messagejson.id, this)
		this.author = User.checkuser(messagejson.author, this.localuser)
		if (messagejson.member) Member.new(messagejson.member, this.guild).then(m => {
			this.member = m
		})
		this.content = new MarkDown(messagejson.content, this.channel)
		this.tts = messagejson.tts && this.owner.localuser.settings.enable_tts_command
		this.timestamp = messagejson.timestamp
		this.edited_timestamp = messagejson.edited_timestamp
		this.message_reference = messagejson.message_reference
		this.mention_everyone = messagejson.mention_everyone
		this.pinned = messagejson.pinned
		this.reactions = messagejson.reactions

		if (messagejson.attachments) {
			this.attachments = []
			for (const thing of messagejson.attachments) {
				this.attachments.push(new Attachment(thing, this))
			}
		}

		if (messagejson.embeds) {
			this.embeds = []
			for (const thing of messagejson.embeds) {
				this.embeds.push(new Embed(thing, this))
			}
		}

		if (messagejson.components) {
			this.components = []
			for (const thing of messagejson.components) {
				this.components.push(new Component(thing, this))
			}
		}

		if (!this.member && this.guild.id != "@me") {
			this.author.resolvemember(this.guild).then(member => {
				this.member = member
			})
		}

		if (messagejson.mentions) {
			this.mentions = []
			for (const thing of messagejson.mentions) {
				this.mentions.push(new User(thing, this.localuser))
			}
		}

		if (messagejson.mention_roles) {
			this.mention_roles = []
			for (const thing of messagejson.mention_roles) {
				this.mention_roles.push(new Role(thing, this))
			}
		}

		if (this.div) this.generateMessage()

		snapBottom()
	}
	canDelete() {
		return this.channel.hasPermission("MANAGE_MESSAGES") || this.author.snowflake === this.localuser.user.snowflake
	}
	get channel() {
		return this.owner
	}
	get guild() {
		return this.owner.guild
	}
	get localuser() {
		return this.owner.localuser
	}
	get info() {
		return this.owner.info
	}
	get id() {
		return this.snowflake.id
	}
	reactionToggle(emoji) {
		let remove = false
		for (const thing of this.reactions) {
			if (thing.emoji.name == emoji) {
				remove = thing.me
				break
			}
		}
		fetch(this.info.api + "/channels/" + this.channel.id + "/messages/" + this.id + "/reactions/" +
			(encodeURIComponent(typeof emoji == "string" ? emoji : (emoji.name + ":" + emoji.id))) + "/@me", {
			method: remove ? "DELETE" : "PUT",
			headers: this.headers
		})
	}
	messageevents(obj) {
		Message.contextmenu.bind(obj, this)
		this.div = obj
		obj.classList.add("messagediv")
	}
	deleteDiv() {
		console.log(this.id)
		if (!this.div)
			return
		try {
			this.div.remove()
			this.div = null
		} catch (e) {
			console.error(e)
		}
	}
	mentionsuser(userd) {
		if (userd instanceof User) return this.mentions.includes(userd)
		if (userd instanceof Member) return this.mentions.includes(userd.user)
	}
	getimages() {
		const build = []
		for (const thing of this.attachments) {
			if (thing.content_type.startsWith("image/")) build.push(thing)
		}
		return build
	}
	async edit(content) {
		return await fetch(this.info.api + "/channels/" + this.channel.id + "/messages/" + this.id, {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify({content})
		})
	}
	delete() {
		fetch(this.info.api + "/channels/" + this.channel.id + "/messages/" + this.id, {
			method: "DELETE",
			headers: this.headers
		})
	}
	deleteEvent() {
		if (this.div) {
			this.div.innerHTML = ""
			this.div = null
		}

		const prev = this.channel.idToPrev.get(this.snowflake)
		const next = this.channel.idToNext.get(this.snowflake)
		this.channel.idToNext.set(prev, next)
		this.channel.idToPrev.set(next, prev)
		this.channel.messageids.delete(this.snowflake)

		const regen = prev.getObject()
		if (regen) regen.generateMessage()
		if (this.channel.lastmessage === this) this.channel.lastmessage = prev.getObject()
	}
	generateMessage(premessage = null) {
		if (!premessage) premessage = this.channel.idToPrev.get(this.snowflake)?.getObject()

		const div = this.div
		if (this === this.channel.replyingto) div.classList.add("replying")
		div.innerHTML = ""

		const build = document.createElement("div")
		build.classList.add("flexltr")

		if (this.message_reference) {
			const replyline = document.createElement("div")
			const line = document.createElement("hr")

			const minipfp = document.createElement("img")
			minipfp.alt = ""
			minipfp.classList.add("replypfp")
			replyline.appendChild(line)
			replyline.appendChild(minipfp)

			const username = document.createElement("span")
			username.classList.add("username")
			replyline.appendChild(username)
			this.author.contextMenuBind(username, this.guild)

			const reply = document.createElement("div")
			reply.classList.add("replytext")
			replyline.appendChild(reply)

			const line2 = document.createElement("hr")
			replyline.appendChild(line2)
			line2.classList.add("reply")
			line.classList.add("startreply")
			replyline.classList.add("replyflex")

			this.channel.getmessage(this.message_reference.message_id).then(message => {
				const author = User.checkuser(message.author, this.localuser)

				reply.appendChild(message.content.makeHTML({stdsize: true}))

				minipfp.crossOrigin = "anonymous"
				minipfp.src = author.getpfpsrc()
				author.contextMenuBind(minipfp, this.guild)
				username.textContent = author.username
				author.contextMenuBind(username, this.guild)
			})

			reply.addEventListener("click", () => {
				this.channel.infinite.focus(this.message_reference.message_id)
			})
			div.appendChild(replyline)
		}

		build.classList.add("message")
		div.appendChild(build)
		if ({ 0: true, 19: true }[this.type] || this.attachments.length > 0) {
			const pfpRow = document.createElement("div")
			pfpRow.classList.add("flexltr", "pfprow")

			let pfpparent, current
			if (premessage) {
				pfpparent ??= premessage
				let pfpparent2 = pfpparent.all
				pfpparent2 ??= pfpparent
				const old = new Date(pfpparent2.timestamp).getTime() / 1000
				const next = new Date(this.timestamp).getTime() / 1000
				current = (next - old) > 600
			}

			const combine = premessage?.author?.snowflake != this.author.snowflake || current || this.message_reference
			if (combine) {
				const pfp = this.author.buildpfp()
				this.author.contextMenuBind(pfp, this.guild, false)
				pfpRow.appendChild(pfp)
			} else div.pfpparent = pfpparent

			build.appendChild(pfpRow)
			const text = document.createElement("div")
			text.classList.add("flexttb")

			const texttxt = document.createElement("div")
			texttxt.classList.add("flexttb", "commentrow")
			text.appendChild(texttxt)

			if (combine) {
				const username = document.createElement("span")
				username.classList.add("username")
				this.author.contextMenuBind(username, this.guild)

				username.textContent = this.author.username
				const userwrap = document.createElement("div")
				userwrap.classList.add("flexltr", "message-header")
				userwrap.appendChild(username)

				if (this.author.bot) {
					const botTag = document.createElement("span")
					botTag.classList.add("bot")
					botTag.textContent = "BOT"
					userwrap.appendChild(botTag)
				}

				const time = document.createElement("span")
				time.textContent = formatTime(new Date(this.timestamp))
				time.classList.add("timestamp")
				userwrap.appendChild(time)

				texttxt.appendChild(userwrap)
				div.classList.add("topMessage")
			} else div.classList.remove("topMessage")

			const messaged = this.content.makeHTML()
			div.txt = messaged
			const messagedwrap = document.createElement("div")
			messagedwrap.classList.add("flexttb")
			if (this.edited_timestamp) {
				const edited = document.createElement("small")
				edited.classList.add("edited")
				edited.textContent = "(edited)"
				edited.title = "Edited " + formatTime(new Date(this.edited_timestamp))
				messaged.appendChild(edited)
			}
			messagedwrap.appendChild(messaged)
			texttxt.appendChild(messagedwrap)

			build.appendChild(text)

			if (this.attachments && this.attachments.length > 0) {
				const attach = document.createElement("div")
				attach.classList.add("flexltr")
				for (const thing of this.attachments) attach.appendChild(thing.getHTML())
				texttxt.appendChild(attach)
			}

			if (this.embeds && this.embeds.length > 0 && this.localuser.settings.render_embeds) {
				const embeds = document.createElement("div")
				embeds.classList.add("flexltr")
				for (const thing of this.embeds) {
					embeds.appendChild(thing.generateHTML())
				}
				texttxt.appendChild(embeds)
			}

			if (this.components && this.components.length > 0) {
				const components = document.createElement("div")
				components.classList.add("flexltr")
				for (const thing of this.components) {
					components.appendChild(thing.generateHTML())
				}
				texttxt.appendChild(components)
			}
		} else if (this.type == 7) {
			const text = document.createElement("div")
			text.classList.add("flexttb")

			const texttxt = document.createElement("div")
			texttxt.classList.add("flexltr")
			text.appendChild(texttxt)
			build.appendChild(text)

			const messaged = document.createElement("span")
			div.txt = messaged
			messaged.textContent = "welcome: "
			texttxt.appendChild(messaged)

			const username = document.createElement("span")
			username.classList.add("username")
			username.textContent = this.author.username
			this.author.contextMenuBind(username, this.guild)
			texttxt.appendChild(username)

			const time = document.createElement("span")
			time.textContent = formatTime(new Date(this.timestamp))
			time.classList.add("timestamp")
			texttxt.append(time)
			div.classList.add("topMessage")
		}
		div.all = this

		const reactions = document.createElement("div")
		reactions.classList.add("flexltr", "reactiondiv")
		this.reactdiv = new WeakRef(reactions)
		this.updateReactions()
		div.append(reactions)

		return div
	}
	updateReactions() {
		if (!this.localuser.settings.render_reactions) return

		const reactdiv = this.reactdiv.deref()
		if (!reactdiv) return

		const snapBottom = this.channel.infinite.snapBottom()

		reactdiv.innerHTML = ""
		for (const thing of this.reactions) {
			const reactionContainer = document.createElement("div")
			reactionContainer.classList.add("reaction")
			if (thing.me) reactionContainer.classList.add("meReacted")

			const count = document.createElement("span")
			count.textContent = thing.count
			count.classList.add("reactionCount")
			reactionContainer.appendChild(count)

			if (thing.emoji.id) {
				const emo = new Emoji(thing.emoji, this.guild)
				const emoji = emo.getHTML(false)
				reactionContainer.appendChild(emoji)
			} else reactionContainer.appendChild(MarkDown.renderTwemoji(thing.emoji.name))

			reactdiv.appendChild(reactionContainer)
			reactionContainer.addEventListener("click", () => {
				this.reactionToggle(thing.emoji.name)
			})
		}

		snapBottom()
	}
	giveReaction(data, member) {
		for (const thing of this.reactions) {
			if (thing.emoji.name == data.name) {
				thing.count++
				if (member.id == this.localuser.user.id) {
					thing.me = true
					this.updateReactions()
					return
				}
			}
		}
		this.reactions.push({
			count: 1,
			emoji: data,
			me: member.id == this.localuser.user.id
		})
		this.updateReactions()
	}
	takeReaction(data, id) {
		for (const i in this.reactions) {
			const thing = this.reactions[i]
			if (thing.emoji.name == data.name) {
				thing.count--
				if (thing.count == 0) {
					this.reactions.splice(i, 1)
					this.updateReactions()
					return
				}
				if (this.localuser.user.id == id) {
					thing.me = false
					this.updateReactions()
					return
				}
			}
		}
	}
	buildhtml(premessage) {
		if (this.div) {
			console.error(`HTML for ${this.id} already exists, aborting`)
			return
		}

		try {
			const div = document.createElement("div")
			this.div = div
			this.messageevents(div)
			return this.generateMessage(premessage)
		} catch (e) {
			console.error(e)
		}
	}
}

Message.setup()
