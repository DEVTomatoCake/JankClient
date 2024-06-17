"use strict"

class specialuser {
	constructor(json) {
		console.log(json)
		if (json instanceof specialuser) return

		this.serverurls = json.serverurls
		this.serverurls.api = new URL(this.serverurls.api)
		this.serverurls.cdn = new URL(this.serverurls.cdn)
		this.serverurls.gateway = new URL(this.serverurls.gateway)
		this.serverurls.wellknown = new URL(this.serverurls.wellknown)
		this.email = json.email
		this.token = json.token
		this.loggedin = json.loggedin
		this.json = json
		if (!this.serverurls || !this.email || !this.token) {
			console.error("There are fundamentally missing pieces of info missing from this user")
		}
	}
	set pfpsrc(e) {
		this.json.pfpsrc = e
		this.updateLocal()
	}
	get pfpsrc() {
		return this.json.pfpsrc
	}
	set username(e) {
		this.json.username = e
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
		localStorage.setItem("userinfos",JSON.stringify(info))
	}
}

function getBulkUsers() {
	const json = JSON.parse(localStorage.getItem("userinfos"))
	for (const thing in json.users) {
		json.users[thing] = new specialuser(json.users[thing])
	}
	return json
}
function getBulkInfo() {
	return JSON.parse(localStorage.getItem("userinfos"))
}
function setDefaults() {
	const userinfos = localStorage.getItem("userinfos")
	if (!userinfos) {
		localStorage.setItem("userinfos",JSON.stringify({
			currentuser: null,
			users: {},
			preferances:
			{
				theme: "Dark",
				notifcations: false
			}
		}))
	}
}
setDefaults()

function adduser(user) {
	user = new specialuser(user)
	const info = getBulkInfo()
	info.users[user.uid] = user
	info.currentuser = user.uid
	localStorage.setItem("userinfos",JSON.stringify(info))
}

async function login(username, password) {
	const options = {
		method: "POST",
		headers: {
			"Content-Type": "application/json; charset=UTF-8"
		},
		body: JSON.stringify({
			login: username,
			password,
			undelete: false
		})
	}
	try {
		const info = JSON.parse(localStorage.getItem("instanceEndpoints"))
		const url = new URL(info.login)
		return await fetch(url.origin + "/api/auth/login", options).then(response => response.json())
			.then(response => {
				console.log(response)
				if (response.message == "Invalid Form Body") return response.errors.login._errors[0].message

				//this.serverurls||!this.email||!this.token
				adduser({serverurls: JSON.parse(localStorage.getItem("instanceinfo")),email: username,token: response.token})
				location.href = "/channels/@me"
				return response.token
			})
	} catch (error) {
		console.error("Error:", error)
	}
}

async function setInstance(url) {
	url = new URL(url)

	async function attempt(aurl) {
		const info = await fetch(aurl.toString() + (aurl.pathname.includes("api") ? "" : "api") + "/policies/instance/domains")
			.then(x => x.json())

		return {
			api: info.apiEndpoint,
			gateway: info.gateway,
			cdn: info.cdn,
			wellknown: url,
			login: aurl.toString()
		}
	}
	try {
		return await attempt(url)
	} catch {}

	const wellKnown = await fetch(url.origin + "/.well-known/spacebar")
		.then(x => x.json())
		.then(x => new URL(x.api))
	return await attempt(wellKnown)
}

async function check(event) {
	event.preventDefault()
	const h = await login(event.srcElement[1].value, event.srcElement[2].value)
	document.getElementById("wrong").textContent = h
}

let instancein
let verify
async function checkInstance() {
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

document.addEventListener("DOMContentLoaded", async () => {
	if (document.getElementById("form")) document.getElementById("form").addEventListener("submit", check)

	instancein = document.getElementById("instancein")
	verify = document.getElementById("verify")
	let timeout = 0

	instancein.addEventListener("keydown", () => {
		verify.textContent = "Waiting to check Instance"
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(checkInstance, 1000)
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
})
