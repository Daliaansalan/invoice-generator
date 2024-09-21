const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
require('dotenv').config();

const secretKey = process.env.SESSION_SECRET || 'default-secret-key';

const app = express();
const { GoogleSpreadsheet } = require('google-spreadsheet'); // No need for google-auth-library in this case

app.use(express.json());
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

// Load environment variables
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

if (!SPREADSHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error("Missing environment variables for Google Sheets API.");
    process.exit(1);
}

// Initialize the Google Spreadsheet
const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

async function accessSpreadsheet() {
    try {
        // Authenticate with the Google Sheets API
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY,
        });

        // Load document properties and worksheets
        await doc.loadInfo();
        console.log(`Title: ${doc.title}`);
        console.log(`Sheet Count: ${doc.sheetCount}`);

        // Log each sheet title for debugging
        doc.sheetsByIndex.forEach(sheet => {
            console.log(`Sheet Title: ${sheet.title}`);
        });
    } catch (error) {
        console.error('Error accessing spreadsheet:', error.message);
        throw error;
    }
}

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

app.get("/Service-Checker", (req, res) => {
  res.render("servicechecker");
});

app.post('/check-service', async (req, res) => {
  try {
      const { carNumber, currentMiles } = req.body;

      await accessSpreadsheet();
      const sheet = doc.sheetsByIndex[0]; // Assume you're working with the first sheet
      const rows = await sheet.getRows();

      const carData = rows.find(row => row.CarNumber === carNumber);

      if (!carData) {
          return res.status(404).send({ message: "Car not found." });
      }

      const initialMiles = parseInt(carData.InitialMiles, 10);
      const deliveredDate = carData.DeliveredDate;

      const eligibility = isEligibleForFreeService(initialMiles, currentMiles, deliveredDate);

      res.send({
          message: eligibility.message,
          serviceDate: eligibility.eligible ? new Date().toISOString().split('T')[0] : null
      });
  } catch (error) {
      console.error("Error checking service eligibility:", error.message);
      res.status(500).send({ message: "Internal server error." });
  }
});

// Define the eligibility function
function isEligibleForFreeService(initialMiles, currentMiles, deliveredDate) {
  const maxMiles = 10000;
  const currentDate = new Date();
  const deliveryDate = new Date(deliveredDate);
  const timeDiff = currentDate.getTime() - deliveryDate.getTime();
  const daysSinceDelivery = Math.floor(timeDiff / (1000 * 3600 * 24));

  if (currentMiles - initialMiles <= maxMiles && daysSinceDelivery <= 365) {
      return { eligible: true, message: "Eligible for free service!" };
  } else {
      return { eligible: false, message: "Not eligible for free service." };
  }
}

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
