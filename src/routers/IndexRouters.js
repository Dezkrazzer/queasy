module.exports = function () {
    const express = require('express');
    const router = express.Router();
    const { minify } = require('html-minifier')
    const JavaScriptObfuscator = require('javascript-obfuscator')

    function obfuscateInlineScripts(html) {
        return html.replace(/<script>([\s\S]*?)<\/script>/g, (match, jsCode) => {
            const obfuscated = JavaScriptObfuscator.obfuscate(jsCode, {
                compact: true,
                controlFlowFlattening: true,
                deadCodeInjection: true,
                stringArray: true,
                rotateStringArray: true,
            }).getObfuscatedCode();

            return `<script>${obfuscated}</script>`;
        });
    }

    router.get('/', (req, res) => {
        res.render('index', { req, res }, (err, html) => {
            if (err) return res.status(500).send(err.message);

            const obfuscatedHTML = obfuscateInlineScripts(html);

            const minifiedHtml = minify(obfuscatedHTML, {
                collapseWhitespace: true,
                removeComments: true,
                minifyCSS: true,
                ignoreCustomFragments: [/<%[\s\S]*?%>/] 
            });

            res.send(minifiedHtml);
        });
    });

    return router;
}