"use strict"

class Emoji {
	constructor(json, owner) {
		this.name = json.name
		this.id = json.id
		this.animated = json.animated
		this.owner = owner
	}

	get guild() {
		if (this.owner instanceof Guild) return this.owner
		throw new Error("Emoji is not in a guild")
	}
	get localuser() {
		if (this.owner instanceof Guild) return this.owner.localuser
		return this.owner
	}
	get info() {
		return this.owner.info
	}

	getHTML(bigemoji = false) {
		const emojiElem = document.createElement("img")
		emojiElem.classList.add("md-emoji")
		emojiElem.crossOrigin = "anonymous"
		emojiElem.src = this.info.cdn + "/emojis/" + this.id + "." + (this.animated ? "gif" : "png") + "?size=32"
		emojiElem.alt = this.name
		emojiElem.loading = "lazy"
		emojiElem.width = bigemoji ? 48 : 22
		emojiElem.height = bigemoji ? 48 : 22
		return emojiElem
	}

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
			i++
			return int
		}
		const readStringNo = length => {
			const array = new Uint8Array(length)
			for (let j = 0; j < length; j++) {
				array[j] = read8()
			}
			return new TextDecoder("utf8").decode(array.buffer)
		}
		const readString8 = () => readStringNo(read8())
		const readString16 = () => readStringNo(read16())

		const build = []
		let cats = read16()
		for (; cats > 0; cats--) {
			const name = readString16()
			const emojis = []
			let emojinumber = read16()
			for (; emojinumber > 0; emojinumber--) {
				const name8 = readString8()
				const slug8 = readString8()
				const len = read8()
				const skinToneSupport = len > 127
				const emoji = readStringNo(len - ((skinToneSupport ? 1 : 0) * 128))
				emojis.push({
					name: name8,
					slug: slug8,
					skin_tone_support: skinToneSupport,
					emoji
				})
			}
			build.push({
				name,
				emojis
			})
		}

		this.emojis = build
		this.emojisFlat = this.emojis.flatMap(category => category.emojis)
	}
	static grabEmoji() {
		fetch("/emoji.bin").then(e => e.arrayBuffer()).then(e => {
			Emoji.decodeEmojiList(e)
		})
	}
	static async emojiPicker(x, y, localuser) {
		let resolve
		const promise = new Promise(r => {
			resolve = r
		})
		const menu = document.createElement("div")
		menu.classList.add("flextttb", "emojiPicker")
		menu.style.top = y + "px"
		menu.style.left = x + "px"

		const title = document.createElement("h2")
		title.textContent = Emoji.emojis[0].name
		title.classList.add("emojiTitle")
		menu.append(title)

		const selection = document.createElement("div")
		selection.classList.add("flexltr", "dontshrink", "emojirow")

		const body = document.createElement("div")
		body.classList.add("emojiBody")

		let isFirst = true
		localuser.guildids.values().filter(guild => guild.id != "@me" && guild.emojis.length > 0).forEach(guild => {
			const select = document.createElement("div")
			select.classList.add("emojiSelect")

			if (guild.properties.icon) {
				const img = document.createElement("img")
				img.classList.add("pfp", "servericon", "emoji-server")
				img.crossOrigin = "anonymous"
				img.src = localuser.info.cdn + "/icons/" + guild.properties.id + "/" + guild.properties.icon + ".png?size=48"
				img.alt = "Server: " + guild.properties.name
				select.appendChild(img)
			} else {
				const div = document.createElement("span")
				div.textContent = guild.properties.name.replace(/'s /g, " ").replace(/\w+/g, word => word[0]).replace(/\s/g, "")
				select.append(div)
			}

			selection.append(select)

			const clickEvent = () => {
				title.textContent = guild.properties.name
				body.innerHTML = ""
				for (const emojit of guild.emojis) {
					const emojiElem = document.createElement("div")
					emojiElem.classList.add("emojiSelect")

					const emojiClass = new Emoji({
						id: emojit.id,
						name: emojit.name,
						animated: emojit.animated
					}, localuser)
					emojiElem.append(emojiClass.getHTML())
					body.append(emojiElem)

					emojiElem.addEventListener("click", () => {
						resolve(emojiClass)
						Contextmenu.currentmenu.remove()
					})
				}
			}

			select.addEventListener("click", clickEvent)
			if (isFirst) {
				clickEvent()
				isFirst = false
			}
		})

		for (const category of Emoji.emojis) {
			const select = document.createElement("div")
			select.classList.add("emojiSelect")
			select.append(MarkDown.renderTwemoji(category.emojis[0].emoji, 26))
			selection.append(select)

			const clickEvent = () => {
				title.textContent = category.name
				body.innerHTML = ""
				for (const emojit of category.emojis) {
					const emojiElem = document.createElement("span")
					emojiElem.classList.add("emojiSelect")

					emojiElem.append(MarkDown.renderTwemoji(emojit.emoji, 26))
					body.append(emojiElem)

					emojiElem.addEventListener("click", () => {
						resolve(emojit.emoji)
						Contextmenu.currentmenu.remove()
					})
				}
			}

			select.addEventListener("click", clickEvent)
			if (isFirst) {
				clickEvent()
				isFirst = false
			}
		}

		setTimeout(() => {
			if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()

			document.body.append(menu)
			Contextmenu.currentmenu = menu
			Contextmenu.keepOnScreen(menu)
		}, 10)

		menu.append(selection)
		menu.append(body)
		return promise
	}
}
Emoji.grabEmoji()
