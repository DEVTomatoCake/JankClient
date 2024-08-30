"use strict"

class TextInput {
	constructor(label, onSubmit, owner, { id = "random-" + Math.random().toString(36).slice(5), initText = "", fieldType = "text" } = {}) {
		this.label = label
		this.value = initText
		this.type = fieldType
		this.owner = owner
		this.onSubmit = onSubmit
		this.elemId = id
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.setAttribute("for", this.elemId)
		label.textContent = this.label
		div.append(label)

		const input = document.createElement("input")
		input.id = this.elemId
		input.value = this.value
		input.type = this.type
		input.oninput = this.onChange.bind(this)
		this.input = new WeakRef(input)
		div.append(input)

		return div
	}
	onChange() {
		this.owner.changed()
		const input = this.input.deref()
		if (input) {
			const value = input.value
			this.onchange(value)
			this.value = value
		}
	}
	onchange = () => {}
	watchForChange(func) {
		this.onchange = func
	}
	submit() {
		this.onSubmit(this.value)
	}
}

class CheckboxInput {
	constructor(label, onSubmit, owner, { id = "random-" + Math.random().toString(36).slice(5), initState = false } = {}) {
		this.label = label
		this.value = initState
		this.owner = owner
		this.onSubmit = onSubmit
		this.elemId = id
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.setAttribute("for", this.elemId)
		label.textContent = this.label
		div.append(label)

		const input = document.createElement("input")
		input.id = this.elemId
		input.type = "checkbox"
		input.checked = this.value
		input.oninput = this.onChange.bind(this)
		this.input = new WeakRef(input)
		div.append(input)

		return div
	}
	onChange() {
		this.owner.changed()
		const input = this.input.deref()
		if (input) {
			const value = input.checked
			this.onchange(value)
			this.value = value
		}
	}
	onchange = () => {}
	watchForChange(func) {
		this.onchange = func
	}
	submit() {
		this.onSubmit(this.value)
	}
}

class MDInput {
	constructor(label, onSubmit, owner, { id = "random-" + Math.random().toString(36).slice(5), initText = "" } = {}) {
		this.label = label
		this.value = initText
		this.owner = owner
		this.onSubmit = onSubmit
		this.elemId = id
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.setAttribute("for", this.elemId)
		label.textContent = this.label
		div.append(label)

		div.append(document.createElement("br"))

		const input = document.createElement("textarea")
		input.id = this.elemId
		input.value = this.value
		input.oninput = this.onChange.bind(this)
		this.input = new WeakRef(input)
		div.append(input)

		return div
	}
	onChange() {
		this.owner.changed()
		const input = this.input.deref()
		if (input) {
			const value = input.value
			this.value = value
			this.onchange(value)
			this.colorContent = value
		}
	}
	onchange = () => {}
	watchForChange(func) {
		this.onchange = func
	}
	submit() {
		this.onSubmit(this.value)
	}
}

class SelectInput {
	constructor(label, onSubmit, options, owner, { id = "random-" + Math.random().toString(36).slice(5), defaultIndex = 0 } = {}) {
		this.label = label
		this.index = defaultIndex
		this.owner = owner
		this.onSubmit = onSubmit
		this.options = options
		this.elemId = id
	}
	get value() {
		return this.index
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.setAttribute("for", this.elemId)
		label.textContent = this.label
		div.append(label)

		const select = document.createElement("select")
		select.id = this.elemId
		select.onchange = this.onChange.bind(this)
		for (const value of this.options) {
			const option = document.createElement("option")
			option.value = value
			option.textContent = value
			select.appendChild(option)
		}
		this.select = new WeakRef(select)
		select.selectedIndex = this.index
		div.append(select)

		return div
	}
	onChange() {
		this.owner.changed()
		const select = this.select.deref()
		if (select) {
			const value = select.selectedIndex
			this.onchange(value)
			this.index = value
		}
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
	constructor(label, onSubmit, owner, { clear = false, id = "random-" + Math.random().toString(36).slice(5) } = {}) {
		this.label = label
		this.owner = owner
		this.onSubmit = onSubmit
		this.elemId = id
		this.clear = clear
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.setAttribute("for", this.elemId)
		label.textContent = this.label
		div.append(label)

		const input = document.createElement("input")
		input.id = this.elemId
		input.type = "file"
		input.oninput = this.onChange.bind(this)
		this.input = new WeakRef(input)
		div.append(input)

		if (this.clear) {
			const button = document.createElement("button")
			button.textContent = "Clear"
			button.onclick = () => {
				if (this.onchange) this.onchange([])
				this.value = null
				this.owner.changed()
			}
			div.append(button)
		}

		return div
	}
	onChange() {
		this.owner.changed()
		const input = this.input.deref()
		if (this.onchange && input) {
			this.value = input.files
			this.onchange(input.files)
		}
	}
	onchange = null
	watchForChange(func) {
		this.onchange = func
	}
	submit() {
		const input = this.input.deref()
		if (input) this.onSubmit(input.files)
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
	watchForChange() {}
}

class ButtonInput {
	constructor(label, textContent, onClick, owner, { id = "random-" + Math.random().toString(36).slice(5)} = {}) {
		this.label = label
		this.owner = owner
		this.onClick = onClick
		this.textContent = textContent
		this.elemId = id
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.setAttribute("for", this.elemId)
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
	constructor(label, onSubmit, owner, { id = "random-" + Math.random().toString(36).slice(5), initColor = "" } = {}) {
		this.label = label
		this.colorContent = initColor
		this.owner = owner
		this.onSubmit = onSubmit
		this.elemId = id
	}
	generateHTML() {
		const div = document.createElement("div")

		const label = document.createElement("label")
		label.setAttribute("for", this.elemId)
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

class SettingsText {
	constructor(text) {
		this.text = text
	}
	generateHTML() {
		const span = document.createElement("span")
		span.textContent = this.text
		return span
	}
	watchForChange() {}
	submit() {}
}

class SettingsTitle {
	constructor(text) {
		this.text = text
	}
	generateHTML() {
		const span = document.createElement("h2")
		span.textContent = this.text
		return span
	}
	watchForChange() {}
	submit() {}
}

class Options {
	haschanged = false
	html = new WeakMap()
	container = new WeakRef(document.createElement("div"))
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
		this.generate(options)
		return options
	}
	addSelect(label, onSubmit, selections, { defaultIndex = 0 } = {}) {
		const select = new SelectInput(label, onSubmit, selections, this, { defaultIndex })
		this.options.push(select)
		this.generate(select)
		return select
	}
	addFileInput(label, onSubmit, { clear = false } = {}) {
		const FI = new FileInput(label, onSubmit, this, { clear })
		this.options.push(FI)
		this.generate(FI)
		return FI
	}
	addTextInput(label, onSubmit, { initText = "", fieldType = "text" } = {}) {
		const textInput = new TextInput(label, onSubmit, this, { initText, fieldType })
		this.options.push(textInput)
		this.generate(textInput)
		return textInput
	}
	addMDInput(label, onSubmit, { initText = "" } = {}) {
		const mdInput = new MDInput(label, onSubmit, this, { initText })
		this.options.push(mdInput)
		this.generate(mdInput)
		return mdInput
	}
	addButtonInput(label, textContent, onSubmit) {
		const button = new ButtonInput(label, textContent, onSubmit, this)
		this.options.push(button)
		this.generate(button)
		return button
	}
	addColorInput(label, onSubmit, { initColor = "" } = {}) {
		const colorInput = new ColorInput(label, onSubmit, this, { initColor })
		this.options.push(colorInput)
		this.generate(colorInput)
		return colorInput
	}
	addHTMLArea(html, submit = () => {}) {
		const htmlarea = new HtmlArea(html, submit)
		this.options.push(htmlarea)
		this.generate(htmlarea)
		return htmlarea
	}
	addCheckboxInput(label, onSubmit, { initState = false } = {}) {
		const box = new CheckboxInput(label, onSubmit, this, { initState })
		this.options.push(box)
		this.generate(box)
		return box
	}
	addSubOptions(name, { ltr = false } = {}) {
		const options = new Options(name, this, { ltr })
		this.subOptions = options
		const container = this.container.deref()
		if (container) this.generateContainter()
		else throw new Error("Tried to make a subOptions when the options weren't rendered")

		return options
	}
	addSubForm(name, onSubmit, { ltr = false, submitText = "Submit", fetchURL = "", headers = {}, method = "POST", traditionalSubmit = false } = {}) {
		// eslint-disable-next-line no-use-before-define
		const options = new Form(name, this, onSubmit, { ltr, submitText, fetchURL, headers, method, traditionalSubmit })
		this.subOptions = options
		const container = this.container.deref()
		if (container) this.generateContainter()
		else throw new Error("Tried to make a subForm when the options weren't rendered")

		return options
	}
	returnFromSub() {
		this.subOptions = void 0
		this.generateContainter()
	}
	addText(str) {
		const text = new SettingsText(str)
		this.options.push(text)
		this.generate(text)
		return text
	}
	addTitle(str) {
		const text = new SettingsTitle(str)
		this.options.push(text)
		this.generate(text)
		return text
	}
	generate(elm) {
		const container = this.container.deref()
		if (container) {
			const div = document.createElement("div")
			if (!(elm instanceof Options)) {
				div.classList.add("optionElement")
			}
			const html = elm.generateHTML()
			div.append(html)
			this.html.set(elm, new WeakRef(div))
			container.append(div)
		}
	}
	title = new WeakRef(document.createElement("h2"))
	generateHTML() {
		const div = document.createElement("div")
		div.classList.add("titlediv")

		const title = document.createElement("h2")
		if (this.name != "") title.classList.add("settingstitle")
		title.textContent = this.name
		div.append(title)
		this.title = new WeakRef(title)

		const container = document.createElement("div")
		container.classList.add(this.ltr ? "flexltr" : "flexttb", "flexspace")
		this.container = new WeakRef(container)

		const spacingContainer = document.createElement("div")
		spacingContainer.classList.add("settings-space")
		this.generateContainter()
		container.append(spacingContainer)

		div.append(container)
		return div
	}
	generateContainter() {
		const container = this.container.deref()
		if (container) {
			const title = this.title.deref()
			if (title)
				title.innerHTML = ""
			container.innerHTML = ""
			if (this.subOptions) {
				container.append(this.subOptions.generateHTML()) //more code needed, though this is enough for now
				if (title) {
					const name = document.createElement("span")
					name.textContent = this.name
					name.classList.add("clickable")
					name.onclick = () => {
						this.returnFromSub()
					}
					title.append(name, " > ", this.subOptions.name)
				}
			} else {
				for (const thing of this.options) {
					this.generate(thing)
				}
				if (title) {
					title.textContent = this.name
				}
			}
			if (title && title.textContent != "") {
				title.classList.add("settingstitle")
			} else if (title) {
				title.classList.remove("settingstitle")
			}
		} else {
			console.warn("tried to generate container, but it did not exist")
		}
	}
	changed() {
		// eslint-disable-next-line no-use-before-define
		if (this.owner instanceof Options || this.owner instanceof Form) {
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
			button.type = "button"
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
	removeAll() {
		while (this.options.length) {
			this.options.pop()
		}
		const container = this.container.deref()
		if (container) {
			container.innerHTML = ""
		}
	}
	watchForChange() {}
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
		if (buttonInfo instanceof Options) {
			buttonInfo.subOptions = void 0
			html = buttonInfo.generateHTML()
		} else html = this.handleString(buttonInfo)

		htmlarea.innerHTML = ""
		htmlarea.append(html)
	}
	changed(html) {
		this.warndiv = html
		this.buttonList.parentElement.append(html)
	}
	watchForChange() {}
	save() {}
	submit() {}
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
		exit.classList.add("exitsettings")
		exit.textContent = "✖"
		exit.setAttribute("aria-label", "Close settings")
		exit.setAttribute("tabindex", "0")
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

class FormError extends Error {
	constructor(elem, message) {
		super(message)
		this.message = message
		this.elem = elem
	}
}

class Form {
	required = new WeakSet()
	names = new Map()
	values = {}
	headers = {}
	constructor(name, owner, onSubmit, { ltr = false, submitText = "Submit", fetchURL = "", headers = {}, method = "POST", traditionalSubmit = false } = {}) {
		this.traditionalSubmit = traditionalSubmit
		this.name = name
		this.method = method
		this.submitText = submitText
		this.options = new Options("", this, { ltr })
		this.owner = owner
		this.fetchURL = fetchURL
		this.headers = headers
		this.ltr = ltr
		this.onSubmit = onSubmit
	}
	setValue(key, value) {
		this.values[key] = value
	}
	addSelect(label, formName, selections, { defaultIndex = 0, required = false } = {}) {
		const select = this.options.addSelect(label, () => {}, selections, { defaultIndex })
		this.names.set(formName, select)
		if (required) this.required.add(select)
		return select
	}
	addFileInput(label, formName, { required = false } = {}) {
		const FI = this.options.addFileInput(label, () => {}, {})
		this.names.set(formName, FI)
		if (required) this.required.add(FI)
		return FI
	}
	addTextInput(label, formName, { initText = "", fieldType = "text", required = false } = {}) {
		const textInput = this.options.addTextInput(label, () => {}, { initText, fieldType })
		this.names.set(formName, textInput)
		if (required) this.required.add(textInput)
		return textInput
	}
	addColorInput(label, formName, { initColor = "", required = false } = {}) {
		const colorInput = this.options.addColorInput(label, () => {}, { initColor })
		this.names.set(formName, colorInput)
		if (required) this.required.add(colorInput)
		return colorInput
	}
	addMDInput(label, formName, { initText = "", required = false } = {}) {
		const mdInput = this.options.addMDInput(label, () => {}, { initText })
		this.names.set(formName, mdInput)
		if (required) this.required.add(mdInput)
		return mdInput
	}
	addCheckboxInput(label, formName, { initState = false, required = false } = {}) {
		const box = this.options.addCheckboxInput(label, () => {}, { initState })
		this.names.set(formName, box)
		if (required) this.required.add(box)
		return box
	}
	generateHTML() {
		const div = document.createElement("div")
		div.append(this.options.generateHTML())
		div.classList.add("FormSettings")
		if (!this.traditionalSubmit) {
			const button = document.createElement("button")
			button.onclick = () => {
				this.submit()
			}
			button.textContent = this.submitText
			div.append(button)
		}
		return div
	}
	addText(str) {
		this.options.addText(str)
	}
	addTitle(str) {
		this.options.addTitle(str)
	}
	watchForChange(func) {
		this.onSubmit = func
	}

	changed() {
		if (this.traditionalSubmit) this.owner.changed()
	}
	submit() {
		const build = {}
		for (const key of Object.keys(this.values)) {
			const thing = this.values[key]
			if (thing instanceof Function) {
				try {
					build[key] = thing()
				} catch (e) {
					if (e instanceof FormError) {
						const elm = this.options.html.get(e.elem)
						if (elm) {
							const html = elm.deref()
							if (html) this.makeError(html, e.message)
						}
					}
					return
				}
			} else build[key] = thing
		}
		for (const thing of this.names.keys()) {
			if (thing == "") continue
			const input = this.names.get(thing)

			if (input instanceof SelectInput) {
				build[thing] = input.options[input.value]
				continue
			}

			build[thing] = input.value
		}

		if (this.fetchURL == "") this.onSubmit(build)
		else {
			fetch(this.fetchURL, {
				method: this.method,
				body: JSON.stringify(build),
				headers: this.headers
			}).then(res => res.json()).then(json => {
				if (json.errors && this.errors(json.errors)) return
				this.onSubmit(json)
			})
		}
	}
	errors(errors) {
		if (!(errors instanceof Object)) return

		for (const error of Object.keys(errors)) {
			const elm = this.names.get(error)
			if (elm) {
				const ref = this.options.html.get(elm)
				if (ref && ref.deref()) {
					const html = ref.deref()
					this.makeError(html, errors[error]._errors[0].message)
					return true
				}
			}
		}
		return false
	}
	error(formElm, errorMessage) {
		const elm = this.names.get(formElm)
		if (elm) {
			const htmlref = this.options.html.get(elm)
			if (htmlref) {
				const html = htmlref.deref()
				if (html) this.makeError(html, errorMessage)
			}
		} else console.error(formElm + " is not a valid form property")
	}
	makeError(e, message) {
		let element = e.getElementsByClassName("suberror")[0]
		if (element) {
			element.classList.remove("suberror")
			setTimeout(() => {
				element.classList.add("suberror")
			}, 100)
		} else {
			const div = document.createElement("div")
			div.classList.add("suberror", "suberrora")
			e.append(div)
			element = div
		}
		element.textContent = message
	}
}
