document.addEventListener("DOMContentLoaded", async () => {
	const serverbox = document.getElementById("instancebox")

	const res = await fetch("/instances")
	const json = await res.json()

	for (const instance of json) {
		if (instance.display === false) {
			continue
		}
		const div = document.createElement("div")
		div.classList.add("flexltr", "instance")

		if (instance.image) {
			const img = document.createElement("img")
			img.crossOrigin = "anonymous"
			img.src = instance.image
			img.alt = instance.name
			div.append(img)
		}
		const statbox = document.createElement("div")
		statbox.classList.add("flexttb")

		const textbox = document.createElement("div")
		textbox.classList.add("flexttb", "instanceDescription")
		const title = document.createElement("h2")
		title.textContent = instance.name
		if (instance.online !== void 0) {
			const status = document.createElement("span")
			status.textContent = instance.online ? "Online" : "Offline"
			status.classList.add("instanceStatus")
			title.append(status)
		}
		textbox.append(title)

		if (instance.description || instance.descriptionLong) {
			const p = document.createElement("p")
			p.textContent = instance.description
			textbox.append(p)
		}
		statbox.append(textbox)

		if (instance.uptime) {
			const stats = document.createElement("div")
			stats.classList.add("flexltr")
			const span = document.createElement("span")
			span.textContent = "Uptime: " +
				"All time: " + Math.round(instance.uptime.alltime * 100) + "%, " +
				"this week: " + Math.round(instance.uptime.weektime * 100) + "%, " +
				"today: " + Math.round(instance.uptime.daytime * 100) + "%"
			stats.append(span)
			statbox.append(stats)
		}

		div.append(statbox)
		div.onclick = () => {
			if (instance.online) location.href = "/register?instance=" + encodeURI(instance.name)
			else alert("Instance is offline, can't connect")
		}

		serverbox.append(div)
	}
})
