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

    router.get('/lobby/:gameCode', (req, res) => {
        const gameCode = req.params.gameCode;

        res.render('lobby', {
            req,
            res,
            gameCode: gameCode
        }, (err, html) => {
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

    router.get('/quiz/:gameCode', (req, res) => {
        const gameCode = req.params.gameCode;

        res.render('quiz', {
            req,
            res,
            gameCode: gameCode
        }, (err, html) => {
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

    // Admin Live Quiz Monitor
    router.get('/admin/live/:gameCode', (req, res) => {
        const gameCode = req.params.gameCode;

        // Check if user is logged in and is the host
        if (!req.session.host_id) {
            return res.redirect('/login');
        }

        res.render('admin-live', {
            req,
            res,
            gameCode: gameCode
        }, (err, html) => {
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

    // Rute Login
    router.get('/login', (req, res) => {
        res.render('login', { req, res }, (err, html) => {
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

    // Rute Register
    router.get('/register', (req, res) => {
        res.render('register', { req, res }, (err, html) => {
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

    // Rute Dashboard (Protected)
    router.get('/dashboard', async (req, res) => {
        // Cek apakah host sudah login
        if (!req.session || !req.session.host_id) {
            return res.redirect('/login');
        }

        try {
            const db = require('../utils/db');
            
            // Ambil kuis milik host ini
            const [quizzes] = await db.query(
                'SELECT * FROM quizzes WHERE host_id = ? ORDER BY created_at DESC',
                [req.session.host_id]
            );

            res.render('dashboard', { 
                req, 
                res, 
                username: req.session.username,
                quizzes: quizzes 
            }, (err, html) => {
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
        } catch (error) {
            console.error('Error saat load dashboard:', error);
            res.status(500).send('Terjadi kesalahan server');
        }
    });

    // Rute Create Quiz (Protected)
    router.get('/quiz/create', (req, res) => {
        // Cek apakah host sudah login
        if (!req.session || !req.session.host_id) {
            return res.redirect('/login');
        }

        res.render('create-quiz', { 
            req, 
            res,
            username: req.session.username
        }, (err, html) => {
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