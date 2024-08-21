"use strict"

class Member {
	static already = {}
	static contextmenu = new Contextmenu()
	static setUpContextMenu() {
		this.contextmenu.addbutton("Change nickname", function() {
			let newNick = this.nick
			const dialog = new Dialog(["vdiv",
				["textbox", "New nickname:", this.nick, function() {
					newNick = this.value
				}],
				["button", "", "Change nickname", () => {
					fetch(this.info.api + "/guilds/" + this.guild.id + "/members/" + this.id + "/nick", {
						method: "PATCH",
						headers: this.localuser.headers,
						body: JSON.stringify({
							nick: newNick || null
						})
					})
					dialog.hide()
				}]
			])
			dialog.show()
		}, null, owner => owner.hasPermission("MANAGE_NICKNAMES"))

		this.contextmenu.addbutton("Kick user", function() {
			let reason = ""
			const dialog = new Dialog(["vdiv",
				["textbox", "Reason:", "", function() {
					reason = this.value
				}],
				["button", "", "Confirm kick", async () => {
					await fetch(this.info.api + "/guilds/" + this.guild.id + "/members/" + this.id + "/nick", {
						method: "PATCH",
						headers: this.localuser.headers,
						body: JSON.stringify({
							reason
						})
					})
					dialog.hide()
				}],
				["button", "", "Cancel", () => {
					dialog.hide()
				}]
			])
			dialog.show()
		}, null, owner => owner.hasPermission("MANAGE_NICKNAMES"))

		this.contextmenu.addbutton("Ban user", function() {
			let reason = ""
			const dialog = new Dialog(["vdiv",
				["textbox", "Reason:", "", function() {
					reason = this.value
				}],
				["button", "", "Confirm ban", async () => {
					await fetch(this.info.api + "/guilds/" + this.guild.id + "/bans/" + this.id, {
						method: "PUT",
						headers: this.localuser.headers,
						body: JSON.stringify({
							//delete_message_seconds: ,
							reason
						})
					})
					dialog.hide()
				}],
				["button", "", "Cancel", () => {
					dialog.hide()
				}]
			])
			dialog.show()
		}, null, owner => owner.hasPermission("MANAGE_NICKNAMES"))
	}

	roles = []
	/**
	 * @param {memberjson|User|{guild_member: memberjson, user: userjson}} memberjson
	 * @param {Guild} owner
	 */
	constructor(memberjson, owner) {
		if (User.userids[memberjson.id]) this.user = User.userids[memberjson.id]
		else this.user = new User(memberjson.user, owner.localuser)

		this.owner = owner
		for (const thing of Object.keys(memberjson)) {
			if (thing == "guild" || thing == "owner") continue

			if (thing == "roles") {
				for (const strrole of memberjson.roles) {
					const role = SnowFlake.getSnowFlakeFromID(strrole, Role).getObject()
					this.roles.push(role)
				}
				continue
			}

			this[thing] = memberjson[thing]
		}

		if (SnowFlake.getSnowFlakeFromID(this.id, User)) this.user = SnowFlake.getSnowFlakeFromID(this.id, User).getObject()
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
	/**
	 * @param {User|memberjson|string} unknown
	 * @param {Guild} guild
	 * @returns {Promise<Member>}
	 */
	static async new(memberjson, owner) {
		let user
		if (User.userids[memberjson.id]) user = User.userids[memberjson.id]
		else user = new User(memberjson.user, owner.localuser)

		if (user.members.has(owner)) {
			let memb = user.members.get(owner)
			if (memb === void 0) {
				memb = new Member(memberjson, owner)
				user.members.set(owner, memb)
				return memb
			} else if (memb instanceof Promise) return await memb
			else return memb
		} else {
			const memb = new Member(memberjson, owner)
			user.members.set(owner, memb)
			return memb
		}
	}
	static async resolveMember(user, guild) {
		const maybe = user.members.get(guild)
		if (!user.members.has(guild)) {
			const membpromise = guild.localuser.resolvemember(user.id, guild.id)
			let resolve
			const promise = new Promise(res => {
				resolve = res
			})
			user.members.set(guild, promise)
			const membjson = await membpromise
			if (membjson === void 0) {
				resolve(void 0)
				return
			} else {
				const member = new Member(membjson, guild)
				const map = guild.localuser.presences
				member.getPresence(map.get(member.id))
				map.delete(member.id)
				resolve(member)
				return member
			}
		}

		if (maybe instanceof Promise) return await maybe
		return maybe
	}
	getPresence(presence) {
		this.user.getPresence(presence)
	}
	async getMemberProfile() {
		const res = await fetch(this.info.api + "/users/" + this.id + "/profile?with_mutual_guilds=true&with_mutual_friends_count=true&guild_id=" + this.guild.id, {
			headers: this.guild.headers
		})
		return await res.json()
	}
	hasRole(ID) {
		return this.roles.some(role => role.id == ID)
	}
	getColor() {
		if (!this.roles) return ""

		return this.roles.find(role => role.getColor())?.getColor() || ""
	}
	isAdmin() {
		return this.guild.properties.owner_id == this.user.id || this.roles.some(role => role.permissions.hasPermission("ADMINISTRATOR"))
	}
	contextMenuBind(html) {
		if (html.tagName == "SPAN") html.style.color = this.getColor()

		this.profileclick(html)
		Member.contextmenu.bind(html)
	}
	profileclick() {
		//to be implemented
	}
}

Member.setUpContextMenu()
