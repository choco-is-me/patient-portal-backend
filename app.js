require("dotenv").config();

// Create an Express application
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const connectDB = require("./connectMongo");
const initializeMongo = require("./initializeMongo");
connectDB();
initializeMongo();

module.exports = app;
