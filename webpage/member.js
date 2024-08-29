"use strict"

// eslint-disable-next-line no-unused-vars
class Member {
	roles = []
	/**
	 * @param {memberjson|User|{guild_member: memberjson, user: userjson}} memberjson
	 * @param {Guild} owner
	 */
	constructor(memberjson, owner) {
		this.owner = owner
		if (this.localuser.userMap.has(memberjson.id)) this.user = this.localuser.userMap.get(memberjson.id)
		else this.user = new User(memberjson.user, owner.localuser)

		this.owner = owner
		for (const key of Object.keys(memberjson)) {
			if (key == "guild" || key == "owner") continue

			if (key == "roles") {
				for (const strrole of memberjson.roles) {
					const role = SnowFlake.getSnowFlakeFromID(strrole, Role).getObject()
					this.roles.push(role)
				}
				continue
			}

			this[key] = memberjson[key]
		}

		if (this.localuser.userMap.has(this?.id)) this.user = this.localuser.userMap.get(this.id)
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
	 * @param {memberjson} memberjson
	 * @param {Guild} owner
	 * @returns {Promise<Member|undefined>}
	 */
	static async new(memberjson, owner) {
		let user
		if (owner.localuser.userMap.has(memberjson.id)) user = owner.localuser.userMap.get(memberjson.id)
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
		const member = user.members.get(guild)
		if (!member) {
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
				const memb = new Member(membjson, guild)
				const map = guild.localuser.presences
				memb.setPresence(map.get(memb.id))
				map.delete(memb.id)
				resolve(memb)
				return memb
			}
		}

		if (member instanceof Promise) return await member
		return member
	}
	setPresence(presence) {
		this.user.setPresence(presence)
	}
	async getMemberProfile() {
		const res = await fetch(this.info.api + "/users/" + this.id + "/profile?with_mutual_guilds=true&with_mutual_friends_count=true&guild_id=" + this.guild.id, {
			headers: this.guild.headers
		})
		return await res.json()
	}
	hasRole(id) {
		return this.roles.some(role => role.id == id)
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
	}
	get name() {
		return this.nick || this.user.username
	}
	kick() {
		let reason = ""
		const dialog = new Dialog(["vdiv",
			["title", "Kick " + this.name + " from " + this.guild.properties.name],
			["textbox", "Reason:", "", event => {
				reason = event.target.value
			}],
			["button", "", "Confirm kick", async () => {
				await this.kickAPI(reason)
				dialog.hide()
			}],
			["button", "", "Cancel", () => {
				dialog.hide()
			}]
		])
		dialog.show()
	}
	kickAPI(reason) {
		return fetch(this.info.api + "/guilds/" + this.guild.id + "/members/" + this.id, {
			method: "DELETE",
			headers: {
				...this.localuser.headers,
				"X-Audit-Log-Reason": encodeURIComponent(reason)
			}
		})
	}
	ban() {
		let deleteMessages = 0
		let reason = ""
		const dialog = new Dialog(["vdiv",
			["textbox", "Reason:", "", event => {
				reason = event.target.value
			}],
			["select",
				"Delete messages:", ["Don't delete any", "1 minute", "5 minutes", "10 minutes", "30 minutes", "1 hour", "3 hours", "8 hours", "1 day", "3 days"], event => {
					deleteMessages = [0, 60, 60 * 5, 60 * 10, 60 * 30, 60 * 60, 60 * 60 * 3, 60 * 60 * 8, 60 * 60 * 24, 60 * 60 * 24 * 3][event.srcElement.selectedIndex]
				},
				0
			],
			["button", "", "Confirm ban", async () => {
				await this.banAPI(reason, deleteMessages)
				dialog.hide()
			}],
			["button", "", "Cancel", () => {
				dialog.hide()
			}]
		])
		dialog.show()
	}
	banAPI(reason, deleteMessages) {
		return fetch(this.info.api + "/guilds/" + this.guild.id + "/bans/" + this.id, {
			method: "PUT",
			headers: {
				...this.localuser.headers,
				"X-Audit-Log-Reason": encodeURIComponent(reason)
			},
			body: JSON.stringify({
				delete_message_seconds: deleteMessages
			})
		})
	}
	hasPermission(name) {
		if (this.isAdmin()) return true

		for (const role of this.roles) {
			if (role.permissions.getPermission(name)) return true
		}
		return false
	}
}
