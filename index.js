#! /usr/bin/env node

"use strict"

const fs = require("node:fs")
const fsPromises = require("node:fs/promises")
const path = require("node:path")

const express = require("express")
const app = express()
app.disable("x-powered-by")

const { observe, uptime } = require("./stats.js")
const { getAPIURLs, handleEndpoint } = require("./util.js")

const instances = []
fetch("https://raw.githubusercontent.com/spacebarchat/spacebarchat/master/instances/instances.json").then(res => res.json()).then(json => {
	for (const instance of json) {
		console.log(instance)
		instances.push(instance)
	}
	observe(instances)
})

const compression = require("compression")
app.use(compression({
	chunkSize: 1024 * 256
}))

app.use((req, res, next) => {
	res.header("X-Frame-Options", "DENY")
	res.header("X-Content-Type-Options", "nosniff")
	res.header("Report-To", JSON.stringify({
		group: "default",
		max_age: 2592000,
		endpoints: [{
			url: "https://api.tomatenkuchen.com/csp-violation"
		}],
		include_subdomains: true
	}))
	res.header("Referrer-Policy", "no-referrer")
	res.header("Cross-Origin-Opener-Policy", "same-origin")

	res.header("Content-Security-Policy",
		"default-src 'none' 'report-sample'; " +
		"img-src 'self' https: http: blob:; " +
		"script-src-elem 'self' https://www.google.com/recaptcha/api.js https://www.gstatic.com/recaptcha/ https://js.hcaptcha.com/1/api.js; " +
		"style-src-elem 'self'; " +
		"font-src 'self'; " +
		"media-src https: http:; " +
		"connect-src https: wss: http: ws:; " +
		"form-action 'none'; " +
		"frame-ancestors 'none'; " +
		"frame-src https://newassets.hcaptcha.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/; " +
		"manifest-src " + req.get("host") + "/manifest.json; " +
		"worker-src " + req.get("host") + "/service.js; " +
		"report-uri https://api.tomatenkuchen.com/csp-violation"
	)

	res.header("Permissions-Policy",
		"accelerometer=(), " +
		"ambient-light-sensor=(), " +
		"attribution-reporting=(), " +
		"autoplay=(), " +
		"bluetooth=(), " +
		"browsing-topics=(), " +
		"camera=(), " +
		"compute-pressure=(), " +
		"display-capture=(), " +
		"document-domain=(), " +
		"encrypted-media=(), " +
		"fullscreen=(), " +
		"gamepad=(), " +
		"geolocation=(), " +
		"gyroscope=(), " +
		"hid=(), " +
		"identity-credentials-get=(), " +
		"idle-detection=(), " +
		"local-fonts=(), " +
		"magnetometer=(), " +
		"microphone=(), " +
		"midi=(), " +
		"otp-credentials=(), " +
		"payment=(), " +
		"picture-in-picture=(), " +
		"publickey-credentials-create=(), " +
		"publickey-credentials-get=(), " +
		"screen-wake-lock=(), " +
		"serial=(), " +
		"speaker-selection=(), " +
		"storage-access=(), " +
		"usb=(), " +
		"web-share=(), " +
		"window-management=(), " +
		"xr-spatial-tracking=()"
	)

	next()
})

app.get("/getupdates", async (req, res) => {
	const out = await fsPromises.stat(path.join(__dirname, "webpage"))
	res.header("Content-Type", "text/plain")
	res.send("" + Math.round(out.mtimeMs))
})

app.get("/instances", async (req, res) => {
	res.send(JSON.stringify(instances))
})
app.get("/uptime", async (req, res) => {
	if (!req.query.name || typeof req.query.name != "string") return res.status(400).send("No name query parameter provided!")
	res.send(uptime[req.query.name])
})

const needsEmbed = str =>
	str == "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" || str == "Mozilla/5.0 (compatible; Spacebar/1.0; +https://github.com/spacebarchat/server)"

const encode = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")

const inviteres = async (res, reqPath, query) => {
	try {
		const code = reqPath.replace("invite", "")
		const urls = await getAPIURLs(query.instance)

		const inviteRes = await fetch(urls.api + "/invites/" + code)
		const json = await inviteRes.json()

		const title = json.guild.name
		const description = (json.inviter ? json.inviter.username : "Someone") + " has invited you to " + json.guild.name + (json.guild.description ? ": " + json.guild.description : "")

		let icon = urls.cdn + "/embed/avatars/" + ((json.guild.id >>> 22) % 6) + ".png?size=256"
		if (json.guild.icon) icon = urls.cdn + "/icons/" + json.guild.id + "/" + json.guild.icon + "." + (json.guild.icon.startsWith("a_") ? "gif" : "png") + "?size=256"

		const html =
			"<!DOCTYPE html>" +
			"<html lang=\"en\">" +
			"<head>" +
				"<meta charset=\"utf-8\">" +
				"<title>" + encode(title) + "</title>" +
				"<meta content=\"" + encode(title) + "\" property=\"og:title\">" +
				"<meta content=\"" + encode(description) + "\" property=\"og:description\">" +
				"<meta content=\"" + encode(icon) + "\" property=\"og:image\">" +
			"</head>" +
			"</html>"

		res.set("Content-Type", "text/html")
		res.send(html)
	} catch (e) {
		console.error(e)
	}
}

app.use("/", async (req, res) => {
	const reqPath = req.path.replace(/[^\w.-]/g, "")

	if (reqPath.length == 0) return res.sendFile(path.join(__dirname, "webpage", "home.html"))
	if (reqPath.startsWith("channels")) return res.sendFile(path.join(__dirname, "webpage", "index.html"))
	if (reqPath == "login") return res.sendFile(path.join(__dirname, "webpage", "login.html"))
	if (reqPath == "register") return res.sendFile(path.join(__dirname, "webpage", "register.html"))
	if (/^connections[\w-]{1,64}callback$/.test(reqPath)) return res.sendFile(path.join(__dirname, "webpage", "connections.html"))

	if (reqPath.startsWith("invite") && reqPath != "invite.js") {
		if (!req.query.instance) return res.status(400).send("No instance query parameter provided!")

		if (needsEmbed(req.get("User-Agent"))) await inviteres(res, reqPath, req.query)
		else res.sendFile(path.join(__dirname, "webpage", "invite.html"))
		return
	}

	if (!/^[\w-]+\.\w+$/.test(reqPath)) {
		res.status(400).send("Invalid path!")
		return console.warn("Invalid path requested: " + reqPath + " | " + req.originalUrl)
	}

	if (fs.existsSync(path.join(__dirname, "webpage", reqPath))) return res.sendFile(path.join(__dirname, "webpage", reqPath))
	if (fs.existsSync(path.join(__dirname, "webpage", "font", reqPath.replace("font", ""))))
		return res.sendFile(path.join(__dirname, "webpage", "font", reqPath.replace("font", "")), {
			maxAge: 1000 * 60 * 60 * 24 * 90
		})
	if (fs.existsSync(path.join(__dirname, "webpage", "icons", "bootstrap", reqPath.replace("iconsbootstrap", ""))))
		return res.sendFile(path.join(__dirname, "webpage", "icons", "bootstrap", reqPath.replace("iconsbootstrap", "")), {
			maxAge: 1000 * 60 * 60 * 24
		})
	if (fs.existsSync(path.join(__dirname, "webpage", "icons", reqPath.replace("icons", ""))))
		return res.sendFile(path.join(__dirname, "webpage", "icons", reqPath.replace("icons", "")), {
			maxAge: 1000 * 60 * 60 * 24
		})

	console.warn("Unknown path requested: " + reqPath + " | " + req.originalUrl)
	res.status(404).send("Unknown path!")
})

const PORT = process.env.PORT || 25512
app.listen(PORT, () => {
	console.warn("Started Jank Client on http://localhost:" + PORT)
})

module.exports.getAPIURLs = getAPIURLs
module.exports.handleEndpoint = handleEndpoint
