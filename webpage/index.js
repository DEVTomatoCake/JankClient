"use strict"

const users = getBulkUsers()
if (!users.currentuser) location.href = "/login"
console.log(users)
const instance = users.users[users.currentuser].serverurls


let thisuser
try {
	thisuser = new LocalUser(users.users[users.currentuser])
	thisuser.initwebsocket().then(() => {
		thisuser.loaduser()
		thisuser.init()
		document.getElementById("loading").classList.add("doneloading")
		document.getElementById("loading").classList.remove("loading")
	})
} catch {
	document.getElementById("load-desc").textContent = "Account unable to start"
	thisuser = new LocalUser(-1)
}

const showAccountSwitcher = () => {
	const table = document.createElement("div")
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
		span.textContent = new URL(instance.wellknown).hostname
		user.append(span)
		userinfo.append(user)

		span.classList.add("serverURL")
		table.append(userinfo)

		userinfo.addEventListener("click", () => {
			thisuser.unload()
			thisuser.swapped = true
			document.getElementById("loading").classList.remove("doneloading")
			document.getElementById("loading").classList.add("loading")
			thisuser = new LocalUser(thing)
			users.currentuser = thing.uid
			localStorage.setItem("userinfos", JSON.stringify(users))
			thisuser.initwebsocket().then(() => {
				thisuser.loaduser()
				thisuser.init()
				document.getElementById("loading").classList.add("doneloading")
				document.getElementById("loading").classList.remove("loading")
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
	table.append(td)

	table.classList.add("accountSwitcher")
	if (Contextmenu.currentmenu != "") {
		Contextmenu.currentmenu.remove()
	}
	Contextmenu.currentmenu = table
	console.log(table)
	document.body.append(table)
}

const userSettings = () => {
	thisuser.showusersettings()
}

document.addEventListener("DOMContentLoaded", async () => {
	const menu = new Contextmenu()
	menu.addbutton("Create channel", () => {
		thisuser.lookingguild.createchannels()
	}, null, () => thisuser.isAdmin())

	menu.addbutton("Create category", () => {
		thisuser.lookingguild.createcategory()
	}, null, () => thisuser.isAdmin())
	menu.bind(document.getElementById("channels"))

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

	Array.from(document.getElementsByClassName("theme-icon"))
		.forEach(async elem => {
			elem.appendChild(await LocalUser.loadSVG(elem.getAttribute("data-icon")))
		})

	document.getElementById("settings").addEventListener("click", userSettings)

	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("/service.js")

		/*const subscription = await navigator.serviceWorker.ready.then(async registration => {
			const sub = await registration.pushManager.getSubscription()
			if (sub) return sub

			const res = await fetch(instance.api + "/notifications/webpush/vapidKey")
			if (!res.ok) throw new Error("Failed to get VAPID key: " + res.status + " " + res.statusText)

			return registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: await res.text()
			})
		})

		await fetch(instance.api + "/notifications/webpush/subscribe", {
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
	fetch(instance.api + "/notifications/webpush/testNotification", {
		headers: {
			"Content-Type": "application/json",
			Authorization: users.users[users.currentuser].token
		}
	})
}

// eslint-disable-next-line no-unused-vars
const editchannel = channel => {
	channel.editChannel()
}

// eslint-disable-next-line no-unused-vars
const messagelist = []

let images = []
let replyingto = null

const emojiConversions = {
	":D": "😄",
	":)": "😊",
	":(": "😞",
	":P": "😛",
	";)": "😉",
	":*": "😘",
	":O": "😲",
	":-)": "🙂",
	":-(": "🙁",
	"D:": "😧"
}

const typebox = document.getElementById("typebox")
const markdown = new MarkDown("", thisuser)
markdown.giveBox(typebox)
typebox.markdown = markdown

typebox.addEventListener("keyup", event => {
	const channel = thisuser.channelfocus

	if (event.key == "Enter" && !event.shiftKey) {
		event.preventDefault()

		let content = markdown.rawString.trim()
			.replace(/:([-+\w]+):/g, (match, p1) => emojis[p1] || match)

		if (thisuser.settings.convert_emoticons)
			Object.keys(emojiConversions).forEach(emoji => {
				content = content.replaceAll(emoji, emojiConversions[emoji])
			})

		if (channel.editing) {
			channel.editing.edit(content)
			channel.editing = null
		} else {
			if (content == "" && images.length == 0) return

			replyingto = thisuser.channelfocus.replyingto
			const replying = replyingto
			if (replyingto) replyingto.div.classList.remove("replying")

			channel.replyingto = null
			channel.sendMessage(content, {
				attachments: images,
				replyingto: replying
			})
			thisuser.channelfocus.makereplybox()
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
	Array.from(event.clipboardData.files).forEach(f => {
		const file = Attachment.initFromBlob(f)
		event.preventDefault()
		const html = file.upHTML(images, f)
		document.getElementById("pasteimage").appendChild(html)
		images.push(f)
	})
})

let triggered = false
document.getElementById("messagecontainer").addEventListener("scroll", () => {
	const messagecontainer = document.getElementById("messagecontainer")
	if (messagecontainer.scrollTop < 2000) {
		if (!triggered && thisuser.lookingguild) {
			thisuser.lookingguild.prevchannel.grabBefore().then(() => {
				triggered = false
				if (messagecontainer.scrollTop == 0) messagecontainer.scrollTop = 1
			})
		}
		triggered = true
	} else if (Math.abs(messagecontainer.scrollHeight - messagecontainer.scrollTop - messagecontainer.clientHeight) < 3)
		thisuser.lookingguild.prevchannel.readbottom()
})

if (screen.width <= 600) {
	const collapse = () => {
		document.getElementById("mobileback").removeAttribute("hidden")

		document.getElementById("channels").parentElement.classList.add("collapse")
		document.getElementById("servers").parentElement.classList.add("collapse")
	}
	collapse()

	document.getElementById("channelw").addEventListener("click", () => {
		collapse()
	})

	document.getElementById("mobileback").addEventListener("click", () => {
		document.getElementById("mobileback").setAttribute("hidden", "")

		document.getElementById("channels").parentElement.classList.remove("collapse")
		document.getElementById("servers").parentElement.classList.remove("collapse")
	})
}
