const express = require("express");
const app = express();
const session = require('express-session');
const path = require('path');

const { json, urlencoded } = require("body-parser");

app.use(json());
app.use(urlencoded({ extended: true }));
app.use(session({
    secret: 'diginesa-unique-secret',
    resave: false,
    saveUninitialized: true
}));

const staticFilesPath = path.join(__dirname, 'src', 'static');
console.log('Express is serving static files from:', staticFilesPath); // Ini yang penting!

app.use(express.static(staticFilesPath));
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('view engine', 'ejs');

const IndexRouters = require("./src/routers/IndexRouters");

app.use("/", IndexRouters());

app.listen(process.env.PORT, () => {
    console.log(`> ✅ • Your app is listening on port ${process.env.PORT}`);
});