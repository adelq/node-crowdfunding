// Global variables
var CAMPAIGN_GOAL = 1000;
var BALANCED_MARKETPLACE_URI = "/v1/marketplaces/TEST-MP2DQsZLPAU4KzFUnvOKfFj0";
var BALANCED_API_KEY = "56bbfac6fb4211e28b45026ba7c1aba6";

// Initialize Express app
var express = require('express');
var app = express();
app.use("/static", express.static(__dirname + '/static'));
app.use(express.bodyParser());
app.listen(8080);
console.log("App running on http://localhost:8080");

// Serving homepage
app.get("/", function(request, response) {
	response.send(
		"<link rel='stylesheet' type='text/css' href='/static/style.css'>" +
		"<h1>Test Crowdfunding Campaign built on node.js</h1>" +
		"<h2>??? raised out of $" + CAMPAIGN_GOAL.toFixed(2) + "</h2>" +
		"<a href='/fund'>Fund now</a>"
	);
});

app.get("/fund", function(request, response) {
	response.sendfile("fund.html");
});