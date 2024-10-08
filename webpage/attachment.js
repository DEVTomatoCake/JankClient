"use strict"

// eslint-disable-next-line no-unused-vars
class Attachment {
	constructor(fileJSON, owner) {
		this.owner = owner
		this.id = fileJSON.id
		this.filename = fileJSON.filename
		this.content_type = fileJSON.content_type
		this.width = fileJSON.width
		this.height = fileJSON.height
		this.url = fileJSON.url
		this.proxy_url = fileJSON.proxy_url
		this.content_type = fileJSON.content_type
		this.size = fileJSON.size
		this.title = fileJSON.title
		this.description = fileJSON.description
	}
	getHTML(hideControls = false) {
		const src = this.proxy_url || this.url

		if (this.width) {
			let scale = 1
			const max = 96 * 3
			scale = Math.max(scale, this.width / max)
			scale = Math.max(scale, this.height / max)
			this.width /= scale
			this.height /= scale
		}

		if (this.content_type.startsWith("image/")) {
			const div = document.createElement("div")
			div.classList.add("messageimgdiv")

			const img = document.createElement("img")
			img.classList.add("messageimg")
			img.addEventListener("click", () => {
				const full = new Dialog(["img", src, ["fit"]])
				full.show()
			})
			img.crossOrigin = "anonymous"
			img.src = src
			img.alt = this.description || this.title || "Image: " + this.filename
			if (this.width) {
				div.style.width = this.width + "px"
				div.style.height = this.height + "px"
			}
			div.append(img)

			return div
		} else if (this.content_type.startsWith("video/")) {
			const video = document.createElement("video")
			const source = document.createElement("source")
			video.crossOrigin = "anonymous"
			source.src = src
			video.append(source)
			source.type = this.content_type
			video.controls = !hideControls

			if (this.width) {
				video.width = this.width
				video.height = this.height
			}
			return video
		} else if (this.content_type.startsWith("audio/")) {
			const audio = document.createElement("audio")
			const source = document.createElement("source")
			source.src = src
			audio.append(source)
			source.type = this.content_type
			audio.controls = !hideControls
			return audio
		}

		return this.createunknown()
	}
	upHTML(files, file) {
		const div = document.createElement("div")
		const contained = this.getHTML(true)
		div.classList.add("containedFile")
		div.append(contained)

		const controls = document.createElement("div")
		controls.classList.add("controls")

		const garbage = document.createElement("button")
		garbage.textContent = "🗑"
		garbage.addEventListener("click", () => {
			div.remove()
			files.splice(files.indexOf(file), 1)
		})
		controls.append(garbage)

		div.append(controls)

		return div
	}
	static initFromBlob(file) {
		return new Attachment({
			id: null,
			filename: file.name,
			size: file.size,
			content_type: file.type,
			url: URL.createObjectURL(file)
		}, null)
	}
	createunknown() {
		const src = this.proxy_url || this.url
		const div = document.createElement("table")
		div.classList.add("unknownfile")
		const nametr = document.createElement("tr")

		const fileicon = document.createElement("td")
		fileicon.classList.add("fileicon")
		fileicon.append("🗎")
		fileicon.rowSpan = 2
		nametr.append(fileicon)

		const nametd = document.createElement("td")
		nametd.classList.add("filename")
		if (src) {
			const a = document.createElement("a")
			a.target = "_blank"
			a.rel = "noreferrer noopener"
			a.href = src
			a.textContent = this.filename
			nametd.append(a)
		} else nametd.textContent = this.filename

		nametr.append(nametd)
		div.append(nametr)

		const sizetr = document.createElement("tr")

		const size = document.createElement("td")
		size.classList.add("filesize")
		size.textContent = "Size:" + this.filesizehuman(this.size)
		sizetr.append(size)

		div.appendChild(sizetr)

		return div
	}
	filesizehuman(fsize) {
		const i = fsize <= 0 ? 0 : Math.floor(Math.log(fsize) / Math.log(1024))
		return (fsize / Math.pow(1024, i)).toFixed(2) + " " + ["Bytes", "Kilobytes", "Megabytes", "Gigabytes", "Terabytes"][i]
	}
}
