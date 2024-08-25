"use strict"

const users = getBulkUsers()
if (!users.currentuser) location.href = "/login"
console.log(users)

let thisuser
try {
	thisuser = new LocalUser(users.users[users.currentuser])
	thisuser.initwebsocket().then(() => {
		thisuser.loaduser()
		thisuser.init()
		document.getElementById("loading").classList.add("doneloading")
		document.getElementById("loading").classList.remove("loading")
	})
} catch (e) {
	console.error(e)
	document.getElementById("load-desc").textContent = "Account unable to start"
	thisuser = new LocalUser(-1)
}

const showAccountSwitcher = () => {
	const container = document.createElement("div")
	for (const thing of Object.values(users.users)) {
		const userinfo = document.createElement("div")
		userinfo.classList.add("flexltr", "switchtable")

		const pfp = document.createElement("img")
		pfp.classList.add("pfp")
		pfp.crossOrigin = "anonymous"
		pfp.src = thing.pfpsrc
		pfp.loading = "lazy"
		userinfo.append(pfp)

		const user = document.createElement("div")
		user.classList.add("userinfo")
		user.append(thing.username)
		user.append(document.createElement("br"))

		const span = document.createElement("span")
		span.textContent = new URL(thing.serverurls.wellknown).hostname
		user.append(span)
		userinfo.append(user)

		span.classList.add("serverURL")
		container.append(userinfo)

		userinfo.addEventListener("click", () => {
			thisuser.unload()
			thisuser.swapped = true

			const loading = document.getElementById("loading")
			loading.classList.remove("doneloading")
			loading.classList.add("loading")

			thisuser = new LocalUser(thing)
			users.currentuser = thing.uid
			localStorage.setItem("userinfos", JSON.stringify(users))

			thisuser.initwebsocket().then(() => {
				thisuser.loaduser()
				thisuser.init()

				loading.classList.add("doneloading")
				loading.classList.remove("loading")
			})
			userinfo.remove()
		})
	}

	const td = document.createElement("div")
	td.classList.add("switchtable")
	td.append("Switch accounts ⇌")
	td.addEventListener("click", () => {
		location.href = "/login"
	})
	container.append(td)

	container.classList.add("accountSwitcher")
	if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()

	Contextmenu.currentmenu = container
	document.body.append(container)
}

document.addEventListener("DOMContentLoaded", async () => {
	const menu = new Contextmenu()
	menu.addbutton("Create channel", () => {
		thisuser.lookingguild.createchannels()
	}, null, () => thisuser.isAdmin())

	menu.addbutton("Create category", () => {
		thisuser.lookingguild.createcategory()
	}, null, () => thisuser.isAdmin())
	menu.bindContextmenu(document.getElementById("channels"))

	const userinfo = document.getElementById("userinfo")
	userinfo.addEventListener("click", event => {
		event.stopImmediatePropagation()
		showAccountSwitcher()
	})
	const switchaccounts = document.getElementById("switchaccounts")
	switchaccounts.addEventListener("click", event => {
		event.stopImmediatePropagation()
		showAccountSwitcher()
	})

	document.getElementById("settings").addEventListener("click", () => {
		thisuser.showusersettings()
	})

	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("/service.js")

		/*const subscription = await navigator.serviceWorker.ready.then(async registration => {
			const sub = await registration.pushManager.getSubscription()
			if (sub) return sub

			const res = await fetch(this.info.api + "/notifications/webpush/vapidKey")
			if (!res.ok) throw new Error("Failed to get VAPID key: " + res.status + " " + res.statusText)

			return registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: await res.text()
			})
		})

		await fetch(this.info.api + "/notifications/webpush/subscribe", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: users.users[users.currentuser].token
			},
			body: JSON.stringify(subscription)
		})
		console.log("Subscribed to push notifications")*/
	}
})

// eslint-disable-next-line no-unused-vars
const requestTestNotif = async () => {
	fetch(thisuser.info.api + "/notifications/webpush/testNotification", {
		headers: {
			"Content-Type": "application/json",
			Authorization: users.users[users.currentuser].token
		}
	})
}

const emojiConversions = {
	"😠": [">:(", ">:-(", ">=(", ">=-("],
	"😊": [":\")", ":-\")", "=\")", "=-\")"],
	"💔": ["</3", "<\\3"],
	"😕": [":-\\", ":-/", "=-\\", "=-/"],
	"😢": [":'(", ":'-(", ":,(", ":,-(", "='(", "='-(", "=,(", "=,-("],
	"😦": [":(", ":-(", "=(", "=-("],
	"❤️": ["<3"],
	"👿": ["]:(", "]:-(", "]=(", "]=-("],
	"😇": ["o:)", "O:)", "o:-)", "O:-)", "0:)", "0:-)", "o=)", "O=)", "o=-)", "O=-)", "0=)", "0=-)"],
	"😂": [":'D", ":'-D", ":,D", ":,-D", "='D", "='-D", "=,D", "=,-D"],
	"😗": [":*", ":-*", "=*", "=-*"],
	"😆": ["x-)", "X-)"],
	"😐": [":|", ":-|", "=|", "=-|"],
	"😮": [":o", ":-o", ":O", ":-O", "=o", "=-o", "=O", "=-O"],
	"😡": [":@", ":-@", "=@", "=-@"],
	"😄": [":D", ":-D", "=D", "=-D"],
	"🥲": [":')", ":'-)", ":,)", ":,-)", "='-)", "='-)", "=,)", "=,-)"],
	"🙂": [":)", ":-)", "=)", "=-)"],
	"😈": ["]:)", "]:-)", "]=)", "]=-)"],
	"😭": [":,'(", ":'-(", ";(", ";-(", "=,'(", "=,'-("],
	"😛": [":P", ":-P", "=P", "=-P"],
	"😎": ["8-)", "B-)"],
	"😓": [",:(", ",:-(", ",=(", ",=-("],
	"😅": [",:)", ",:-)", ",=)", ",=-)"],
	"😒": [":s", ":-S", ":z", ":-Z", ":$", ":-$", "=s", "=-S", "=z", "=-Z", "=$", "=-$"],
	"😉": [";)", ";-)"]
}

let images = []
const typebox = document.getElementById("typebox")
const markdown = new MarkDown("", thisuser)
markdown.giveBox(typebox)
typebox.markdown = markdown

typebox.addEventListener("keyup", event => {
	const channel = thisuser.channelfocus

	if (event.key == "Enter" && !event.shiftKey) {
		event.preventDefault()

		let content = markdown.rawString.trim()
			.replace(/:([-+\w]+):/g, (match, p1) => {
				let found = Emoji.emojisFlat.find(emoji => emoji.slug == p1)
				if (!found) {
					found = Emoji.emojisFlat.find(emoji => emoji.slug == p1.replace(/(_medium)?_(dark|light|medium)_skin_tone$/, ""))
					if (found) {
						if (p1.endsWith("_medium_light_skin_tone")) return found.emoji + "🏼"
						if (p1.endsWith("_medium_dark_skin_tone")) return found.emoji + "🏽"
						if (p1.endsWith("_medium_skin_tone")) return found.emoji + "🏾"
						if (p1.endsWith("_light_skin_tone")) return found.emoji + "🏻"
						if (p1.endsWith("_dark_skin_tone")) return found.emoji + "🏿"
					}
				}

				return found ? found.emoji : match
			})

		if (thisuser.settings.convert_emoticons)
			Object.keys(emojiConversions).forEach(emoji => {
				emojiConversions[emoji].forEach(alias => {
					content = content.replaceAll(alias, emoji)
				})
			})

		if (channel.editing) {
			if (content.length == 0 && images.length == 0) {
				if (confirm("Do you want to delete this message?")) channel.editing.delete()
				channel.editing = null
				return
			}

			channel.editing.edit(content)
			channel.editing = null
		} else {
			if (content.length == 0 && images.length == 0) return

			const replyingto = channel.replyingto
			if (replyingto) replyingto.div.classList.remove("replying")

			channel.replyingto = null
			channel.sendMessage(content, {
				attachments: images,
				replyingto
			})
			channel.makereplybox()
		}

		images = []
		document.getElementById("pasteimage").innerHTML = ""
		typebox.innerHTML = ""
	} else channel.typingstart()
})
typebox.addEventListener("keydown", event => {
	if (event.key == "Enter" && !event.shiftKey) event.preventDefault()
})

document.addEventListener("paste", event => {
	if (event.clipboardData.files.length == 0) return
	event.preventDefault()

	Array.from(event.clipboardData.files).forEach(file => {
		const attachment = Attachment.initFromBlob(file)
		const html = attachment.upHTML(images, file)
		document.getElementById("pasteimage").appendChild(html)
		images.push(file)
	})
})

if (screen.width <= 600) {
	const mobileBack = document.getElementById("mobileback")

	const collapse = () => {
		mobileBack.removeAttribute("hidden")

		document.getElementById("channels").parentElement.classList.add("collapse")
		document.getElementById("servers").parentElement.classList.add("collapse")
	}
	collapse()

	document.getElementById("channelw").addEventListener("click", () => {
		collapse()
	})

	mobileBack.addEventListener("click", () => {
		mobileBack.setAttribute("hidden", "")

		document.getElementById("channels").parentElement.classList.remove("collapse")
		document.getElementById("servers").parentElement.classList.remove("collapse")
	})
}
