"use strict"

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
	submit() {}
}

class TextInput {
	constructor(label, onSubmit, owner, { id = Math.random().toString(36).slice(2), initText = "" } = {}) {
		this.label = label
		this.textContent = initText
		this.owner = owner
		this.onSubmit = onSubmit
		this.elemId = id
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.for = this.elemId
		label.textContent = this.label
		div.append(label)

		const input = document.createElement("input")
		input.id = this.elemId
		input.value = this.textContent
		input.type = "text"
		input.oninput = this.onChange.bind(this)
		this.input = new WeakRef(input)
		div.append(input)

		return div
	}
	onChange() {
		this.owner.changed()
		const value = this.input.deref().value
		this.onchange(value)
		this.textContent = value
	}
	onchange = () => {}
	watchForChange(func) {
		this.onchange = func
	}
	submit() {
		this.onSubmit(this.textContent)
	}
}

class MDInput {
	constructor(label, onSubmit, owner, { id = Math.random().toString(36).slice(2), initText = "" } = {}) {
		this.label = label
		this.textContent = initText
		this.owner = owner
		this.onSubmit = onSubmit
		this.elemId = id
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.for = this.elemId
		label.textContent = this.label
		div.append(label)

		div.append(document.createElement("br"))

		const input = document.createElement("textarea")
		input.id = this.elemId
		input.value = this.textContent
		input.oninput = this.onChange.bind(this)
		this.input = new WeakRef(input)
		div.append(input)

		return div
	}
	onChange() {
		this.owner.changed()
		const value = this.input.deref().value
		this.onchange(value)
		this.textContent = value
	}
	onchange = () => {}
	watchForChange(func) {
		this.onchange = func
	}
	submit() {
		this.onSubmit(this.textContent)
	}
}

class SelectInput {
	constructor(label, onSubmit, options, owner, { id = Math.random().toString(36).slice(2), defaultIndex = 0 } = {}) {
		this.label = label
		this.index = defaultIndex
		this.owner = owner
		this.onSubmit = onSubmit
		this.options = options
		this.elemId = id
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.for = this.elemId
		label.textContent = this.label
		div.append(label)

		const select = document.createElement("select")
		select.onchange = this.onChange.bind(this)
		for (const thing of this.options) {
			const option = document.createElement("option")
			option.textContent = thing
			select.appendChild(option)
		}
		this.select = new WeakRef(select)
		select.selectedIndex = this.index
		div.append(select)

		return div
	}
	onChange() {
		this.owner.changed()
		const value = this.select.deref().selectedIndex
		this.onchange(value)
		this.index = value
	}
	onchange = () => {}
	watchForChange(func) {
		this.onchange = func
	}
	submit() {
		this.onSubmit(this.index)
	}
}

class FileInput {
	constructor(label, onSubmit, owner, { id = Math.random().toString(36).slice(2)} = {}) {
		this.label = label
		this.owner = owner
		this.onSubmit = onSubmit
		this.elemId = id
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.for = this.elemId
		label.textContent = this.label
		div.append(label)

		const input = document.createElement("input")
		input.id = this.elemId
		input.type = "file"
		input.oninput = this.onChange.bind(this)
		this.input = new WeakRef(input)
		div.append(input)

		return div
	}
	onChange() {
		this.owner.changed()
		if (this.onchange) this.onchange(this.input.deref().files)
	}
	onchange = null
	watchForChange(func) {
		this.onchange = func
	}
	submit() {
		this.onSubmit(this.input.deref().files)
	}
}

class HtmlArea {
	constructor(html, submit) {
		this.submit = submit
		this.html = html
	}
	generateHTML() {
		if (this.html instanceof Function) return this.html()
		return this.html
	}
}

class ButtonInput {
	constructor(label, textContent, onClick, owner, { id = Math.random().toString(36).slice(2)} = {}) {
		this.label = label
		this.owner = owner
		this.onClick = onClick
		this.textContent = textContent
		this.elemId = id
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.for = this.elemId
		label.textContent = this.label
		div.append(label)

		const button = document.createElement("button")
		button.id = this.elemId
		button.textContent = this.textContent
		button.onclick = this.onClickEvent.bind(this)
		div.append(button)

		return div
	}
	onClickEvent() {
		this.onClick()
	}
	watchForChange() {}
	submit() {}
}

class ColorInput {
	constructor(label, onSubmit, owner, { id = Math.random().toString(36).slice(2), initColor = "" } = {}) {
		this.label = label
		this.colorContent = initColor
		this.owner = owner
		this.onSubmit = onSubmit
		this.elemId = id
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.for = this.elemId
		label.textContent = this.label
		div.append(label)

		const input = document.createElement("input")
		input.id = this.elemId
		input.value = this.colorContent
		input.type = "color"
		input.addEventListener("input", this.onChange.bind(this))
		this.input = new WeakRef(input)
		div.append(input)
		return div
	}
	onChange() {
		this.owner.changed()
		const value = this.input.deref().value
		this.onchange(value)
		this.colorContent = value
	}
	onchange = () => {}
	watchForChange(func) {
		this.onchange = func
	}
	submit() {
		this.onSubmit(this.colorContent)
	}
}

class Options {
	haschanged = false
	constructor(name, owner, { ltr = false } = {}) {
		this.name = name
		this.options = []
		this.owner = owner
		this.ltr = ltr
	}
	addPermissionToggle(roleJSON, permissions) {
		this.options.push(new PermissionToggle(roleJSON, permissions, this))
	}
	addOptions(name, { ltr = false } = {}) {
		const options = new Options(name, this, { ltr })
		this.options.push(options)
		return options
	}
	addSelect(label, onSubmit, selections, { defaultIndex = 0 } = {}) {
		const select = new SelectInput(label, onSubmit, selections, this, { defaultIndex })
		this.options.push(select)
		return select
	}
	addFileInput(label, onSubmit) {
		const FI = new FileInput(label, onSubmit, this)
		this.options.push(FI)
		return FI
	}
	addTextInput(label, onSubmit, { initText = "" } = {}) {
		const textInput = new TextInput(label, onSubmit, this, { initText })
		this.options.push(textInput)
		return textInput
	}
	addMDInput(label, onSubmit, { initText = "" } = {}) {
		const mdInput = new MDInput(label, onSubmit, this, { initText })
		this.options.push(mdInput)
		return mdInput
	}
	addButtonInput(label, textContent, onSubmit) {
		const button = new ButtonInput(label, textContent, onSubmit, this)
		this.options.push(button)
		return button
	}
	addColorInput(label, onSubmit, { initColor = "" } = {}) {
		const colorInput = new ColorInput(label, onSubmit, this, { initColor })
		this.options.push(colorInput)
		return colorInput
	}
	addHTMLArea(html, submit = () => {}) {
		const htmlarea = new HtmlArea(html, submit)
		this.options.push(htmlarea)
		return htmlarea
	}
	generateHTML() {
		const div = document.createElement("div")
		div.classList.add("titlediv")

		if (this.name != "") {
			const title = document.createElement("h2")
			title.textContent = this.name
			div.append(title)
			title.classList.add("settingstitle")
		}

		const container = document.createElement("div")
		container.classList.add(this.ltr ? "flexltr" : "flexttb", "flexspace")

		const spacingContainer = document.createElement("div")
		spacingContainer.classList.add("settings-space")
		for (const thing of this.options) {
			spacingContainer.append(thing.generateHTML())
		}
		container.append(spacingContainer)

		div.append(container)
		return div
	}
	changed() {
		if (this.owner instanceof Options) {
			this.owner.changed()
			return
		}

		if (!this.haschanged) {
			const div = document.createElement("div")
			div.classList.add("flexltr", "savediv")

			const span = document.createElement("span")
			span.textContent = "Careful, you have unsaved changes"
			div.append(span)

			const button = document.createElement("button")
			button.textContent = "Save changes"
			div.append(button)
			this.haschanged = true
			this.owner.changed(div)
			button.addEventListener("click", () => {
				// eslint-disable-next-line no-use-before-define
				if (this.owner instanceof Buttons) this.owner.save()
				div.remove()
				this.submit()
			})
		}
	}
	submit() {
		this.haschanged = false
		for (const thing of this.options) thing.submit()
	}
}

class Buttons {
	constructor(name) {
		this.buttons = []
		this.name = name
	}
	add(name, thing) {
		if (!thing) thing = new Options(name, this)
		this.buttons.push([name, thing])
		return thing
	}
	generateHTML() {
		const buttonList = document.createElement("div")
		buttonList.classList.add("Buttons", "flexltr")
		this.buttonList = buttonList

		const htmlarea = document.createElement("div")
		htmlarea.classList.add("flexgrow")
		const buttonTable = document.createElement("div")
		buttonTable.classList.add("flexttb", "settingbuttons")

		for (const thing of this.buttons) {
			const button = document.createElement("button")
			button.classList.add("SettingsButton")
			button.textContent = thing[0]
			button.addEventListener("click", () => {
				this.generateHTMLArea(thing[1], htmlarea)
				if (this.warndiv) this.warndiv.remove()
			})
			buttonTable.append(button)
		}

		this.generateHTMLArea(this.buttons[0][1], htmlarea)
		buttonList.append(buttonTable)
		buttonList.append(htmlarea)
		return buttonList
	}
	handleString(str) {
		const div = document.createElement("span")
		div.textContent = str
		return div
	}
	generateHTMLArea(buttonInfo, htmlarea) {
		let html
		if (buttonInfo instanceof Options) html = buttonInfo.generateHTML()
		else html = this.handleString(buttonInfo)

		htmlarea.innerHTML = ""
		htmlarea.append(html)
	}
	changed(html) {
		this.warndiv = html
		this.buttonList.parentElement.append(html)
	}
	save() {}
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

// eslint-disable-next-line no-unused-vars
class Settings extends Buttons {
	addButton(name) {
		const options = new Options(name, this)
		this.add(name, options)
		return options
	}
	show() {
		const background = document.createElement("dialog")
		background.classList.add("settings")

		const title = document.createElement("h2")
		title.textContent = this.name
		title.classList.add("settingstitle")
		background.append(title)

		background.append(this.generateHTML())

		const exit = document.createElement("span")
		exit.textContent = "✖"
		exit.classList.add("exitsettings")
		background.append(exit)
		exit.addEventListener("click", () => {
			this.hide()
		})
		document.body.append(background)
		this.html = background
		background.showModal()
	}
	hide() {
		this.html.close()
		this.html.remove()
		this.html = null
	}
}
