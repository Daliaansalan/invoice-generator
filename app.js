const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
require('dotenv').config();

const secretKey = process.env.SESSION_SECRET || 'default-secret-key';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: true
}));

app.use((req, res, next) => {
  if (!req.session.loggedIn && req.path !== '/login' && req.path !== '/logout') {
    res.redirect('/login');
  } else {
    next();
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "Mallumechanic_Admin" && password === "malluadmin2018") {
    req.session.loggedIn = true;
    res.redirect("/");
  } else {
    res.send("Invalid username or password");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/");
    }
    res.redirect("/login");
  });
});

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/Booking-Confrimation", (req, res) => {
  res.render("confrimationform");
});

app.post("/confrimation-invoice", (req, res) => {
  const invoiceData = req.body;
  res.render("confrim", { invoiceData });
});

app.get("/sold", (req, res) => {
  res.render("soldform");
});

app.post("/soldout-invoice", (req, res) => {
  const soldData = req.body;
  res.render("sold", { soldData });
});

app.get("/Customer-Details", (req, res) => {
  res.render("Customerdetails");
});

app.get("/Service-Details", (req, res) => {
  res.render("Servicedetails");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
