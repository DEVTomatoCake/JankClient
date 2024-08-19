"use strict"

const fsPromises = require("node:fs").promises

const UglifyJS = require("uglify-js")
const CleanCSS = require("clean-css")

const nameCache = {}
const defaultOptions = {
	compress: {
		passes: 5,
		unsafe: true,
		unsafe_Function: true,
		unsafe_math: true,
		unsafe_proto: true,
		unsafe_regexp: true
	}
}

const results = []
const minifyFile = async (inputPath, options = {}) => {
	const filename = inputPath.split("/").pop()
	const content = await fsPromises.readFile(inputPath, "utf8")

	let result = {}
	if (filename.endsWith(".js")) {
		result = UglifyJS.minify({
			[inputPath]: content
		}, {
			sourceMap: {
				root: "https://spacebar.vanillaminigames.net/",
				filename,
				url: filename + ".map"
			},
			warnings: "verbose",
			parse: {
				shebang: false
			},
			toplevel: true,
			nameCache,
			mangle: true,
			...defaultOptions,
			...options//,
			//mangle: false // temp override to fix re-defined variables
		})

		if (result.error) throw result.error
		if (result.warnings && result.warnings.length > defaultOptions.compress.passes)
			console.log(inputPath, result.warnings.filter(w => !w.includes(" last_count: ") && !w.includes("Retaining variable ")))
	} else if (filename.endsWith(".css")) {
		const clean = new CleanCSS({
			compatibility: {
				colors: {
					hexAlpha: true
				},
				properties: {
					shorterLengthUnits: true,
					urlQuotes: false
				}
			},
			level: {
				2: {
					mergeSemantically: true,
					removeUnusedAtRules: true
				}
			},
			inline: false,
			sourceMap: true,
			...options
		})

		const output = clean.minify(content)
		result = {
			code: output.styles + "\n/*# sourceMappingURL=" + filename + ".map */",
			map: output.sourceMap.toString().replace("$stdin", filename)
		}

		if (output.warnings.length > 0 || output.errors.length > 0) console.log(inputPath, output.warnings, output.errors)
	} else if (filename.endsWith(".json")) {
		result = {
			code: JSON.stringify(JSON.parse(content))
		}
	} else return console.error("Unknown minify file type: " + inputPath)

	if (result.code.length >= content.length) return console.log("No reduction for " + inputPath + " (" + content.length + " -> " + result.code.length + ")")

	if (process.env.MINIFY_ENABLED) {
		await fsPromises.writeFile(inputPath, result.code)
		if (result.map) await fsPromises.writeFile(inputPath + ".map", result.map)
	}

	results.push({
		path: inputPath.slice(2),
		size: content.length,
		compressed: result.code.length,
		"% reduction": Number.parseFloat((100 - (result.code.length / content.length * 100)).toFixed(1))
	})
}

const generateJSOptions = (retain = []) => ({
	compress: {
		...defaultOptions.compress,
		top_retain: retain
	},
	mangle: {
		reserved: retain
	}
})

const minify = async () => {
	await minifyFile("./webpage/attachment.js", generateJSOptions(["Attachment"]))
	await minifyFile("./webpage/audio.js", generateJSOptions(["Audio"]))
	await minifyFile("./webpage/channel.js", generateJSOptions(["Channel"]))
	await minifyFile("./webpage/component.js", generateJSOptions(["Component"]))
	await minifyFile("./webpage/connections.js", generateJSOptions())
	await minifyFile("./webpage/contextmenu.js", generateJSOptions(["Contextmenu"]))
	await minifyFile("./webpage/dialog.js", generateJSOptions(["Dialog"]))
	await minifyFile("./webpage/direct.js", generateJSOptions(["Group", "Direct"]))
	await minifyFile("./webpage/embed.js", generateJSOptions(["Embed"]))
	await minifyFile("./webpage/emoji.js", generateJSOptions(["Emoji"]))
	await minifyFile("./webpage/emojis.js", generateJSOptions(["emojis", "emojiRegex"]))
	//await minifyFile("./webpage/guild.js", generateJSOptions(["Guild"]))
	//await minifyFile("./webpage/index.js", generateJSOptions(["requestTestNotif"]))
	await minifyFile("./webpage/invite.js", generateJSOptions())
	await minifyFile("./webpage/infiniteScroller.js", generateJSOptions(["InfiniteScroller"]))
	//await minifyFile("./webpage/localuser.js", generateJSOptions(["LocalUser"]))
	//await minifyFile("./webpage/login.js", generateJSOptions(["getBulkInfo", "getBulkUsers"]))
	await minifyFile("./webpage/markdown.js", generateJSOptions(["MarkDown"]))
	await minifyFile("./webpage/member.js", generateJSOptions(["Member"]))
	await minifyFile("./webpage/message.js", generateJSOptions(["Message"]))
	await minifyFile("./webpage/permissions.js", generateJSOptions(["Permissions"]))
	await minifyFile("./webpage/register.js", generateJSOptions())
	await minifyFile("./webpage/role.js", generateJSOptions(["Role"]))
	await minifyFile("./webpage/service.js", generateJSOptions())
	await minifyFile("./webpage/settings.js", generateJSOptions(["Settings", "RoleList"]))
	await minifyFile("./webpage/snowflake.js", generateJSOptions(["SnowFlake"]))
	await minifyFile("./webpage/user.js", generateJSOptions(["User"]))

	await minifyFile("./webpage/style.css")
	await minifyFile("./webpage/manifest.json")

	results.push({
		path: "= Total",
		size: results.reduce((acc, cur) => acc + cur.size, 0),
		compressed: results.reduce((acc, cur) => acc + cur.compressed, 0),
		"% reduction": Number.parseFloat((100 - (results.reduce((acc, cur) => acc + cur.compressed, 0) / results.reduce((acc, cur) => acc + cur.size, 0) * 100)).toFixed(1))
	})
	console.table(results.sort((a, b) => a["% reduction"] - b["% reduction"]))
}
minify()
