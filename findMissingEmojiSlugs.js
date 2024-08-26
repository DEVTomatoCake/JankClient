"use strict"

// https://www.russellcottrell.com/greek/utilities/SurrogatePairCalculator.htm

const emojiData = require("./EmojiList/data-by-group.json")

const fs = require("node:fs")
const emojis = eval("(() => {" + fs.readFileSync("./webpage/emojis.js") + "; return emojis})()")

const emojiDataFlat = emojiData.flatMap(category => category.emojis)

const emojiAliases = {}
Object.keys(emojis).forEach(slug => {
	if (/_tone\d$/.test(slug) || /(_medium)?_(dark|light|medium)_skin_tone$/.test(slug)) return

	const found = emojiDataFlat.find(emoji => emoji.slug == slug)
	if (found) {
		if (emojiAliases[found.emoji] && !emojiAliases[found.emoji].includes(slug)) emojiAliases[found.emoji].push(slug)
		else emojiAliases[found.emoji] = [slug]
	} else {
		if (emojiAliases[emojis[slug]] && !emojiAliases[emojis[slug]].includes(slug)) emojiAliases[emojis[slug]].push(slug)
		else emojiAliases[emojis[slug]] = [slug]
	}

	const foundByEmoji = emojiDataFlat.find(emoji => emoji.emoji == emojis[slug])
	if (foundByEmoji) {
		if (emojiAliases[foundByEmoji.emoji] && !emojiAliases[foundByEmoji.emoji].includes(foundByEmoji.slug)) emojiAliases[foundByEmoji.emoji].push(foundByEmoji.slug)
		else emojiAliases[foundByEmoji.emoji] = [foundByEmoji.slug]
	} else {
		if (emojiAliases[emojis[slug]] && !emojiAliases[emojis[slug]].includes(slug)) emojiAliases[emojis[slug]].push(slug)
		else emojiAliases[emojis[slug]] = [slug]
	}
})

console.log(emojiAliases)
fs.writeFileSync("./emojiToSlug.json",
	JSON.stringify(emojiAliases, null, "\t")
)
