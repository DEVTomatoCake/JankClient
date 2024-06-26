"use strict"

// eslint-disable-next-line no-unused-vars
class Embed {
	constructor(json, owner) {
		this.type = this.getType(json)
		this.owner = owner
		this.json = json
	}
	getType(json) {
		return json.type || "rich"
	}
	generateHTML() {
		switch (this.type) {
			case "rich":
				return this.generateRich()
			case "image":
				return this.generateImage()
			case "link":
			case "article":
			case "video":
				return this.generateArticle(this.type)
			default:
				console.warn(`unsupported embed type ${this.type}, please add support dev :3`, this.json)
				return document.createElement("div")//prevent errors by giving blank div
		}
	}
	generateRich() {
		const div = document.createElement("div")
		if (this.json.color) div.style.backgroundColor = "#" + this.json.color.toString(16)
		div.classList.add("embed-color")

		const embedElem = document.createElement("div")
		embedElem.classList.add("embed")
		div.append(embedElem)

		if (this.json.author) {
			const authorline = document.createElement("div")
			if (this.json.author.icon_url) {
				const img = document.createElement("img")
				img.classList.add("embedimg")
				img.crossOrigin = "anonymous"
				img.src = this.json.author.icon_url
				img.alt = ""
				authorline.append(img)
			}

			const a = document.createElement("a")
			a.textContent = this.json.author.name
			if (this.json.author.url) a.href = this.json.author.url
			a.classList.add("username")
			authorline.append(a)
			embedElem.append(authorline)
		}

		if (this.json.title) {
			const title = document.createElement(this.json.url ? "a" : "span")
			title.textContent = this.json.title
			title.classList.add("embedtitle")
			if (this.json.url) {
				title.href = this.json.url
				title.target = "_blank"
				title.rel = "noreferrer noopener"
			}
			embedElem.append(title)
		}

		if (this.json.description) {
			const p = document.createElement("p")
			p.textContent = this.json.description
			embedElem.append(p)
		}

		if (this.json.fields) for (const field of this.json.fields) {
			const divField = document.createElement("div")

			const b = document.createElement("b")
			b.textContent = field.name
			divField.append(b)

			const p = document.createElement("p")
			p.textContent = field.value
			p.classList.add("embedp")
			divField.append(p)

			if (field.inline) divField.classList.add("inline")
			embedElem.append(divField)
		}

		if (this.json.footer || this.json.timestamp) {
			const footer = document.createElement("div")
			if (this.json.footer && this.json.footer.icon_url) {
				const img = document.createElement("img")
				img.crossOrigin = "anonymous"
				img.src = this.json.footer.icon_url
				img.alt = ""
				img.classList.add("embedicon")
				footer.append(img)
			}

			if (this.json.footer && this.json.footer.text) {
				const span = document.createElement("span")
				span.textContent = this.json.footer.text
				span.classList.add("spaceright")
				footer.append(span)
			}

			if (this.json.footer && this.json.footer.text && this.json.timestamp) {
				const span = document.createElement("span")
				span.textContent = "•"
				span.classList.add("spaceright")
				footer.append(span)
			}

			if (this.json.timestamp) {
				const span = document.createElement("span")
				span.textContent = new Date(this.json.timestamp).toLocaleString()
				footer.append(span)
			}
			embedElem.append(footer)
		}

		return div
	}
	generateImage() {
		const td = document.createElement("td")
		const img = document.createElement("img")

		if (this.json.thumbnail) {
			img.classList.add("embedimg")
			img.onclick = function() {
				const full = new Dialog(["img", img.src, ["fit"]])
				full.show()
			}
			img.crossOrigin = "anonymous"
			img.src = this.json.thumbnail.proxy_url
			img.alt = ""
			td.append(img)
		}

		return img
	}
	generateArticle(type = "article") {
		const colordiv = document.createElement("div")
		colordiv.style.backgroundColor = "#000000"
		colordiv.classList.add("embed-color")

		const div = document.createElement("div")
		div.classList.add("embed")

		if (this.json.provider) {
			const provider = document.createElement("a")
			provider.classList.add("provider")
			provider.textContent = this.json.provider.name
			provider.href = this.json.provider.url
			provider.target = "_blank"
			provider.rel = "noreferrer noopener"
			div.append(provider)
		}

		const a = document.createElement("a")
		a.classList.add("title")
		a.href = this.json.url
		a.textContent = this.json.title
		a.target = "_blank"
		a.rel = "noreferrer noopener"
		div.append(a)

		const description = document.createElement("p")
		description.textContent = this.json.description
		div.append(description)

		if (this.json.image || this.json.thumbnail) {
			const img = document.createElement("img")
			if (this.json.image) img.classList.add("bigembedimg")
			img.addEventListener("click", () => {
				const full = new Dialog(["img", img.src, ["fit"]])
				full.show()
			})
			img.crossOrigin = "anonymous"
			img.src = this.json.image ? this.json.image.proxy_url : this.json.thumbnail.proxy_url
			img.alt = ""
			div.append(img)
		}

		if (type == "video" && this.json.video) {
			const proxyUrl = new URL(this.json.video.proxy_url)
			if (proxyUrl.hostname != "youtube.com") { // YouTube isn't a proxy, embedding it would need a privacy notice
				const video = document.createElement("video")
				video.controls = true
				video.src = this.json.video.proxy_url
				div.append(video)
			}
		}

		colordiv.append(div)
		return colordiv
	}
}
