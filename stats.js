const { getAPIURLs, handleEndpoint } = require("./util.js")
const fs = require("node:fs")
let uptimeObject = {}

if (fs.existsSync("./instanceUptime.json")) uptimeObject = JSON.parse(fs.readFileSync("./instanceUptime.json", "utf8"))

const calcStats = instance => {
	const obj = uptimeObject[instance.name]
	if (!obj) return

	const day = Date.now() - 1000 * 60 * 60 * 24
	const week = Date.now() - 1000 * 60 * 60 * 24 * 7
	let alltime = -1
	let totalTimePassed = 0
	let daytime = -1
	let weektime = -1
	let online = false

	let i = 0
	for (const thing of obj) {
		online = thing.online
		const stamp = thing.time
		if (alltime == -1) alltime = 0

		let timepassed
		if (obj[i + 1]) timepassed = obj[i + 1].time - stamp
		else timepassed = Date.now() - stamp

		totalTimePassed += timepassed
		alltime += online * timepassed
		if (stamp > week) {
			if (weektime == -1) weektime = online * (stamp - week)
			else weektime += online * timepassed

			if (stamp > day) {
				if (daytime == -1) daytime = online * (stamp - day)
				else daytime += online * timepassed
			}
		}
		i++
	}
	instance.online = online

	alltime /= totalTimePassed

	if (totalTimePassed > 1000 * 60 * 60 * 24) {
		if (daytime == -1) daytime = online * 1000 * 60 * 60 * 24
		daytime /= 1000 * 60 * 60 * 24

		if (totalTimePassed > 1000 * 60 * 60 * 24 * 7) {
			if (weektime == -1) weektime = online * 1000 * 60 * 60 * 24 * 7
			weektime /= 1000 * 60 * 60 * 24 * 7
		} else weektime = alltime
	} else {
		weektime = alltime
		daytime = alltime
	}

	instance.uptime = {daytime, weektime, alltime}
}

const setStatus = (instance, status) => {
	const name = instance.name
	let obj = uptimeObject[name]
	let needSetting = false
	if (obj) {
		if (obj.at(-1).online != status) needSetting = true
	} else {
		obj = []
		uptimeObject[name] = obj
		needSetting = true
	}

	if (needSetting) {
		obj.push({time: Date.now(), online: status})
		fs.writeFile("./instanceUptime.json", JSON.stringify(uptimeObject, null, "\t"), () => {})
	}
	calcStats(instance)
}

const observe = async instances => {
	const resolveInstance = async instance => {
		calcStats(instance)
		let api

		const urls = await getAPIURLs(instance.url)
		if (urls) api = urls.api

		if (!api) {
			setStatus(instance, false)
			console.warn(instance.name + " does not resolve API URL")
			setTimeout(() => {
				resolveInstance(instance)
			}, 1000 * 60 * 30)
			return
		}
		api = handleEndpoint(api)

		const check = async () => {
			const res = await fetch(api + "/ping", {
				method: "HEAD"
			}).catch(e => {
				console.warn("[" + new Date().toISOString() + "] Unable to reach " + instance.name + " (" + e.message + ")")
				setStatus(instance, false)
			})
			if (res) {
				console.warn("[" + new Date().toISOString() + "] Got " + res.status + " from " + instance.name)
				setStatus(instance, res.ok)
			}
		}

		setTimeout(() => {
			check()
			setInterval(() => {
				check()
			}, 1000 * 60 * 20)
		}, Math.random() * 1000 * 60 * 10)
	}

	for (const instance of instances) {
		resolveInstance(instance)
	}
}

module.exports.observe = observe
module.exports.uptime = uptimeObject
