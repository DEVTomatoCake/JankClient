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
		})

		Message.contextmenu.addbutton("React", function() {
			this.react()
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
		this.type = messagejson.type
		this.id = messagejson.id
		this.author = User.checkuser(messagejson.author, this.localuser)
		this.member = messagejson.member
		this.content = new MarkDown(messagejson.content, this.channel)
		this.tts = messagejson.tts
		this.timestamp = messagejson.timestamp
		this.edited_timestamp = messagejson.edited_timestamp
		this.message_reference = messagejson.message_reference
		this.channel_id = messagejson.channel_id
		this.guild_id = messagejson.guild_id
		this.mention_everyone = messagejson.mention_everyone
		this.pinned = messagejson.pinned
		this.reactions = messagejson.reactions

		this.attachments = []
		for (const thing of messagejson.attachments) {
			this.attachments.push(new Attachment(thing, this))
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

		if (messagejson.reactions) {
			this.reactions = []
			for (const thing of messagejson.reactions) {
				this.reactions.push(new Reaction(thing, this))
			}
		}

		this.mentions = []
		for (const thing of messagejson.mentions) {
			this.mentions.push(new User(thing, this.localuser))
		}

		this.mention_roles = []
		for (const thing of messagejson.mention_roles) {
			this.mention_roles.push(new Role(thing, this))
		}

		if (this.div) this.generateMessage()
	}
	canDelete() {
		return this.channel.hasPermission("MANAGE_MESSAGES") || this.author.id == this.localuser.user.id
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
	messageevents(obj, del = Message.del) {
		const func = Message.contextmenu.bind(obj, this)
		this.div = obj
		del.then(() => {
			obj.removeEventListener("click", func)
			this.div.remove()
			this.div = null
		})
		obj.classList.add("messagediv")
	}
	mentionsuser(userd) {
		if (userd instanceof User) return this.mentions.includes(userd)
		if (userd instanceof Member) return this.mentions.includes(userd.user)
	}
	getimages() {
		const build = []
		for (const thing of this.attachments) {
			if (thing.content_type.startsWith("image/")) {
				build.push(thing)
			}
		}
		return build
	}
	async edit(content) {
		return await fetch(instance.api + "/channels/" + this.channel.id + "/messages/" + this.id, {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify({content})
		})
	}
	delete() {
		fetch(instance.api + "/channels/" + this.channel.id + "/messages/" + this.id, {
			method: "DELETE",
			headers: this.headers
		})
	}
	deleteEvent() {
		if (this.div) {
			this.div.innerHTML = ""
			this.div = null
		}

		const prev = this.channel.idToPrev.get(this.id)
		const next = this.channel.idToNext.get(this.id)
		this.channel.idToNext.set(prev, next)
		this.channel.idToPrev(next, prev)
		this.channel.messageids.delete(this.id)

		const regen = this.channel.messageids.get(prev)
		if (regen) regen.generateMessage()
		if (this.channel.lastmessage === this) this.channel.lastmessage = this.channel.messageids[prev]
	}
	react(emoji = "🎭") {
		fetch(instance.api + "/channels/" + this.channel.id + "/messages/" + this.id + "/reactions/" + emoji + "/@me", {
			method: "PUT",
			headers: this.headers
		})
	}
	generateMessage(premessage = null) {
		if (!premessage) premessage = this.channel.messageids.get(this.channel.idToNext[this.id])

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
			this.author.contextMenuBind(username)

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
				author.contextMenuBind(minipfp)
				username.textContent = author.username
				author.contextMenuBind(username)
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
				const newt = new Date(this.timestamp).getTime() / 1000
				current = (newt - old) > 600
			}

			const combine = premessage?.author?.id != this.author.id || current || this.message_reference
			if (combine) {
				const pfp = this.author.buildpfp()
				this.author.contextMenuBind(pfp)
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
				this.author.contextMenuBind(username)

				this.author.profileclick(username)
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
			messagedwrap.appendChild(messaged)
			texttxt.appendChild(messagedwrap)

			build.appendChild(text)
			if (this.attachments && this.attachments.length > 0) {
				const attach = document.createElement("div")
				attach.classList.add("flexltr")
				for (const thing of this.attachments) attach.appendChild(thing.getHTML())
				texttxt.appendChild(attach)
			}

			if (this.embeds && this.embeds.length > 0) {
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

			if (this.reactions && this.reactions.length > 0) {
				const reactions = document.createElement("div")
				reactions.classList.add("flexltr")
				for (const thing of this.reactions) {
					reactions.appendChild(thing.generateHTML())
				}
				texttxt.appendChild(reactions)
			}
		} else if (this.type == 7) {
			const text = document.createElement("div")
			text.classList.add("flexttb")

			const texttxt = document.createElement("div")
			texttxt.classList.add("flexltr")
			text.appendChild(texttxt)
			build.appendChild(text)

			const messaged = document.createElement("p")
			div.txt = messaged
			messaged.textContent = "welcome: " + this.author.username
			texttxt.appendChild(messaged)

			const time = document.createElement("span")
			time.textContent = formatTime(new Date(this.timestamp))
			time.classList.add("timestamp")
			texttxt.append(time)
			div.classList.add("topMessage")
		}
		div.all = this
		return div
	}
	buildhtml(premessage, del = Message.del) {
		if (this.div) {
			console.error(`HTML for ${this.id} already exists, aborting`)
			return
		}

		const div = document.createElement("div")
		this.div = div
		this.messageevents(div, del)
		return this.generateMessage(premessage)
	}
}

Message.setup()
