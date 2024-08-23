"use strict"

class Role {
	constructor(json, owner) {
		this.headers = owner.headers
		this.info = owner.info

		for (const thing of Object.keys(json)) {
			if (thing == "id") {
				this.snowflake = new SnowFlake(json.id, this)
				continue
			}
			this[thing] = json[thing]
		}
		this.permissions = new Permissions(json.permissions)
		this.owner = owner
	}
	get guild() {
		return this.owner
	}
	get localuser() {
		return this.guild.localuser
	}
	get id() {
		return this.snowflake.id
	}
	getColor() {
		if (this.color == 0) return null

		return "#" + this.color.toString(16).padStart(6, "0")
	}
}

// eslint-disable-next-line no-unused-vars
class PermissionToggle {
	constructor(roleJSON, permissions, owner) {
		this.rolejson = roleJSON
		this.permissions = permissions
		this.owner = owner
	}
	generateHTML() {
		const div = document.createElement("div")
		div.classList.add("setting")

		const name = document.createElement("span")
		name.textContent = this.rolejson.readableName
		name.classList.add("settingsname")
		div.append(name)
		div.append(this.generateCheckbox())

		const p = document.createElement("p")
		p.innerText = this.rolejson.description
		div.appendChild(p)
		return div
	}
	generateCheckbox() {
		const div = document.createElement("div")
		div.classList.add("tritoggle")
		const state = this.permissions.getPermission(this.rolejson.name)

		const on = document.createElement("input")
		on.type = "radio"
		on.name = this.rolejson.name
		div.append(on)
		if (state == 1) on.checked = true

		on.addEventListener("click", () => {
			this.permissions.setPermission(this.rolejson.name, 1)
			this.owner.changed()
		})
		const no = document.createElement("input")
		no.type = "radio"
		no.name = this.rolejson.name
		div.append(no)
		if (state == 0) no.checked = true

		no.addEventListener("click", () => {
			this.permissions.setPermission(this.rolejson.name, 0)
			this.owner.changed()
		})

		if (this.permissions.hasDeny) {
			const off = document.createElement("input")
			off.type = "radio"
			off.name = this.rolejson.name
			div.append(off)
			if (state == -1) off.checked = true

			off.addEventListener("click", () => {
				this.permissions.setPermission(this.rolejson.name, -1)
				this.owner.changed()
			})
		}
		return div
	}
    watchForChange() {}
	submit() {}
}

// eslint-disable-next-line no-unused-vars
class RoleList extends Buttons {
	constructor(permissions, guild, onchange, channel = false) {
		super("Roles")
		this.guild = guild
		this.permissions = permissions
		this.channel = channel
		this.onchange = onchange

		const options = new Options("", this)
		if (channel) this.permission = new Permissions("0", "0")
		else this.permission = new Permissions("0")

		for (const thing of Permissions.info) {
			options.addPermissionToggle(thing, this.permission)
		}
		for (const i of permissions) {
			this.buttons.push([i[0].getObject().name, i[0].id])
		}
		this.options = options
	}
	handleString(str) {
		this.curid = str
		const perm = this.permissions.find(p => p[0].id == str)[1]
		this.permission.deny = perm.deny
		this.permission.allow = perm.allow
		this.options.name = SnowFlake.getSnowFlakeFromID(str, Role).getObject().name
		this.options.haschanged = false
		return this.options.generateHTML()
	}
	save() {
		this.onchange(this.curid, this.permission)
	}
}
