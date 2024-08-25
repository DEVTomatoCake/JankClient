"use strict"

const getBulkInfo = () => {
	return JSON.parse(localStorage.getItem("userinfos"))
}

const handleEndpoint = (url = "", isAPI = false) => {
	let parsed = new URL(url).toString()
	if (parsed.endsWith("/")) parsed = parsed.slice(0, -1)
	if (!/\/v\d+$/.test(parsed) && isAPI) parsed += "/v9"
	return parsed
}

class SpecialUser {
	constructor(json) {
		if (json instanceof SpecialUser) throw new Error("Input for SpecialUser must not be instance of SpecialUser")

		this.serverurls = {
			api: handleEndpoint(json.serverurls.api, true),
			cdn: handleEndpoint(json.serverurls.cdn),
			gateway: handleEndpoint(json.serverurls.gateway),
			wellknown: handleEndpoint(json.serverurls.wellknown)
		}

		this.email = json.email
		this.token = json.token
		this.loggedin = json.loggedin
		this.json = json
	}
	set pfpsrc(newPfp) {
		this.json.pfpsrc = newPfp
		this.updateLocal()
	}
	get pfpsrc() {
		return this.json.pfpsrc
	}
	set username(newName) {
		this.json.username = newName
		this.updateLocal()
	}
	get username() {
		return this.json.username
	}
	get uid() {
		return this.email + this.serverurls.wellknown
	}
	toJSON() {
		return this.json
	}
	updateLocal() {
		const info = getBulkInfo()
		info.users[this.uid] = this.toJSON()
		localStorage.setItem("userinfos", JSON.stringify(info))
	}
}

// eslint-disable-next-line no-unused-vars
const getBulkUsers = () => {
	const json = getBulkInfo()
	for (const user in json.users) {
		json.users[user] = new SpecialUser(json.users[user])
	}
	return json
}

const userinfos = getBulkInfo()
if (userinfos) {
	if (userinfos.accent_color === void 0 && userinfos.preferences.theme == "light") userinfos.accent_color = "#f0f0f0"
	else if (userinfos.accent_color === void 0) userinfos.accent_color = "#242443"

	localStorage.setItem("userinfos", JSON.stringify(userinfos))
} else {
	localStorage.setItem("userinfos", JSON.stringify({
		currentuser: null,
		users: {},
		preferences: {
			theme: window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark",
			notifications: false,
			notisound: "three"
		},
		accent_color: window.matchMedia("(prefers-color-scheme: light)").matches ? "#f0f0f0" : "#242443"
	}))
}

const adduser = user => {
	user = new SpecialUser(user)
	const info = getBulkInfo()
	info.users[user.uid] = user
	info.currentuser = user.uid
	localStorage.setItem("userinfos", JSON.stringify(info))
	return user
}

// eslint-disable-next-line no-unused-vars
const getAPIURLs = async str => {
	if (str.at(-1) != "/") str += "/"

	let api
	try {
		const info = await fetch(str + "/.well-known/spacebar").then(x => x.json())
		api = info.api
	} catch {
		return false
	}

	try {
		const info = await fetch(api + "/policies/instance/domains").then(x => x.json())
		return {
			api: handleEndpoint(info.apiEndpoint, true),
			gateway: handleEndpoint(info.gateway),
			cdn: handleEndpoint(info.cdn),
			wellknown: handleEndpoint(str),
			login: new URL(api).toString()
		}
	} catch {
		return false
	}
}

let undelete = false
const login = async (email, password, captcha) => {
	const info = JSON.parse(localStorage.getItem("instanceEndpoints"))

	const res = await fetch(info.login + "/auth/login", {
		method: "POST",
		headers: {
			"Content-Type": "application/json; charset=UTF-8"
		},
		body: JSON.stringify({
			login: email,
			password,
			undelete,
			captcha_key: captcha
		})
	})

	const json = await res.json()
	console.log(json)
	if (json.code == 20011 || json.code == 20013) {
		undelete = true
		return Object.values(json.errors)[0]._errors[0].message + " - Click again to undisable/undelete account!"
	}
	if (json.message == "Invalid Form Body") return Object.values(json.errors)[0]._errors[0].message

	if (json.captcha_sitekey) {
		const capt = document.getElementById("h-captcha")
		if (capt.children.length) {
			if (json.captcha_servicejson.captcha_service == "hcaptcha") hcaptcha.reset()
			else location.reload()
		} else {
			const capty = document.createElement("div")
			capty.classList.add("h-captcha")
			capty.setAttribute("data-sitekey", json.captcha_sitekey)

			const script = document.createElement("script")
			if (json.captcha_service == "recaptcha") script.src = "https://www.google.com/recaptcha/api.js?render=" + json.captcha_sitekey
			else if (json.captcha_service == "hcaptcha") script.src = "https://js.hcaptcha.com/1/api.js"
			else console.error("Unknown captcha service " + json.captcha_service + " found in login response!")

			capt.append(script)
			capt.append(capty)
		}
	} else {
		if (json.ticket) {
			let onetimecode = ""
			new Dialog(
				["vdiv",
					["title", "2FA code:"],
					["textbox", "", "", event => {
						onetimecode = event.target.value
					}],
					["button", "", "Submit", async () => {
						const mfaRes = await fetch(info.login + "/auth/mfa/totp", {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify({
								code: onetimecode,
								ticket: json.ticket
							})
						})
						const mfaJSON = await mfaRes.json()

						if (mfaJSON.message) alert(mfaJSON.message)
						else {
							if (!mfaJSON.token) return alert("No token found in login response, not logging in")
							adduser({serverurls: info, email, token: mfaJSON.token}).username = email

							const params = new URLSearchParams(location.search)
							if (params.has("next") && params.get("next").charAt(0) == "/" && params.get("next").charAt(1) != "/") location.href = params.get("next")
							else location.href = "/channels/@me"
						}
					}]
				]
			).show()
		} else {
			if (!json.token) return alert("No token found in login response, not logging in")
			adduser({serverurls: info, email, token: json.token}).username = email

			const params = new URLSearchParams(location.search)
			if (params.has("next") && params.get("next").charAt(0) == "/" && params.get("next").charAt(1) != "/") location.href = params.get("next")
			else location.href = "/channels/@me"
		}
	}
}

const setInstance = async url => {
	url = new URL(url)

	const attempt = async aurl => {
		const loginURL = handleEndpoint(aurl.toString())
		const info = await fetch(loginURL + "/policies/instance/domains")
			.then(x => x.json())

		return {
			api: handleEndpoint(info.apiEndpoint, true),
			gateway: handleEndpoint(info.gateway),
			cdn: handleEndpoint(info.cdn),
			wellknown: handleEndpoint(url),
			login: loginURL
		}
	}

	const wellKnown = await fetch(url.origin + "/.well-known/spacebar")
		.then(x => x.json())
		.then(x => new URL(x.api))
	return await attempt(wellKnown)
}

const check = async event => {
	event.preventDefault()
	const error = await login(event.srcElement[1].value, event.srcElement[2].value, event.srcElement[3].value)
	document.getElementById("wrong").textContent = error || ""
}

let instancein
let verify
const checkInstance = async () => {
	try {
		verify.textContent = "Checking Instance"
		localStorage.setItem("instanceEndpoints", JSON.stringify(await setInstance(instancein.value)))
		verify.textContent = "Instance is all good"
		if (checkInstance.alt) checkInstance.alt()

		setTimeout(() => {
			verify.textContent = ""
		}, 3000)
	} catch (e) {
		console.warn("Check Instance Error", e)
		verify.textContent = "Invalid Instance, try again"
	}
}

const setTheme = theme => {
	if (theme == "light") {
		document.body.classList.remove("dark-theme")
		document.body.classList.add("light-theme")
	} else {
		document.body.classList.remove("light-theme")
		document.body.classList.add("dark-theme")
	}
}

document.addEventListener("DOMContentLoaded", async () => {
	if (localStorage.getItem("theme") && localStorage.getItem("theme") != "dark") setTheme(localStorage.getItem("theme"))
	else if (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: light)").matches) setTheme("light")

	document.documentElement.style.setProperty("--accent-color", getBulkInfo().accent_color)

	if (!document.getElementById("instancein")) return

	if (document.getElementById("form")) document.getElementById("form").addEventListener("submit", check)

	instancein = document.getElementById("instancein")
	verify = document.getElementById("verify")
	let timeout = 0

	instancein.addEventListener("keydown", () => {
		verify.textContent = "Waiting to check Instance"
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(checkInstance, 800)
	})

	if (localStorage.getItem("instanceEndpoints")) instancein.value = JSON.parse(localStorage.getItem("instanceEndpoints")).wellknown
	else {
		try {
			const wellknownRes = await fetch(location.origin + "/.well-known/spacebar")
			instancein.value = new URL((await wellknownRes.json()).api).toString()
			console.log("Found well-known on current origin: " + instancein.value)
		} catch {
			instancein.value = "https://spacebar.chat/"
		}
		checkInstance()
	}

	const switchurl = document.getElementById("switch")
	if (switchurl) {
		switchurl.href += location.search
		const instance = new URLSearchParams(location.search).get("instance")
		if (instance) {
			instancein.value = instance
			checkInstance()
		}
	}
})
