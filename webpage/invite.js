"use strict"

const users = getBulkUsers()
const instance = new URLSearchParams(location.search).get("instance")
const joinable = []
for (const thing in users.users) {
	const user = users.users[thing]
	if (user.serverurls.wellknown.includes(instance)) joinable.push(user)
}

document.addEventListener("DOMContentLoaded", async () => {
	let urls = {}
	if (joinable.length == 0) {
		const out = await getAPIURLs(instance)
		if (out) {
			urls = out
			for (const thing in users.users) {
				const user = users.users[thing]
				if (user.serverurls.api.includes(out.api)) joinable.push(user)
			}

			document.getElementById("invite-accept").textContent = "Create an account to accept the invite"
		} else {
			document.getElementById("invite-accept").textContent = "Spacebar instance is unavailable"
			document.getElementById("invite-accept").setAttribute("disabled", "")
		}
	} else urls = joinable[0].serverurls

	const code = location.pathname.split("/")[2]
	let guildinfo
	fetch(urls.api + "/invites/" + code).then(res => res.json()).then(json => {
		const guildjson = json.guild
		guildinfo = guildjson
		document.getElementById("invitename").textContent = guildjson.name
		document.getElementById("invitedescription").textContent = json.inviter.username + " invited you to join " + guildjson.name

		if (guildjson.icon) {
			const img = document.createElement("img")
			img.src = urls.cdn + "/icons/" + guildjson.id + "/" + guildjson.icon + ".png"
			img.classList.add("inviteGuild")
			document.getElementById("inviteimg").append(img)
		} else {
			const txt = guildjson.name.replace(/'s /g, " ").replace(/\w+/g, word => word[0]).replace(/\s/g, "")
			const div = document.createElement("div")
			div.textContent = txt
			div.classList.add("inviteGuild")
			document.getElementById("inviteimg").append(div)
		}
	})

	document.getElementById("invite-accept").addEventListener("click", () => {
		const container = document.createElement("dialog")
		container.classList.add("accountSwitcher")

		for (const thing of Object.values(joinable)) {
			const specialuser = thing
			const userinfo = document.createElement("div")
			userinfo.classList.add("flexltr", "switchtable")
			const pfp = document.createElement("img")
			userinfo.append(pfp)
			const user = document.createElement("div")
			userinfo.append(user)
			user.append(specialuser.username)
			user.append(document.createElement("br"))
			const span = document.createElement("span")
			span.textContent = specialuser.serverurls.wellknown.replace("https://", "").replace("http://", "")
			user.append(span)
			user.classList.add("userinfo")
			span.classList.add("serverURL")
			pfp.src = specialuser.pfpsrc
			pfp.classList.add("pfp")
			container.append(userinfo)

			userinfo.addEventListener("click", () => {
				fetch(urls.api + "/invites/" + code, {
					method: "POST",
					headers: {
						Authorization: thing.token
					}
				}).then(() => {
					users.currentuser = specialuser.uid
					localStorage.setItem("userinfos", JSON.stringify(users))
					location.href = "/channels/" + guildinfo.id
				})
			})
		}

		const td = document.createElement("div")
		td.classList.add("switchtable")
		td.append("Login or create an account ⇌")
		td.addEventListener("click", () => {
			const l = new URLSearchParams()
			l.set("next", location.pathname + location.search)
			l.set("instance", instance)
			location.href = "/login?" + l.toString()
		})

		if (joinable.length == 0) {
			const l = new URLSearchParams()
			l.set("next", location.pathname + location.search)
			l.set("instance", instance)
			location.href = "/login?" + l.toString()
		}
		container.append(td)

		document.body.append(container)
	})

	document.getElementById("invite-link").value = instance + "/invite/" + code
	document.getElementById("invite-link").addEventListener("click", () => {
		document.getElementById("invite-link").select()
		navigator.clipboard.writeText(document.getElementById("invite-link").value)
	})
})
