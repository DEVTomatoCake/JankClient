const emojilist = require("./EmojiList/data-by-group.json")
console.log(emojilist)

const buffer = new ArrayBuffer(2 ** 26)
const view = new DataView(buffer, 0)
let i = 0

const write16 = numb => {
	view.setUint16(i,numb)
	i += 2
}
const write8 = numb => {
	view.setUint8(i,numb)
	i += 1
}
const writeString8 = str => {
	const encode = new TextEncoder("utf8").encode(str)
	write8(encode.length)
	for (const thing of encode) {
		write8(thing)
	}
}
const writeString16 = str => {
	const encode = new TextEncoder("utf8").encode(str)
	write16(encode.length)
	for (const thing of encode) {
		write8(thing)
	}
}
const writeStringNo = str => {
	const encode = new TextEncoder("utf8").encode(str)
	for (const thing of encode) {
		write8(thing)
	}
}

write16(emojilist.length)
for (const thing of emojilist) {
	writeString16(thing.name)
	write16(thing.emojis.length)
	for (const emoji of thing.emojis) {
		writeString8(emoji.name)
		write8(new TextEncoder("utf8").encode(emoji.emoji).length + 128 * emoji.skin_tone_support)
		writeStringNo(emoji.emoji)
	}
}
const out = new ArrayBuffer(i)
const ar = new Uint8Array(out)
const br = new Uint8Array(buffer)
for (const thing in ar) {
	ar[thing] = br[thing]
}
console.log(i,ar)

const decodeEmojiList = bufferDecode => {
	const viewDecode = new DataView(bufferDecode, 0)
	let j = 0

	const read16 = () => {
		const int = viewDecode.getUint16(j)
		j += 2
		return int
	}
	const read8 = () => {
		const int = viewDecode.getUint8(j)
		j += 1
		return int
	}
	const readStringNo = length => {
		const array = new Uint8Array(length)

		for (let k = 0;k < length;k++) {
			array[k] = read8()
		}
		return new TextDecoder("utf8").decode(array.buffer)
	}
	const readString8 = () => {
		return readStringNo(read8())
	}
	const readString16 = () => {
		return readStringNo(read16())
	}

	const build = []
	let cats = read16()

	for (; cats != 0; cats--) {
		const name = readString16()
		const emojis = []
		let emojinumber = read16()
		for (; emojinumber != 0; emojinumber--) {
			const name8 = readString8()
			const len = read8()
			const skin_tone_support = len > 127
			const emoji = readStringNo(len - skin_tone_support * 128)
			emojis.push({
				name: name8,
				skin_tone_support,
				emoji
			})
		}
		build.push({
			name,
			emojis
		})
	}
	return build
}
console.log(JSON.stringify(decodeEmojiList(out)))

const fs = require("node:fs")
fs.writeFile("./webpage/emoji.bin",new Uint8Array(out), () => {})
