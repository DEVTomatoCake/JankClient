class Emoji {
	static emojis
	static decodeEmojiList(buffer) {
		const view = new DataView(buffer, 0)
		let i = 0
		const read16 = () => {
			const int = view.getUint16(i)
			i += 2
			return int
		}
		const read8 = () => {
			const int = view.getUint8(i)
			i += 1
			return int
		}
		const readStringNo = length => {
			const array = new Uint8Array(length)
			for (let j = 0; j < length; j++) {
				array[j] = read8()
			}
			return new TextDecoder("utf8").decode(array.buffer)
		}
		const readString8 = () => {
			return readStringNo(read8())
		}
		const readString16 = () => {
			return readStringNo(read16())
		}

		const build = []
		let cats = read16()
		for (; cats != 0; cats--) {
			const name = readString16()
			const emojis = []
			let emojinumber = read16()
			for (; emojinumber != 0; emojinumber--) {
				const name8 = readString8()
				const len = read8()
				const skin_tone_support = len > 127
				const emoji = readStringNo(len - ((skin_tone_support ? 1 : 0) * 128))
				emojis.push({
					name: name8,
					skin_tone_support,
					emoji
				})
			}
			build.push({
				name,
				emojis
			})
		}
		this.emojis = build
	}
	static grabEmoji() {
		fetch("/emoji.bin").then(e => e.arrayBuffer()).then(e => {
			Emoji.decodeEmojiList(e)
		})
	}
	static async emojiPicker(x, y) {
		let res
		const promise = new Promise(r => {
			res = r
		})
		const menu = document.createElement("div")
		menu.classList.add("flextttb", "emojiPicker")
		menu.style.top = y + "px"
		menu.style.left = x + "px"

		setTimeout(() => {
			if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()

			document.body.append(menu)
			Contextmenu.currentmenu = menu
			Contextmenu.keepOnScreen(menu)
		}, 10)

		const title = document.createElement("h2")
		title.textContent = Emoji.emojis[0].name
		title.classList.add("emojiTitle")
		menu.append(title)

		const selection = document.createElement("div")
		selection.classList.add("flexltr")

		const body = document.createElement("div")
		body.classList.add("emojiBody")
		let i = 0
		for (const thing of Emoji.emojis) {
			const select = document.createElement("div")
			select.textContent = thing.emojis[0].emoji
			select.classList.add("emojiSelect")
			selection.append(select)
			const clickEvent = () => {
				title.textContent = thing.name
				body.innerHTML = ""
				for (const emojit of thing.emojis) {
					const emoji = document.createElement("div")
					emoji.classList.add("emojiSelect")
					emoji.textContent = emojit.emoji
					body.append(emoji)
					emoji.onclick = () => {
						res(emojit.emoji)
						Contextmenu.currentmenu.remove()
					}
				}
			}

			select.onclick = clickEvent
			if (i == 0) clickEvent()
			i++
		}
		menu.append(selection)
		menu.append(body)
		return promise
	}
}
Emoji.grabEmoji()
