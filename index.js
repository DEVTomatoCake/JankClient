#! /usr/bin/env node

"use strict"

const fs = require("node:fs")
const fsPromises = require("node:fs/promises")
const path = require("node:path")

const express = require("express")
const app = express()
app.disable("x-powered-by")

app.get("/getupdates", async (req, res) => {
	const out = await fsPromises.stat(path.join(__dirname, "webpage"))
	res.send("" + out.mtimeMs)
})

app.use("/", (req, res) => {
	const reqPath = req.path.replace(/[^\w.]/g, "")
	if (reqPath.length == 0) return res.sendFile(path.join(__dirname, "webpage", "index.html"))

	if (fs.existsSync(path.join(__dirname, "webpage", reqPath))) res.sendFile(path.join(__dirname, "webpage", reqPath))
	else if (fs.existsSync(path.join(__dirname, "webpage", "font", reqPath.replace("font", "")))) {
		res.sendFile(path.join(__dirname, "webpage", "font", reqPath.replace("font", "")), {
			maxAge: 1000 * 60 * 60 * 24 * 90
		})
	} else if (fs.existsSync(path.join(__dirname, "webpage", reqPath + ".html"))) res.sendFile(path.join(__dirname, "webpage", reqPath + ".html"))
	else if (/^connections[a-z]{1,20}callback$/.test(reqPath)) res.sendFile(path.join(__dirname, "webpage", "connections.html"))
	else res.sendFile(path.join(__dirname, "webpage", "index.html"))
})

const PORT = process.env.PORT || 25512
app.listen(PORT)
console.log("Started Jank Client on port " + PORT + "!")
