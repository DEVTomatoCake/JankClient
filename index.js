#! /usr/bin/env node

"use strict"

const fs = require("node:fs")
const path = require("node:path")

const express = require("express")
const app = express()

app.use("/", (req, res) => {
	const reqPath = req.path.replace(/[^\w.]/g, "")

	if (fs.existsSync(path.join(__dirname, "webpage", reqPath))) res.sendFile(path.join(__dirname, "webpage", reqPath))
	else if (fs.existsSync(path.join(__dirname, "webpage", "font", reqPath))) res.sendFile(path.join(__dirname, "webpage", "font", reqPath))
	else if (fs.existsSync(path.join(__dirname, "webpage", reqPath + ".html"))) res.sendFile(path.join(__dirname, "webpage", reqPath + ".html"))
	else res.sendFile(path.join(__dirname, "webpage", "index.html"))
})

const PORT = process.env.PORT || 25512
app.listen(PORT)
console.log("Started Jank Client on port " + PORT + "!")
