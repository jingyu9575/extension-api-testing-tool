const extraEventArgs = {
	'webRequest.onAuthRequired': [{ urls: ['<all_urls>'] }, ['responseHeaders']],
	'webRequest.onBeforeRedirect': [{ urls: ['<all_urls>'] }, ['responseHeaders']],
	'webRequest.onBeforeRequest': [{ urls: ['<all_urls>'] }, ['requestBody']],
	'webRequest.onBeforeSendHeaders': [{ urls: ['<all_urls>'] }, ['requestHeaders']],
	'webRequest.onCompleted': [{ urls: ['<all_urls>'] }, ['responseHeaders']],
	'webRequest.onErrorOccurred': [{ urls: ['<all_urls>'] }],
	'webRequest.onHeadersReceived': [{ urls: ['<all_urls>'] }, ['responseHeaders']],
	'webRequest.onResponseStarted': [{ urls: ['<all_urls>'] }, ['responseHeaders']],
	'webRequest.onSendHeaders': [{ urls: ['<all_urls>'] }, ['requestHeaders']],
}

for (const element of document.querySelectorAll('[data-i18n]'))
	element.innerText = browser.i18n.getMessage(element.dataset['i18n'])

function importTemplate(template) {
	if (typeof template === 'string')
		template = document.getElementById(template);
	return document.importNode(template.content, true);
}

function importTemplateElement(template) {
	return importTemplate(template).firstElementChild;
}

const apisDiv = document.getElementById('apis')
for (const api of Object.keys(browser).filter(k => browser[k]).sort()) {
	const node = importTemplateElement('api-template')
	node.textContent = api
	apisDiv.appendChild(node)
	node.addEventListener('click', () => {
		for (const active of document.querySelectorAll('.api.active'))
			active.classList.remove('active')
		node.classList.add('active')
		selectAPI(api)
	})

	node.addEventListener('mouseup', async event => {
		if (event.button === 1) openMDNDoc(api)
	})
}

const eventListeners = new Map()
const membersDiv = document.getElementById('members')
const eventsDiv = document.getElementById('events')
const commandInput = document.getElementById('command')

function selectAPI(api) {
	membersDiv.innerHTML = ''
	eventsDiv.innerHTML = ''

	const obj = browser[api]
	for (const key of Object.keys(obj).sort()) {
		const field = obj[key]
		if (field === undefined) continue
		const path = `${api}.${key}`
		let node
		if (field && typeof field.addListener === 'function') {
			node = importTemplateElement('event-template')
			node.querySelector('span').textContent = path
			eventsDiv.appendChild(node)

			const input = node.querySelector('input')
			input.checked = eventListeners.has(path)
			input.addEventListener('click',
				() => toggleEventListener(path, field, input.checked))
		} else {
			node = importTemplateElement('member-template')
			node.textContent = path
			membersDiv.appendChild(node)
			node.addEventListener('click', () => {
				commandInput.value = `browser.${path}`
				commandInput.focus()
				if (typeof field === 'function') {
					commandInput.value += '()'
					const index = commandInput.value.length - 1
					commandInput.setSelectionRange(index, index)
				}
			})
			node.addEventListener('dblclick', () => runCommand())
		}

		node.addEventListener('mouseup', async event => {
			if (event.button === 1) openMDNDoc(`${api}/${key}`)
		})
	}
}

async function openMDNDoc(path) {
	const url = 'https://developer.mozilla.org/docs/en-US/' +
		'Mozilla/Add-ons/WebExtensions/API/' + path
	void browser.tabs.create({
		url, openerTabId: (await browser.tabs.getCurrent()).id
	})
}

function toggleEventListener(path, field, enabled) {
	const oldListener = eventListeners.get(path)
	if (oldListener) {
		eventListeners.delete(path)
		try {
			field.removeListener(oldListener)
		} catch (e) { console.error(e) }
	}
	if (enabled) {
		const listener = (...args) => { console.log(path, ...args) }
		eventListeners.set(path, listener)
		try {
			field.addListener(listener, ...(extraEventArgs[path] || []))
		} catch (e) { console.error(e) }
	}
}

async function runCommand() {
	const { value } = commandInput
	console.info(value)
	try {
		console.log("%o", await eval(value))
	} catch (e) {
		console.error("%o", e)
	}
}

commandInput.addEventListener('keyup', event => {
	if (event.key === 'Enter') runCommand()
})
