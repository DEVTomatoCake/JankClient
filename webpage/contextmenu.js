"use strict"

class Contextmenu {
	static setup() {
		Contextmenu.currentmenu = ""
		document.addEventListener("click", event => {
			if (Contextmenu.currentmenu == "") {
				return
			}
			if (!Contextmenu.currentmenu.contains(event.target)) {
				Contextmenu.currentmenu.remove()
				Contextmenu.currentmenu = ""
			}
		})
	}
	constructor() {
		this.buttons = []
	}
	addbutton(text = "", onclick = () => {}, img = null, shown = () => true, enabled = () => true) {
		this.buttons.push({type: "button", text, onclick, img, shown, enabled})
		return {}
	}
	addsubmenu(text = "", onclick = () => {}, img = null, shown = () => true, enabled = () => true) {
		this.buttons.push({type: "submenu", text, onclick, img, shown, enabled})
		return {}
	}
	makemenu(x, y, addinfo, obj) {
		const div = document.createElement("div")
		div.classList.add("contextmenu", "flexttb")

		for (const button of this.buttons) {
			if (!button.shown(addinfo)) continue

			const intext = document.createElement("button")
			intext.classList.add("contextbutton")
			intext.textContent = button.text
			intext.disabled = !button.enabled()

			if (button.type == "button") intext.onclick = button.onclick.bind(addinfo, obj)
			else intext.onclick = button.onclick.bind(addinfo)

			div.appendChild(intext)
		}
		if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()

		div.style.top = y + "px"
		div.style.left = x + "px"
		document.body.appendChild(div)

		Contextmenu.keepOnScreen(div)
		Contextmenu.currentmenu = div

		return this.div
	}
	bind(obj, addinfo) {
		const func = event => {
			event.preventDefault()
			event.stopImmediatePropagation()
			this.makemenu(event.clientX, event.clientY, addinfo, obj)
		}
		obj.addEventListener("contextmenu", func)
		return func
	}
	static keepOnScreen(obj) {
		const html = document.documentElement.getBoundingClientRect()
		const docheight = html.height
		const docwidth = html.width

		const box = obj.getBoundingClientRect()
		if (box.right > docwidth) obj.style.left = docwidth - box.width + "px"
		if (box.bottom > docheight) obj.style.top = docheight - box.height + "px"
	}
}
Contextmenu.setup()
