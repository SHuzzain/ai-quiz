const https = require('https');
const fs = require('fs');

https.get('https://www.mindchamps.org/', (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        // extract fonts
        const fonts = new Set();
        const fontRegex = /font-family:\s*([^;]+)/gi;
        let match;
        while ((match = fontRegex.exec(data)) !== null) {
            fonts.add(match[1].trim());
        }

        // extract hex colors
        const colors = new Set();
        const colorRegex = /#([0-9a-fA-F]{3,6})\b/g;
        while ((match = colorRegex.exec(data)) !== null) {
            colors.add('#' + match[1]);
        }

        // Check for linked CSS files
        const cssLinks = [];
        const linkRegex = /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/gi;
        while ((match = linkRegex.exec(data)) !== null) {
            cssLinks.push(match[1]);
        }

        console.log(JSON.stringify({
            fonts: Array.from(fonts),
            colors: Array.from(colors),
            cssLinks
        }, null, 2));
    });
});
