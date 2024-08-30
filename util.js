const handleEndpoint = (url = "", isAPI = false) => {
	let parsed = new URL(url).toString()
	if (parsed.endsWith("/")) parsed = parsed.slice(0, -1)
	if (!/\/v\d+$/.test(parsed) && isAPI) parsed += "/v9"
	return parsed
}
module.exports.handleEndpoint = handleEndpoint

const getAPIURLs = async str => {
	if (str.at(-1) != "/") str += "/"

	let api
	try {
		const info = await fetch(str + "/.well-known/spacebar").then(x => x.json())
		api = info.api
	} catch {
		return false
	}

	try {
		const info = await fetch(api + "/policies/instance/domains").then(x => x.json())
		return {
			api: handleEndpoint(info.apiEndpoint, true),
			gateway: handleEndpoint(info.gateway),
			cdn: handleEndpoint(info.cdn),
			wellknown: handleEndpoint(str)
		}
	} catch {
		return false
	}
}
module.exports.getAPIURLs = getAPIURLs
