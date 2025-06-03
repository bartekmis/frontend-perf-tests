addEventListener('fetch', event => {
	event.passThroughOnException()
	event.respondWith(handleRequest(event.request))
})

/**
 * Fetch and add CSS preload headers to the response
 * @param {Request} request
 */
async function handleRequest(request) {
	const response = await fetch(request)
	
	if (!response.ok) {
		return response
	}
	
	const contentType = response.headers.get('content-type') || ''
	
	if (!contentType.includes('text/html')) {
		return response
	}
	
	const responseClone = response.clone()
	
	try {
		var html = await responseClone.text()
		if (!html || html.length === 0) {
			console.log('HTML is empty! Returning original response')
			return response
		}
		
		// Extract CSS file paths from the HTML
		const cssLinks = extractCssLinks(html)
		
		// Create new headers with preload links
		const newHeaders = new Headers(response.headers)
		
		// Add preload headers for each CSS file
		cssLinks.forEach(cssPath => {
			const preloadHeader = `<${cssPath}>; rel=preload; as=style`
			newHeaders.append('Link', preloadHeader)
			console.log(`Added preload header: ${preloadHeader}`)
		})
		
		// Return modified response
		return new Response(html, {
			status: response.status,
			statusText: response.statusText,
			headers: newHeaders
		})
		
	} catch (error) {
		console.log(`Error processing HTML: ${error.message}`)
		return response
	}
}

function extractCssLinks(html) {
	const cssLinks = []
	
	// Match all link tags, regardless of attribute order
	const linkTagRegex = /<link[^>]*>/gi
	
	let match
	let linkCount = 0
	while ((match = linkTagRegex.exec(html)) !== null) {
		const linkTag = match[0]
		
		// Check if it's a stylesheet
		const isStylesheet = /rel\s*=\s*['"]\s*stylesheet\s*['"]|rel\s*=\s*stylesheet/i.test(linkTag)
		
		if (isStylesheet) {

			const hrefMatch = linkTag.match(/href\s*=\s*['"]([^'"]+)['"]/i)
			
			if (hrefMatch) {
				const href = hrefMatch[1]
				const cssPath = href.startsWith('http') ? href : '/' + href
				cssLinks.push(cssPath)
			}
		}
	}
	
	const uniqueLinks = [...new Set(cssLinks)]

	return uniqueLinks
}