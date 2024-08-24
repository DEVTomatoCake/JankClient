"use strict"

const userInfo = getBulkUsers()
const instance = new URLSearchParams(location.search).get("instance")
const joinable = []
Object.values(userInfo.users).forEach(user => {
	if (user.serverurls.wellknown.includes(instance)) joinable.push(user)
})

document.addEventListener("DOMContentLoaded", async () => {
	const inviteAccept = document.getElementById("invite-accept")

	let urls = {}
	if (joinable.length == 0) {
		const out = await getAPIURLs(instance)
		if (out) {
			urls = out
			Object.values(userInfo.users).forEach(user => {
				if (user.serverurls.api.includes(out.api)) joinable.push(user)
			})

			inviteAccept.textContent = "Create an account to accept the invite"
		} else {
			inviteAccept.textContent = "Spacebar instance is unavailable"
			inviteAccept.setAttribute("disabled", "")
		}
	} else urls = joinable[0].serverurls

	const code = location.pathname.split("/")[2]
	let guildId
	fetch(urls.api + "/invites/" + code).then(res => res.json()).then(json => {
		const guildjson = json.guild
		guildId = guildjson.id
		document.getElementById("invitename").textContent = guildjson.name
		document.getElementById("invitedescription").textContent = (json.inviter ? json.inviter.username : "Someone") + " invited you to join " + guildjson.name

		if (guildjson.icon) {
			const img = document.createElement("img")
			img.crossOrigin = "anonymous"
			img.src = urls.cdn + "/icons/" + guildjson.id + "/" + guildjson.icon + "." + (guildjson.icon.startsWith("a_") ? "gif" : "png") + "?size=256"
			img.classList.add("inviteGuild")
			document.getElementById("inviteimg").append(img)
		} else {
			const txt = guildjson.name.replace(/'s /g, " ").replace(/\w+/g, word => word[0]).replace(/\s/g, "")
			const guildName = document.createElement("p")
			guildName.textContent = txt
			guildName.classList.add("inviteGuild")
			document.getElementById("inviteimg").append(guildName)
		}
	})

	inviteAccept.addEventListener("click", () => {
		const container = document.createElement("dialog")
		container.classList.add("accountSwitcher")

		for (const specialuser of Object.values(joinable)) {
			const userinfo = document.createElement("div")
			userinfo.classList.add("flexltr", "switchtable")

			const pfp = document.createElement("img")
			pfp.crossOrigin = "anonymous"
			pfp.src = specialuser.pfpsrc
			pfp.classList.add("pfp")
			userinfo.append(pfp)

			const user = document.createElement("div")
			user.classList.add("userinfo")
			user.append(specialuser.username)
			user.append(document.createElement("br"))

			const span = document.createElement("span")
			span.classList.add("serverURL")
			span.textContent = specialuser.serverurls.wellknown.replace("https://", "").replace("http://", "")
			user.append(span)

			userinfo.append(user)
			container.append(userinfo)

			userinfo.addEventListener("click", () => {
				fetch(urls.api + "/invites/" + code, {
					method: "POST",
					headers: {
						Authorization: specialuser.token
					}
				}).then(() => {
					userInfo.currentuser = specialuser.uid
					localStorage.setItem("userinfos", JSON.stringify(userInfo))
					location.href = "/channels/" + guildId
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

	const inviteLink = document.getElementById("invite-link")
	inviteLink.value = instance + "/invite/" + code
	inviteLink.addEventListener("click", () => {
		inviteLink.select()
		navigator.clipboard.writeText(inviteLink.value)
	})
})
