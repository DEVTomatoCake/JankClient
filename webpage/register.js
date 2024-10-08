"use strict"

const error = (e, message = "") => {
	let element = e.parentElement.getElementsByClassName("suberror")[0]
	if (element) {
		element.classList.remove("suberror")
		setTimeout(() => {
			element.classList.add("suberror")
		}, 100)
	} else {
		const div = document.createElement("div")
		div.classList.add("suberror", "suberrora")
		e.parentElement.append(div)
		element = div
	}
	element.textContent = message
}

const registertry = async event => {
	event.preventDefault()

	if (document.getElementById("pass1").value != document.getElementById("pass2").value) {
		document.getElementById("wrong").textContent = "Passwords don't match"
		return
	}

	const usernameElem = document.getElementById("uname")
	const emailElem = document.getElementById("email")
	const apiUrl = new URL(JSON.parse(localStorage.getItem("instanceEndpoints")).api).toString()

	const res = await fetch(apiUrl + "/auth/register", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			date_of_birth: document.getElementById("birthdate").value,
			email: emailElem.value,
			username: usernameElem.value,
			password: document.getElementById("pass1").value,
			consent: document.getElementById("tos-check").checked,
			captcha_key: event.srcElement[7].value,
			registration_token: document.getElementById("registration-token").value || void 0
		})
	})

	const json = await res.json()
	if (json.captcha_sitekey) {
		const capt = document.getElementById("h-captcha")
		if (capt.children.length) {
			if (json.captcha_servicejson.captcha_service == "hcaptcha") hcaptcha.reset()
			else location.reload()
		} else {
			const capty = document.createElement("div")
			capty.classList.add("h-captcha")
			capty.setAttribute("data-sitekey", json.captcha_sitekey)

			const script = document.createElement("script")
			if (json.captcha_service == "recaptcha") script.src = "https://www.google.com/recaptcha/api.js?render=" + json.captcha_sitekey
			else if (json.captcha_service == "hcaptcha") script.src = "https://js.hcaptcha.com/1/api.js"
			else console.error("Unknown captcha service " + json.captcha_service + " found in login response!")

			capt.append(script)
			capt.append(capty)
		}
	} else if (json.token) {
		adduser({serverurls: JSON.parse(localStorage.getItem("instanceEndpoints")), email: emailElem.value, token: json.token}).username = usernameElem.value
		/*localStorage.setItem("userinfos", JSON.stringify({
			currentuser: email + apiUrl,
			users: {
				[email + apiUrl]: {
					email: emailElem.value,
					pfpsrc: null,
					serverurls: JSON.parse(localStorage.getItem("instanceEndpoints")),
					username: usernameElem.value,
					token: json.token
				}
			},
			preferences: {
				theme: "dark",
				notifications: false,
				notisound: "three"
			}
		}))*/

		const params = new URLSearchParams(location.search)
		if (params.has("next") && params.get("next").charAt(0) == "/" && params.get("next").charAt(1) != "/") location.href = params.get("next")
		else location.href = "/channels/@me"
	} else {
		console.log(json)
		if (json.errors.consent) error(document.getElementById("tos-check"), json.errors.consent._errors[0].message)
		else if (json.errors.password) error(document.getElementById("pass1"), "Password: " + json.errors.password._errors[0].message)
		else if (json.errors.username) error(usernameElem, "Username: " + json.errors.username._errors[0].message)
		else if (json.errors.email) error(emailElem, "Email: " + json.errors.email._errors[0].message)
		else if (json.errors.date_of_birth) error(document.getElementById("birthdate"), "Date of Birth: " + json.errors.date_of_birth._errors[0].message)
		else document.getElementById("wrong").textContent = json.errors ? json.errors[Object.keys(json.errors)[0]]._errors[0].message : json.message
	}
}

document.addEventListener("DOMContentLoaded", () => {
	document.getElementById("register").addEventListener("submit", registertry)

	checkInstance.alt = async () => {
		const pingRes = await fetch(JSON.parse(localStorage.getItem("instanceEndpoints")).api + "/ping")
		const pingJSON = await pingRes.json()
		const tosPage = pingJSON.instance.tosPage

		const tosCheck = document.getElementById("tos-check")
		if (tosPage) {
			document.getElementById("tos-accept").removeAttribute("hidden")
			document.getElementById("tos-notos").setAttribute("hidden", "")
			document.getElementById("TOSa").href = tosPage
			tosCheck.removeAttribute("disabled")
			tosCheck.removeAttribute("checked")
		} else {
			document.getElementById("tos-accept").setAttribute("hidden", "")
			document.getElementById("tos-notos").removeAttribute("hidden")
			tosCheck.setAttribute("disabled", "")
			tosCheck.setAttribute("checked", "")
		}
	}
	checkInstance.alt()

	const params = new URLSearchParams(location.search)
	if (params.has("token")) document.getElementById("registration-token").value = params.get("token")
})
