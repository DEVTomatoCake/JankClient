"use strict"

class User {
	static contextmenu = new Contextmenu()
	static setUpContextMenu() {
		this.contextmenu.addbutton("Copy user id", function() {
			navigator.clipboard.writeText(this.id)
		}, null, owner => owner.localuser.settings.developer_mode)

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
	async getUserProfile() {
		const res = await fetch(this.info.api + "/users/" + this.id.replace("#clone", "") + "/profile?with_mutual_guilds=true&with_mutual_friends=true", {
			headers: this.localuser.headers
		})
		return await res.json()
	}
	resolving = false
	async getBadge(id) {
		if (this.localuser.badges.has(id)) return this.localuser.badges.get(id)

		if (this.resolving) {
			await this.resolving
			return this.localuser.badges.get(id)
		}
		const prom = await this.getUserProfile()
		this.resolving = prom
		const badges = prom.badges
		this.resolving = false
		for (const thing of badges) {
			this.localuser.badges.set(thing.id, thing)
		}
		return this.localuser.badges.get(id)
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
	getPresence(presence) {
		if (presence) this.setstatus(presence.status)
		else this.setstatus("offline")
	}
	setstatus(status) {
		this.status = status
	}
	async getStatus() {
		if (this.status) return this.status
		return "offline"
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
	async buildstatuspfp() {
		const div = document.createElement("div")
		div.style.position = "relative"
		const pfp = this.buildpfp()
		div.append(pfp)
		{
			const status = document.createElement("div")
			status.classList.add("statusDiv")
			switch (await this.getStatus()) {
				case "offline":
					status.classList.add("offlinestatus")
					break
				default:
					status.classList.add("onlinestatus")
					break
			}
			div.append(status)
		}
		return div
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
		return this.info.cdn + "/avatars/" + this.id.replace("#clone", "") + "/" + this.avatar + ".png?size=64"
	}
	async buildprofile(x, y, guild) {
		if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()

		const div = document.createElement("div")
		div.classList.add("profile", "flexttb")
		if (this.accent_color) div.style.setProperty("--accent_color", "#" + this.accent_color.toString(16).padStart(6, "0"))
		else div.style.setProperty("--accent_color", "transparent")

		const topContainer = document.createElement("div")
		topContainer.classList.add("profileTop")

		if (this.banner) {
			const banner = document.createElement("img")
			let src
			if (this.hypotheticalbanner) src = this.banner
			else src = this.info.cdn + "/avatars/" + this.id.replace("#clone", "") + "/" + this.banner + ".png"

			banner.src = src
			banner.classList.add("banner")
			topContainer.appendChild(banner)
		}

		if (x == -1) {
			div.classList.add("hypoprofile")
			this.setstatus("online")
		} else {
			div.style.left = x + "px"
			div.style.top = y + "px"
		}

		const pfp = await this.buildstatuspfp()
		topContainer.appendChild(pfp)

		div.appendChild(topContainer)

		const badgediv = document.createElement("div")
		badgediv.classList.add("badges")
		if (this.badge_ids) {
			for (const id of this.badge_ids) {
				this.getBadge(id).then(badgejson => {
					const badge = document.createElement(badgejson.link ? "a" : "span")
					badge.classList.add("badge")
					if (badgejson.link) badge.href = badgejson.link

					const img = document.createElement("img")
					img.crossOrigin = "anonymous"
					img.src = badgejson.icon
					img.loading = "lazy"
					badge.append(img)

					const span = document.createElement("p")
					span.textContent = badgejson.description
					badge.append(span)

					badgediv.append(badge)
				})
			}
		}

		const userbody = document.createElement("div")
		userbody.classList.add("infosection")

		const usernamehtml = document.createElement("h2")
		usernamehtml.textContent = this.username
		userbody.appendChild(usernamehtml)
		userbody.appendChild(badgediv)

		const discrimatorhtml = document.createElement("h3")
		discrimatorhtml.classList.add("tag")
		discrimatorhtml.textContent = this.username + "#" + this.discriminator
		userbody.appendChild(discrimatorhtml)

		const pronounshtml = document.createElement("p")
		pronounshtml.textContent = this.pronouns
		pronounshtml.classList.add("pronouns")
		userbody.appendChild(pronounshtml)

		userbody.appendChild(document.createElement("hr"))
		userbody.appendChild(this.bio.makeHTML())

		if (guild) await Member.resolveMember(this, guild).then(member => {
			if (!member) return

			const roles = document.createElement("div")
			roles.classList.add("rolesbox")
			for (const role of member.roles) {
				const roleContainer = document.createElement("div")
				roleContainer.classList.add("rolediv")

				const color = document.createElement("div")
				color.style.setProperty("--role-color", "#" + role.color.toString(16).padStart(6, "0"))
				color.classList.add("colorrolediv")
				roleContainer.append(color)

				const span = document.createElement("span")
				span.textContent = role.name
				roleContainer.append(span)

				roles.append(roleContainer)
			}
			userbody.append(roles)
		})

		if (this.bio.txt.length > 0) userbody.appendChild(document.createElement("hr"))
		const noteInput = document.createElement("input")
		noteInput.placeholder = "Add a note"

		if (this.localuser.noteCache.has(this.id)) noteInput.value = this.localuser.noteCache.get(this.id)
		else {
			fetch(this.info.api + "/users/@me/notes/" + this.id, {
				headers: this.localuser.headers
			}).then(async res => {
				if (res.ok) {
					const noteJSON = await res.json()
					noteInput.value = noteJSON.note

					this.localuser.noteCache.set(this.id, noteJSON.note)
				} else this.localuser.noteCache.set(this.id, "")

				setTimeout(() => this.localuser.noteCache.delete(this.id), 1000 * 60 * 2)
			}).catch(() => {})
		}

		noteInput.addEventListener("change", async () => {
			await fetch(this.info.api + "/users/@me/notes/" + this.id, {
				method: "PUT",
				headers: this.localuser.headers,
				body: JSON.stringify({
					note: noteInput.value.trim()
				})
			})
		})
		userbody.appendChild(noteInput)

		div.appendChild(userbody)
		if (x != -1) {
			if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()

			document.body.appendChild(div)
			Contextmenu.currentmenu = div
			Contextmenu.keepOnScreen(div)
		}
		return div
	}
	profileclick(obj, guild) {
		obj.addEventListener("click", event => {
			event.stopPropagation()
			this.buildprofile(event.clientX, event.clientY, guild)
		})
	}
	contextMenuBind(html, guild, error = true) {
		if (guild && guild.id != "@me") {
			Member.resolveMember(this, guild).then(member => {
				if (member === void 0 && error) {
					const errorElem = document.createElement("span")
					errorElem.textContent = "!"
					errorElem.classList.add("membererror")
					html.after(errorElem)
					return
				}
				if (member) member.contextMenuBind(html)
			})
		}

		this.profileclick(html, guild)
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
