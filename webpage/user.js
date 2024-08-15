"use strict"

class User {
	static contextmenu = new Contextmenu()
	static setUpContextMenu() {
		this.contextmenu.addbutton("Copy user id", function() {
			navigator.clipboard.writeText(this.id)
		}, null, owner => owner.localuser.settings.developerMode)

		this.contextmenu.addbutton("Message user", function() {
			fetch(this.info.api + "/users/@me/channels", {
				method: "POST",
				headers: this.localuser.headers,
				body: JSON.stringify({
					recipients: [this.id]
				})
			})
		})
	}

	static userids = {}
	static clear() {
		this.userids = {}
	}
	static checkuser(userjson, owner) {
		if (User.userids[userjson.id]) return User.userids[userjson.id]

		const tempuser = new User(userjson, owner)
		User.userids[userjson.id] = tempuser
		return tempuser
	}
	get info() {
		return this.owner.info
	}
	get localuser() {
		return this.owner
	}
	get id() {
		return this.snowflake.id
	}

	constructor(userjson, owner) {
		this.owner = owner
		if (!owner) console.error("missing localuser")

		for (const thing of Object.keys(userjson)) {
			if (thing == "bio") {
				this.bio = new MarkDown(userjson[thing], this.localuser)
				continue
			}
			if (thing == "id") {
				this.snowflake = new SnowFlake(userjson[thing], this)
				continue
			}

			this[thing] = userjson[thing]
		}
		this.hypotheticalpfp = false
	}
	async resolvemember(guild) {
		return await Member.resolveMember(this, guild)
	}
	members = new WeakMap()
	clone() {
		return new User({
			username: this.username,
			id: this.id + "#clone",
			public_flags: this.public_flags,
			discriminator: this.discriminator,
			avatar: this.avatar,
			accent_color: this.accent_color,
			banner: this.banner,
			bio: this.bio.rawString,
			premium_since: this.premium_since,
			premium_type: this.premium_type,
			bot: this.bot,
			theme_colors: this.theme_colors,
			pronouns: this.pronouns,
			badge_ids: this.badge_ids
		}, this.owner)
	}
	buildpfp() {
		const pfp = document.createElement("img")
		pfp.crossOrigin = "anonymous"
		pfp.src = this.getpfpsrc()
		pfp.alt = ""
		pfp.classList.add("pfp")
		pfp.classList.add("userid:" + this.id)
		return pfp
	}
	userupdate(json) {
		if (json.avatar != this.avatar) this.changepfp(json.avatar)
	}
	changepfp(update) {
		this.avatar = update
		this.hypotheticalpfp = false
		const src = this.getpfpsrc()
		for (const thing of document.getElementsByClassName("userid:" + this.id)) thing.src = src
	}
	getpfpsrc() {
		if (this.hypotheticalpfp) return this.avatar

		if (this.avatar === null) return this.info.cdn + "/embed/avatars/" + ((this.id >>> 22) % 6) + ".png?size=64"
		return this.info.cdn + "/avatars/" + this.id + "/" + this.avatar + ".png?size=64"
	}
	noteCache = new Map()
	async buildprofile(x, y, type = "author") {
		if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()

		let nickname, username, discriminator, bio, pronouns
		if (type == "author") {
			username = this.username
			nickname = this.username

			bio = this.bio
			discriminator = this.discriminator
			pronouns = this.pronouns
		}

		const div = document.createElement("div")
		if (x == -1) div.classList.add("hypoprofile", "flexttb")
		else {
			div.style.left = x + "px"
			div.style.top = y + "px"
			div.classList.add("profile", "flexttb")
		}

		const pfp = this.buildpfp()
		div.appendChild(pfp)

		const userbody = document.createElement("div")
		userbody.classList.add("infosection")
		div.appendChild(userbody)
		const usernamehtml = document.createElement("h2")
		usernamehtml.textContent = nickname
		userbody.appendChild(usernamehtml)

		const discrimatorhtml = document.createElement("h3")
		discrimatorhtml.classList.add("tag")
		discrimatorhtml.textContent = username + "#" + discriminator
		userbody.appendChild(discrimatorhtml)

		const pronounshtml = document.createElement("p")
		pronounshtml.textContent = pronouns
		pronounshtml.classList.add("pronouns")
		userbody.appendChild(pronounshtml)

		userbody.appendChild(document.createElement("hr"))
		userbody.appendChild(bio.makeHTML())

		if (bio.txt.length > 0) userbody.appendChild(document.createElement("hr"))
		const noteInput = document.createElement("input")
		noteInput.placeholder = "Add a note"

		if (this.noteCache.has(this.id)) noteInput.value = this.noteCache.get(this.id)
		else {
			fetch(this.info.api + "/users/@me/notes/" + this.id, {
				headers: this.localuser.headers
			}).then(async res => {
				if (res.ok) {
					const noteJSON = await res.json()
					noteInput.value = noteJSON.note

					this.noteCache.set(this.id, noteJSON.note)
					setTimeout(() => this.noteCache.delete(this.id), 1000 * 60 * 2)
				}
			}).catch(() => {})
		}

		noteInput.addEventListener("change", async () => {
			await fetch(this.info.api + "/users/@me/notes/" + this.id, {
				method: "PUT",
				headers: this.localuser.headers,
				body: JSON.stringify({
					note: noteInput.value
				})
			})
			this.noteCache.set(this.id, noteInput.value)
		})
		userbody.appendChild(noteInput)

		if (x != -1) {
			if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()

			document.body.appendChild(div)
			Contextmenu.currentmenu = div
			Contextmenu.keepOnScreen(div)
		}
		return div
	}
	profileclick(obj, author) {
		obj.addEventListener("click", event => {
			event.stopPropagation()
			this.buildprofile(event.clientX, event.clientY, author)
		})
	}
	contextMenuBind(html, guild) {
		if (guild && guild.id != "@me") {
			Member.resolveMember(this, guild).then(m => {
				if (m === void 0) {
					const error = document.createElement("span")
					error.textContent = "!"
					error.classList.add("membererror")
					html.after(error)
					return
				}
				m.contextMenuBind(html)
			})
		}

		this.profileclick(html)
		User.contextmenu.bind(html, this)
	}
	static async resolve(id, localuser) {
		const res = await fetch(this.info.api + "/users/" + id + "/profile", {
			headers: localuser.headers
		})
		return new User(await res.json(), localuser)
	}
}

User.setUpContextMenu()
