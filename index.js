#! /usr/bin/env node

"use strict"

const fs = require("node:fs")
const fsPromises = require("node:fs/promises")
const path = require("node:path")

const express = require("express")
const app = express()
app.disable("x-powered-by")

const compression = require("compression")
app.use(compression())

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

	next()
})

app.get("/getupdates", async (req, res) => {
	const out = await fsPromises.stat(path.join(__dirname, "webpage"))
	res.header("Content-Type", "text/plain")
	res.send("" + Math.round(out.mtimeMs))
})

app.use("/", (req, res) => {
	const reqPath = req.path.replace(/[^\w.-]/g, "")

	if (reqPath.length == 0 || reqPath.startsWith("channels") || reqPath.startsWith("invite")) return res.sendFile(path.join(__dirname, "webpage", "index.html"))
	if (reqPath == "login") return res.sendFile(path.join(__dirname, "webpage", "login.html"))
	if (reqPath == "register") return res.sendFile(path.join(__dirname, "webpage", "register.html"))

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
	if (/^connections[\w-]{1,64}callback$/.test(reqPath)) return res.sendFile(path.join(__dirname, "webpage", "connections.html"))
})

const PORT = process.env.PORT || 25512
app.listen(PORT, () => {
	console.log("Started Jank Client on port " + PORT + "!")
})
