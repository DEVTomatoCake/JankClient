"use strict"

class Member {
	static already = {}
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

		if (SnowFlake.getSnowFlakeFromID(this?.id, User)) this.user = SnowFlake.getSnowFlakeFromID(this.id, User).getObject()
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
			let res
			const promise = new Promise(r => {
				res = r
			})
			user.members.set(guild, promise)
			const membjson = await membpromise
			if (membjson === void 0) {
				res(void 0)
				return
			} else {
				const member = new Member(membjson, guild)
				res(member)
				return member
			}
		}

		if (maybe instanceof Promise) return await maybe
		return maybe
	}
	/**
	 * @todo
	 */
	highInfo() {
		fetch(this.info.api + "/users/" + this.id + "/profile?with_mutual_guilds=true&with_mutual_friends_count=true&guild_id=" + this.guild.id, { headers: this.guild.headers })
	}
	hasRole(ID) {
		return this.roles.some(role => role.id == ID)
	}
	getColor() {
		if (!this.roles) return ""

		for (const r of this.roles) {
			const color = r.getColor()
			if (color) return color
		}
		return ""
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
