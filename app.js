// Global variables
var CAMPAIGN_GOAL = 1000;
var BALANCED_MARKETPLACE_URI = "/v1/marketplaces/TEST-MP2DQsZLPAU4KzFUnvOKfFj0";
var BALANCED_API_KEY = "56bbfac6fb4211e28b45026ba7c1aba6";
var MONGO_URI = "mongodb://crowd:mozilla@ds037508.mongolab.com:37508/crowdfund-test";

// Importing required node packages
var express = require('express');
var app = express();
var q = require('q');
var httpRequest = require('request');
var mongo = require('mongodb').MongoClient;

// Initialize Express app
app.use("/static", express.static(__dirname + '/static'));
app.use(express.bodyParser());
app.listen(8080);
console.log("App running on http://localhost:8080");

// Serving homepage
app.get("/", function(request, response) {
	q.fcall(_getTotalFunds).then(function(total) {
		response.send(
			"<link rel='stylesheet' type='text/css' href='/static/style.css'>" +
			"<h1>Test Crowdfunding Campaign built on node.js</h1>" +
			"<h2>$" + total.toFixed(2) + " raised out of $" + CAMPAIGN_GOAL.toFixed(2) + "</h2>" +
			"<a href='/fund'>Fund now</a>"
		);
	});
});

app.get("/fund", function(request, response) {
	response.sendfile("fund.html");
});

app.post("/pay/balanced", function(request, response) {
	// Payment data
	var card_uri = request.body.card_uri;
	var amount = request.body.amount;
	var name = request.body.name;

	q.fcall(function() {
		// Create account with card URI
		return _callBalanced("/accounts", {
			card_uri: card_uri
		});
	}).then(function(account) {
		// Charge account for amount given
		return _callBalanced("/debits", {
			account_uri: account.uri,
			amount: Math.round(amount*100) // Convert dollar amount into cents
		});
	}).then(function(transaction) {
		// Crowdfunding data
		var donation = {
			name: name,
			amount: transaction.amount/100, // Convert back into dollars
			transaction: transaction
		};

		return _recordDonation(donation);
	}).then(function(donation) {
		// Personalized Thank You page
		response.send(
			"<link rel='stylesheet' type='text/css' href='/static/style.css'>" +
			"<h1>Thank you, " + donation.name + "!</h1> <br>" +
			"<h2>You donated $" + donation.amount.toFixed(2) + ".</h2> <br>" +
			"<a href='/'>Return to Campaign Page</a> <br>" +
			"<br>" +
			"Here's your full donation information: <br>" +
			"<pre>" + JSON.stringify(donation, null, 4) + "</pre>"
		);
	}, function(err) {
		response.send("Error: " + err);
	});
});

// Calling Balanced payments REST API 


function _callBalanced(url, params) {
	// Promise for HTTP POST request
	var deferred = q.defer();
	httpRequest.post({
		url: "https://api.balancedpayments.com" + BALANCED_MARKETPLACE_URI + url,
		auth: {
			user: BALANCED_API_KEY,
			pass: "",
			sendImmediately: true
		},
		json: params
	}, function(error, response, body) {
		// Error handling
		if (body.status_code >= 400) {
			deferred.reject(body.description);
			return;
		}

		deferred.resolve(body);
	});
	return deferred.promise;
}

// Recording donations
function _recordDonation(donation) {
	// Promise to save to database
	var deferred = q.defer();
	mongo.connect(MONGO_URI, function(err, db) {
		if (err) { return deferred.reject(err); }

		// Insert donation
		db.collection('donations').insert(donation, function(err) {
			if (err) { return deferred.reject(err); }

			// Promise the donation that was saved
			deferred.resolve(donation);

			// Close database
			db.close();
		});
	});
	return deferred.promise;
}

// Get total donation funds
function _getTotalFunds() {
	// Promise result from database
	var deferred = q.defer();
	mongo.connect(MONGO_URI, function(err, db) {
		if (err) { return deferred.reject(err); }

		// Get amounts of all donations
		db.collection('donations').find( {}, {amount:1} ).toArray(function(err, donations) {
			if (err) { return deferred.reject(err); }

			// Sum amount and resolve promise
			var total = donations.reduce(function(previousValue, currentValue) {
				return previousValue + currentValue.amount;
			},0);
			deferred.resolve(total);

			// Close database
			db.close();
		});
	});
	return deferred.promise;
}