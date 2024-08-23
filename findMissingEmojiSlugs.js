"use strict"

const emojiData = require("./EmojiList/data-by-group.json")

const fs = require("node:fs")
const emojis = eval("(() => {" + fs.readFileSync("./webpage/emojis.js") + "; return emojis})()")

const emojiDataFlat = emojiData.flatMap(category => category.emojis)

let i = 0
Object.keys(emojis).forEach(slug => {
	if (/_tone\d$/.test(slug) || /(_medium)?_(dark|light|medium)_skin_tone$/.test(slug)) return

	if (!emojiDataFlat.some(emoji => emoji.slug == slug)) console.log("[" + ("" + i++).padStart(3, "0") + "] Missing slug: " + slug)
})
