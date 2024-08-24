"use strict"

const makeTime = date => date.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" })
const formatTime = (date, locale = "en-US", compactLayout = false) => {
	if (compactLayout) return makeTime(date)

	const now = new Date()
	const sameDay = date.getDate() == now.getDate() &&
		date.getMonth() == now.getMonth() &&
		date.getFullYear() == now.getFullYear()
	if (sameDay) return (locale == "de-DE" ? "heute um" : "Today at") + " " + makeTime(date)

	const yesterday = new Date(now)
	yesterday.setDate(now.getDate() - 1)
	const isYesterday = date.getDate() == yesterday.getDate() &&
		date.getMonth() == yesterday.getMonth() &&
		date.getFullYear() == yesterday.getFullYear()
	if (isYesterday) return (locale == "de-DE" ? "gestern um" : "Yesterday at") + " " + makeTime(date)

	return date.toLocaleDateString(locale == "de-DE" ? "de-DE" : void 0, locale == "de-DE" ? {year: "numeric", month: "2-digit", day: "2-digit"} : void 0) +
		" " + (locale == "de-DE" ? "um" : "at") + " " + makeTime(date)
}

const undeleteableTypes = new Set([1, 2, 3, 4, 5, 21])

class Message {
	static setup() {
		this.del = new Promise(resolve => {
			this.resolve = resolve
		})
		Message.setupcmenu()
	}

	static contextmenu = new Contextmenu()
	static setupcmenu() {
		Message.contextmenu.addbutton("Copy raw text", (event, msg) => {
			navigator.clipboard.writeText(msg.content.rawString)
		})
		Message.contextmenu.addbutton("Reply", (event, msg) => {
			msg.channel.setReplying(msg)
		})

		Message.contextmenu.addbutton("Copy message id", (event, msg) => {
			navigator.clipboard.writeText(msg.id)
		}, null, msg => msg.localuser.settings.developer_mode)

		Message.contextmenu.addsubmenu("Add reaction", (event, msg) => {
			Emoji.emojiPicker(event.x, event.y, msg.localuser).then(emoji => {
				msg.reactionToggle(emoji)
			})
		})

		Message.contextmenu.addsubmenu("Mark as unread", (event, msg) => {
			fetch(msg.info.api + "/channels/" + msg.channel.id + "/messages/" + msg.id + "/ack", {
				method: "POST",
				headers: msg.headers,
				body: JSON.stringify({
					manual: true
				})
			})
			msg.channel.lastreadmessageid = msg.snowflake
		}, null, msg => msg.channel.lastmessage.id != msg.id)

		Message.contextmenu.addbutton("Edit", (event, msg) => {
			msg.channel.editing = msg

			const markdown = document.getElementById("typebox").markdown
			markdown.txt = msg.content.rawString.split("")
			markdown.boxupdate(document.getElementById("typebox"))
		}, null, m => m.author.id == m.localuser.user.id)

		Message.contextmenu.addbutton("Delete message", (event, msg) => {
			msg.delete()
		}, null, msg => msg.canDelete())

		Message.contextmenu.addbutton("Pin message", (event, msg) => {
			fetch(msg.info.api + "/channels/" + msg.channel.id + "/pins/" + msg.id, {
				method: "PUT",
				headers: msg.headers,
				body: JSON.stringify({})
			})
		}, null, msg => msg.channel.hasPermission("MANAGE_MESSAGES") && !msg.pinned)
		Message.contextmenu.addbutton("Unpin message", (event, msg) => {
			fetch(msg.info.api + "/channels/" + msg.channel.id + "/pins/" + msg.id, {
				method: "DELETE",
				headers: msg.headers,
				body: JSON.stringify({})
			})
		}, null, msg => msg.channel.hasPermission("MANAGE_MESSAGES") && msg.pinned)
	}

	constructor(messagejson, owner) {
		this.owner = owner
		this.headers = this.owner.headers

		this.giveData(messagejson)
		this.owner.messages.set(this.id, this)
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
			for (const thing of messagejson.attachments) this.attachments.push(new Attachment(thing, this))
		}

		if (messagejson.embeds) {
			this.embeds = []
			for (const thing of messagejson.embeds) this.embeds.push(new Embed(thing, this))
		}

		if (messagejson.components) {
			this.components = []
			for (const thing of messagejson.components) this.components.push(new Component(thing, this))
		}

		if (messagejson.mentions) {
			this.mentions = []
			for (const thing of messagejson.mentions) this.mentions.push(new User(thing, this.localuser))
		}

		if (messagejson.mention_roles) {
			this.mention_roles = []
			for (const thing of messagejson.mention_roles) this.mention_roles.push(new Role(thing, this))
		}

		if (!this.member && this.guild.id != "@me") {
			this.author.resolvemember(this.guild).then(member => {
				this.member = member
			})
		}

		if (this.div) this.generateMessage()

		snapBottom()
	}
	canDelete() {
		return !undeleteableTypes.has(this.type) && (this.channel.hasPermission("MANAGE_MESSAGES") || (this.author.snowflake === this.localuser.user.snowflake && this.type != 24))
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
		for (const reaction of this.reactions) {
			if (reaction.emoji.name == emoji) {
				remove = reaction.me
				break
			}
		}
		fetch(this.info.api + "/channels/" + this.channel.id + "/messages/" + this.id + "/reactions/" +
			encodeURIComponent(typeof emoji == "string" ? emoji : (emoji.name + ":" + emoji.id)) + "/@me", {
			method: remove ? "DELETE" : "PUT",
			headers: this.headers
		})
	}
	messageevents(obj) {
		Message.contextmenu.bindContextmenu(obj, this)
		this.div = obj
		obj.classList.add("messagediv")
	}
	deleteDiv() {
		if (!this.div) return

		try {
			this.div.remove()
			this.div = void 0
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
		for (const attachment of this.attachments) {
			if (attachment.content_type.startsWith("image/")) build.push(attachment)
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
			this.div = void 0
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
	blockedPropigate() {
		const premessage = this.channel.idToPrev.get(this.snowflake)?.getObject()
		if (premessage?.author === this.author) premessage.blockedPropigate()
		else this.generateMessage()
	}
	generateMessage(premessage, ignoredblock = false) {
		if (!this.div) return
		if (!premessage) premessage = this.channel.idToPrev.get(this.snowflake)?.getObject()

		const div = this.div
		div.classList.remove("zeroheight")
		div.innerHTML = ""

		const compactLayout = this.localuser.settings.message_display_compact

		const build = document.createElement("div")
		build.classList.add("message", "flexltr")

		if (this === this.channel.replyingto) div.classList.add("replying")

		if (this.author.relationshipType == 2) {
			if (ignoredblock) {
				if (premessage?.author !== this.author) {
					const span = document.createElement("span")
					span.classList.add("blocked")
					span.textContent = "You have blocked this user, click to hide these messages."
					div.append(span)
					span.onclick = () => {
						const scroll = this.channel.infinite.scrollTop
						let next = this
						while (next?.author === this.author) {
							next.generateMessage()
							next = this.channel.idToNext.get(next.snowflake)?.getObject()
						}
						if (this.channel.infinite.scroll && scroll) this.channel.infinite.scroll.scrollTop = scroll
					}
				}
			} else {
				div.classList.remove("topMessage")
				if (premessage?.author === this.author) {
					div.classList.add("zeroheight")
					premessage.blockedPropigate()
					div.appendChild(build)
					return div
				} else {
					build.classList.add("blocked", "topMessage")

					let count = 1
					let next = this.channel.idToNext.get(this.snowflake)?.getObject()
					while (next?.author === this.author) {
						count++
						next = this.channel.idToNext.get(next.snowflake)?.getObject()
					}

					const span = document.createElement("span")
					span.textContent = "You have blocked this user, click to show " + count + " blocked messages."
					span.onclick = () => {
						const scroll = this.channel.infinite.scrollTop
						const func = this.channel.infinite.snapBottom()

						let next2 = this
						while (next2?.author === this.author) {
							next2.generateMessage(void 0, true)
							next2 = this.channel.idToNext.get(next2.snowflake)?.getObject()
						}
						if (this.channel.infinite.scroll && scroll) {
							func()
							this.channel.infinite.scroll.scrollTop = scroll
						}
					}
					build.append(span)

					div.appendChild(build)
					return div
				}
			}
		}

		if (this.message_reference) {
			const replyline = document.createElement("div")
			replyline.classList.add("replyflex")

			const line = document.createElement("hr")
			line.classList.add("startreply")
			replyline.appendChild(line)

			const minipfp = document.createElement("img")
			if (!compactLayout) {
				minipfp.crossOrigin = "anonymous"
				minipfp.alt = ""
				minipfp.classList.add("replypfp")
				replyline.appendChild(minipfp)
			}

			const username = document.createElement("span")
			username.classList.add("username")
			replyline.appendChild(username)

			const reply = document.createElement("div")
			reply.classList.add("replytext")
			replyline.appendChild(reply)

			this.channel.getmessage(this.message_reference.message_id).then(message => {
				const author = User.checkuser(message.author, this.localuser)

				if (message.author.relationshipType == 2) {
					const blocked = document.createElement("i")
					blocked.classList.add("blocked")
					blocked.textContent = "You have blocked this user. Click here to still see the message."
					blocked.addEventListener("click", () => {
						blocked.remove()
						reply.classList.remove("user-blocked")
					})
					replyline.appendChild(blocked)

					reply.classList.add("user-blocked")
				}

				reply.appendChild(message.content.makeHTML({stdsize: true}))

				if (!compactLayout) {
					minipfp.src = author.getpfpsrc()
					author.contextMenuBind(minipfp, this.guild)
				}

				username.textContent = author.username
				author.contextMenuBind(username, this.guild)
			})

			reply.addEventListener("click", () => {
				this.channel.infinite.focus(this.message_reference.message_id)
			})
			div.appendChild(replyline)
		}

		if (this.type == 0 || this.type == 19 || this.attachments.length > 0) {
			const pfpRow = document.createElement("div")
			pfpRow.classList.add("flexltr", "pfprow")

			let pfpparent
			let current
			if (premessage) {
				pfpparent ??= premessage
				let pfpparent2 = pfpparent.all
				pfpparent2 ??= pfpparent
				const old = new Date(pfpparent2.timestamp).getTime() / 1000
				const next = new Date(this.timestamp).getTime() / 1000
				current = (next - old) > 60 * 8
			}

			const combine = current || this.message_reference || premessage?.author?.snowflake != this.author.snowflake || (premessage?.type != 0 && premessage?.type != 19)
			if (combine || compactLayout) {
				const pfp = this.author.buildpfp()
				this.author.contextMenuBind(pfp, this.guild, false)
				pfpRow.appendChild(pfp)
			} else div.pfpparent = pfpparent

			if (!compactLayout) build.appendChild(pfpRow)

			const text = document.createElement("div")
			text.classList.add("flexttb")

			const texttxt = document.createElement("div")
			texttxt.classList.add("flexttb", "commentrow")
			if (compactLayout) texttxt.classList.add("compact")

			if (combine || compactLayout) {
				const userwrap = document.createElement("div")
				userwrap.classList.add("flexltr", "message-header")

				const username = document.createElement("span")
				username.classList.add("username")
				username.textContent = this.member && this.member.nick ? this.member.nick : this.author.username
				this.author.contextMenuBind(username, this.guild)

				const time = document.createElement("span")
				time.textContent = formatTime(new Date(this.timestamp), this.localuser.settings.locale, compactLayout)
				time.classList.add("timestamp")
				if (compactLayout) userwrap.appendChild(time)

				userwrap.appendChild(username)

				if (this.author.bot) {
					const botTag = document.createElement("span")
					botTag.classList.add("bot")
					botTag.textContent = "BOT"
					userwrap.appendChild(botTag)
				}
				if (!compactLayout) userwrap.appendChild(time)

				texttxt.appendChild(userwrap)
				div.classList.add("topMessage")
				if (compactLayout) div.classList.add("compact")
			} else div.classList.remove("topMessage")

			text.appendChild(texttxt)

			const messagedwrap = document.createElement("div")
			messagedwrap.classList.add("flexttb")

			const messaged = this.content.makeHTML()
			div.txt = messaged
			if (this.edited_timestamp) {
				const edited = document.createElement("small")
				edited.classList.add("edited")
				edited.textContent = "(edited)"
				edited.title = "Edited " + formatTime(new Date(this.edited_timestamp), this.localuser.settings.locale, compactLayout)
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
			messaged.textContent = "Welcome new member: "
			texttxt.appendChild(messaged)

			const username = document.createElement("span")
			username.classList.add("username")
			username.textContent = this.author.username
			this.author.contextMenuBind(username, this.guild)
			texttxt.appendChild(username)

			const time = document.createElement("span")
			time.textContent = formatTime(new Date(this.timestamp), this.localuser.settings.locale, compactLayout)
			time.classList.add("timestamp")
			texttxt.append(time)
			div.classList.add("topMessage")
		} else console.warn("Cannot render message type " + this.type, this)

		div.appendChild(build)

		const reactions = document.createElement("div")
		reactions.classList.add("flexltr", "reactiondiv")
		this.reactdiv = new WeakRef(reactions)
		this.updateReactions()
		div.append(reactions)

		div.all = this
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
	reactionAdd(emoji, userId) {
		for (const reaction of this.reactions) {
			if ((reaction.emoji.id && reaction.emoji.id == emoji.id) || (!reaction.emoji.id && reaction.emoji.name == emoji.name)) {
				reaction.count++
				if (userId.id == this.localuser.user.id) {
					reaction.me = true
					this.updateReactions()
					return
				}
			}
		}

		this.reactions.push({
			count: 1,
			emoji,
			me: userId.id == this.localuser.user.id
		})
		this.updateReactions()
	}
	reactionRemove(emoji, userId) {
		for (const i in this.reactions) {
			const thing = this.reactions[i]
			if ((thing.emoji.id && thing.emoji.id == emoji.id) || (!thing.emoji.id && thing.emoji.name == emoji.name)) {
				thing.count--
				if (thing.count == 0) {
					this.reactions.splice(i, 1)
					this.updateReactions()
					return
				}

				if (this.localuser.user.id == userId) {
					thing.me = false
					this.updateReactions()
					return
				}
			}
		}
	}
	reactionRemoveAll() {
		this.reactions = []
		this.updateReactions()
	}
	reactionRemoveEmoji(emoji) {
		for (const i in this.reactions) {
			const thing = this.reactions[i]
			if ((thing.emoji.id && thing.emoji.id == emoji.id) || (!thing.emoji.id && thing.emoji.name == emoji.name)) {
				this.reactions.splice(i, 1)
				this.updateReactions()
				break
			}
		}
	}
	buildhtml(premessage) {
		if (this.div) {
			console.error("HTML for " + this.id + " already exists, aborting")
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
