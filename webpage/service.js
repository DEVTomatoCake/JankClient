"use strict"

let lastCache
let lastChecked = 0
const checkCache = async () => {
	if (lastChecked + 1000 * 60 * 30 > Date.now()) return
	lastChecked = Date.now()

	const prevCache = await caches.match("/getupdates")
	if (prevCache) lastCache = await prevCache.text()

	fetch("/getupdates").then(async data => {
		const text = await data.clone().text()
		if (lastCache != text) {
			caches.delete("cache")
			console.warn("Cache has been updated")
		}
	})
}

self.addEventListener("activate", event => {
	event.waitUntil((async () => {
		if ("navigationPreload" in self.registration) await self.registration.navigationPreload.enable()
	})())

	self.clients.claim()

	checkCache()
})

self.addEventListener("push", event => {
	const data = event.data.json()
	const notification = new self.Notification(data.title, {
		body: data.body,
		icon: data.icon,
		image: data.image
	})

	notification.addEventListener("click", () => {
		self.clients.matchAll({
			type: "window",
			includeUncontrolled: true
		}).then(clientList => {
			// If there is at least one client (opened page), focus it.
			if (clientList.length > 0) return clientList[0].focus()

			return self.clients.openWindow(data.uri)
		})
	})
})

const isindexhtml = url => {
	const parsed = new URL(url)
	return parsed.pathname.startsWith("/channels/")
}

self.addEventListener("fetch", event => {
	const url = new URL(event.request.url)
	if (event.request.method == "GET" && url.protocol == "https:" && (event.request.mode == "navigate" || event.request.mode == "no-cors" || event.request.mode == "cors")) {
		event.respondWith((async () => {
			const preloadResponse = await event.preloadResponse
			if (preloadResponse) return preloadResponse

			checkCache()

			const cache = await caches.open("cache")

			if (url.origin != self.origin && !event.request.url.startsWith("https://cdnjs.cloudflare.com/ajax/libs/twemoji/")) {
				console.log("External origin request to " + event.request.url)
				return await fetch(event.request)
			}

			const requestUrl = isindexhtml(event.request.url) ? "/" : event.request
			if (!url.pathname.startsWith("/api/")) {
				const responseFromCache = await cache.match(requestUrl)
				if (responseFromCache && (
					url.pathname == "/emoji.bin" ||
					url.pathname == "/favicon.ico" || url.pathname == "/logo.svg" || url.pathname == "/logo.webp" ||
					url.pathname == "/manifest.json" ||
					url.pathname.startsWith("/font/") || url.pathname.startsWith("/icons/") ||
					url.pathname.startsWith("/cdn/") // If running on the same domain as the CDN
				)) return responseFromCache
				if (responseFromCache) console.log("Found a cached response for " + (isindexhtml(event.request.url) ? "/" : url.pathname))
			}

			const responseFromNetwork = await fetch(requestUrl)
			cache.put(requestUrl, responseFromNetwork.clone())
			return responseFromNetwork
		})())
	}
})
