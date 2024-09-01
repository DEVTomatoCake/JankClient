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
	makemenu(x, y, addinfo, other) {
		const div = document.createElement("div")
		div.classList.add("contextmenu", "flexttb")

		let visibleButtons = 0
		for (const button of this.buttons) {
			if (!button.shown(addinfo, other)) continue
			visibleButtons++

			const intext = document.createElement("button")
			intext.classList.add("contextbutton")
			intext.textContent = button.text
			intext.disabled = !button.enabled(addinfo, other)
			intext.addEventListener("click", event => {
				button.onclick(event, addinfo, other)
			})

			div.appendChild(intext)
		}
		if (visibleButtons == 0) return

		if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()

		div.style.top = y + "px"
		div.style.left = x + "px"
		document.body.appendChild(div)

		Contextmenu.keepOnScreen(div)
		Contextmenu.currentmenu = div

		return this.div
	}
	bindContextmenu(obj, addinfo, other) {
		const func = event => {
			event.preventDefault()
			event.stopImmediatePropagation()
			this.makemenu(event.clientX, event.clientY, addinfo, other)
		}
		obj.addEventListener("contextmenu", func)
		return func
	}
	static keepOnScreen(elem) {
		const html = document.documentElement.getBoundingClientRect()
		const docHeight = html.height
		const docWidth = html.width

		const box = elem.getBoundingClientRect()
		if (box.x + elem.clientWidth > docWidth) elem.style.left = docWidth - elem.clientWidth + "px"
		if (box.y + elem.clientHeight > docHeight) elem.style.top = docHeight - elem.clientHeight + "px"
	}
}
Contextmenu.setup()
