"use strict"

class User {
	static contextmenu = new Contextmenu()
	static setUpContextMenu() {
		this.contextmenu.addbutton("Copy user id", (event, user) => {
			navigator.clipboard.writeText(user.id)
		}, null, owner => owner.localuser.settings.developer_mode)

		this.contextmenu.addbutton("Message user", (event, user) => {
			fetch(user.info.api + "/users/@me/channels", {
				method: "POST",
				headers: user.localuser.headers,
				body: JSON.stringify({
					recipients: [user.id]
				})
			})
		}, null, owner => owner.id != owner.localuser.user.id)

		this.contextmenu.addbutton("Block user", (event, user) => {
			fetch(user.info.api + "/users/@me/relationships/" + user.id, {
				method: "PUT",
				headers: user.localuser.headers,
				body: JSON.stringify({
					type: 2
				})
			})
		}, null, user => user.id != user.localuser.user.id && user.relationshipType != 2)
		this.contextmenu.addbutton("Unblock user", (event, user) => {
			fetch(user.info.api + "/users/@me/relationships/" + user.id, {
				method: "DELETE",
				headers: user.localuser.headers
			})
		}, null, user => user.id != user.localuser.user.id && user.relationshipType == 2)

		this.contextmenu.addbutton("Send friend request", (event, user) => {
			fetch(user.info.api + "/users/@me/relationships", {
				method: "POST",
				headers: user.localuser.headers,
				body: JSON.stringify({
					username: user.username,
					discriminator: user.discriminator
				})
			})
		}, null, user => user.id != user.localuser.user.id && !user.relationshipType)
		this.contextmenu.addbutton("Accept friend request", (event, user) => {
			fetch(user.info.api + "/users/@me/relationships/" + user.id, {
				method: "PUT",
				headers: user.localuser.headers,
				body: JSON.stringify({
					type: 1
				})
			})
		}, null, user => user.id != user.localuser.user.id && user.relationshipType == 3)

		this.contextmenu.addbutton("Remove friend", (event, user) => {
			fetch(user.info.api + "/users/@me/relationships/" + user.id, {
				method: "DELETE",
				headers: user.localuser.headers
			})
		}, null, user => user.id != user.localuser.user.id && user.relationshipType == 1)
		this.contextmenu.addbutton("Revoke friend request", (event, user) => {
			fetch(user.info.api + "/users/@me/relationships/" + user.id, {
				method: "DELETE",
				headers: user.localuser.headers
			})
		}, null, user => user.id != user.localuser.user.id && user.relationshipType == 4)

		// Member context menu
		this.contextmenu.addbutton("Change nickname", (event, member) => {
			let reason
			let newNick = member.nick
			const dialog = new Dialog(["vdiv",
				["textbox", "New nickname:", member.nick || "", e => {
					newNick = e.target.value
				}],
				["textbox", "Optional reason:", "", e => {
					reason = e.target.value
				}],
				["button", "", "Change nickname", () => {
					fetch(member.info.api + "/guilds/" + member.guild.id + "/members/" + member.id, {
						method: "PATCH",
						headers: {
							...member.localuser.headers,
							"X-Audit-Log-Reason": encodeURIComponent(reason)
						},
						body: JSON.stringify({
							nick: newNick || null
						})
					})
					dialog.hide()
				}]
			])
			dialog.show()
		}, null, (user, member) => member && member.guild && member.guild.member.hasPermission("MANAGE_NICKNAMES"))

		this.contextmenu.addbutton("Kick user", (event, member) => {
			member.kick()
		}, null, (user, member) => member && member.guild && member.guild.member.hasPermission("KICK_MEMBERS") && user.id != member.guild.member.user.id && user.id != member.guild.owner_id)

		this.contextmenu.addbutton("Ban user", (owner, member) => {
			member.ban()
		}, null, (user, member) => member && member.guild && member.guild.member.hasPermission("BAN_MEMBERS") && user.id != member.guild.member.user.id && user.id != member.guild.owner_id)
	}

	/**
	 * @param {User|userjson} userjson
	 * @param {LocalUser} owner
	 */
	static checkuser(userjson, owner) {
		if (owner.userMap.has(userjson.id)) return owner.userMap.get(userjson.id)

		const tempuser = new User(userjson, owner)
		owner.userMap.set(userjson.id, tempuser)
		return tempuser
	}

	nickname = null
	relationshipType = 0
	/**
	 * @param {userjson} userjson
	 * @param {LocalUser} owner
	 */
	constructor(userjson, owner) {
		this.owner = owner

		for (const key of Object.keys(userjson)) {
			if (key == "bio") {
				this.bio = new MarkDown(userjson[key], this.localuser)
				continue
			}
			if (key == "id") {
				this.snowflake = new SnowFlake(userjson[key], this)
				continue
			}

			this[key] = userjson[key]
		}
		this.hypotheticalpfp = false
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

	async getUserProfile() {
		const res = await fetch(this.info.api + "/users/" + this.id.replace("#clone", "") + "/profile?with_mutual_guilds=true&with_mutual_friends=true", {
			headers: this.localuser.headers
		})
		return await res.json()
	}
	resolvingBadge = false
	async getBadge(id) {
		if (this.localuser.badges.has(id)) return this.localuser.badges.get(id)

		if (this.resolvingBadge) {
			await this.resolvingBadge
			return this.localuser.badges.get(id)
		}

		const prom = this.getUserProfile()
		this.resolvingBadge = prom
		const resolved = await prom

		this.resolvingBadge = false
		for (const badge of resolved.badges) {
			this.localuser.badges.set(badge.id, badge)
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
	setPresence(presence) {
		if (presence) this.setstatus(presence.status)
		else this.setstatus("offline")
	}
	setstatus(status) {
		this.status = status
	}
	getStatus() {
		if (this.status) return this.status
		return "offline"
	}
	buildpfp() {
		const pfp = document.createElement("img")
		pfp.crossOrigin = "anonymous"
		pfp.src = this.getpfpsrc()
		pfp.alt = ""
		pfp.loading = "lazy"
		pfp.classList.add("pfp", "userid:" + this.id)
		return pfp
	}
	async buildstatuspfp() {
		const div = document.createElement("div")
		div.classList.add("pfpdiv")
		const pfp = this.buildpfp()
		div.append(pfp)

		const status = document.createElement("div")
		status.classList.add("statusDiv", this.getStatus() + "Status")
		div.append(status)

		return div
	}
	userupdate(json) {
		if (json.avatar != this.avatar) this.changepfp(json.avatar)
	}
	/**
	 * @param {string|null} newAvatar
	 */
	changepfp(newAvatar = null) {
		this.avatar = newAvatar
		this.hypotheticalpfp = false

		for (const elem of document.getElementsByClassName("userid:" + this.id))
			elem.src = this.getpfpsrc()
	}
	getpfpsrc() {
		if (this.hypotheticalpfp && this.avatar) return this.avatar

		if (this.avatar === null) return this.info.cdn + "/embed/avatars/" + ((this.id.replace("#clone", "") >>> 22) % 6) + ".png?size=64"
		return this.info.cdn + "/avatars/" + this.id.replace("#clone", "") + "/" + this.avatar + ".png?size=64"
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {Guild} guild
	 */
	async buildprofile(x, y, guild) {
		if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()

		const profileContainer = document.createElement("div")
		profileContainer.classList.add("profile-container")

		const div = document.createElement("div")
		div.classList.add("profile", "flexttb")

		if (this.theme_colors && this.theme_colors.length == 2) {
			profileContainer.style.setProperty("--theme_color1", "#" + Number.parseInt(this.theme_colors[0]).toString(16).padStart(6, "0"))
			profileContainer.style.setProperty("--theme_color2", "#" + Number.parseInt(this.theme_colors[1]).toString(16).padStart(6, "0"))
		} else {
			if (this.accent_color) {
				profileContainer.style.setProperty("--theme_color1", "#" + this.accent_color.toString(16).padStart(6, "0"))
				profileContainer.style.setProperty("--theme_color2", "#" + this.accent_color.toString(16).padStart(6, "0"))
			} else {
				profileContainer.style.setProperty("--theme_color1", "var(--profile-bg)")
				profileContainer.style.setProperty("--theme_color2", "var(--profile-bg)")
			}
		}

		const topContainer = document.createElement("div")
		topContainer.classList.add("profileTop")

		const banner = document.createElement("img")
		banner.classList.add("banner")
		banner.crossOrigin = "anonymous"
		banner.loading = "lazy"
		if (this.banner) {
			if (this.hypotheticalbanner) banner.src = this.banner
			else banner.src = this.info.cdn + "/avatars/" + this.id.replace("#clone", "") + "/" + this.banner + "." + (this.banner.startsWith("a_") ? "gif" : "png")
		}
		topContainer.appendChild(banner)

		if (x == -1) {
			profileContainer.classList.add("hypoprofile")
			this.setstatus("online")
		} else {
			profileContainer.style.left = x + "px"
			profileContainer.style.top = y + "px"
		}

		const pfp = await this.buildstatuspfp()
		topContainer.appendChild(pfp)

		div.appendChild(topContainer)

		const badgediv = document.createElement("div")
		badgediv.classList.add("badges")
		if (this.badge_ids) {
			for (const id of this.badge_ids) {
				this.getBadge(id).then(badgejson => {
					if (!badgejson) return

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

		if (guild) await Member.resolveMember(this, guild).then(async member => {
			if (!member) return

			const roles = document.createElement("div")
			roles.classList.add("rolesbox")
			for (const role of member.roles) {
				const roleContainer = document.createElement("div")
				roleContainer.classList.add("rolediv")

				const color = document.createElement("div")
				color.classList.add("colorrolediv")
				color.style.setProperty("--role-color", "#" + role.color.toString(16).padStart(6, "0"))
				roleContainer.append(color)

				const span = document.createElement("span")
				span.textContent = role.name
				roleContainer.append(span)

				roles.append(roleContainer)
			}
			userbody.append(roles)

			if (member.nick) usernamehtml.textContent = member.nick

			const profile = await member.getMemberProfile()
			if (profile && profile.guild_member_profile) {
				if (profile.guild_member_profile.bio && this.bio != profile.guild_member_profile.bio) {
					const memberBio = new MarkDown(profile.guild_member_profile.bio, this.localuser)
					userbody.appendChild(memberBio.makeHTML())
				}

				if (profile.guild_member_profile.banner && this.banner != profile.guild_member_profile.banner)
					banner.src = this.info.cdn + "/guilds/" + member.guild.id + "/users/" + this.id.replace("#clone", "") + "/avatars/" +
						profile.guild_member_profile.banner + "." + (profile.guild_member_profile.banner.startsWith("a_") ? "gif" : "png")
				if (profile.guild_member_profile.pronouns && this.pronouns != profile.guild_member_profile.pronouns)
					pronounshtml.textContent = profile.guild_member_profile.pronouns
			}
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

			document.body.appendChild(profileContainer)
			Contextmenu.currentmenu = profileContainer
			setTimeout(() => {
				Contextmenu.keepOnScreen(profileContainer)
			}, 0)
		}

		profileContainer.appendChild(div)
		return profileContainer
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
				User.contextmenu.bindContextmenu(html, this, member)

				if (member === void 0 && error) {
					const errorElem = document.createElement("span")
					errorElem.textContent = "!"
					errorElem.classList.add("membererror")
					html.after(errorElem)
					return
				}

				if (member) member.contextMenuBind(html)
			})
		} else User.contextmenu.bindContextmenu(html, this)

		if (guild) this.profileclick(html, guild)
		else this.profileclick(html)
	}
	static async resolve(id, localuser) {
		const res = await fetch(this.info.api + "/users/" + id + "/profile", {
			headers: localuser.headers
		})
		return new User(await res.json(), localuser)
	}
	block() {
		fetch(this.info.api + "/users/@me/relationships/" + this.id, {
			method: "PUT",
			headers: this.owner.headers,
			body: JSON.stringify({
				type: 2
			})
		})
		this.relationshipType = 2

		const channel = this.localuser.channelfocus
		if (channel) {
			for (const msg of channel.messages) {
				msg[1].generateMessage()
			}
		}
	}
	unblock() {
		fetch(this.info.api + "/users/@me/relationships/" + this.id, {
			method: "DELETE",
			headers: this.owner.headers
		})
		this.relationshipType = 0

		const channel = this.localuser.channelfocus
		if (channel) {
			for (const msg of channel.messages) {
				msg[1].generateMessage()
			}
		}
	}
}

User.setUpContextMenu()
