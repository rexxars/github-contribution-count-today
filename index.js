'use strict';
var express = require('express'),
    app     = express(),
    Cache   = require('node-cache'),
    request = require('request'),

    contribCache = new Cache({ stdTTL: 600, checkperiod: 128 }),
    contribReply = function(req, res, contributionCount) {
        contributionCount += ''; // Make the count a string

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Length', contributionCount.length);
        res.end(contributionCount);
    },
    getContributionCountFromApi = function(username, callback) {
        request.get({
            url : 'https://github.com/' + username + '.json',
            json: true
        }, function(err, res, commits) {
            var contributions = 0
              , today = new Date().toISOString().substr(0, 10)
              , i = commits.length - 1;

            while (i--) {
                if (!commits[i].created_at) {
                    continue;
                } else if (commits[i].created_at.substr(0, 10) === today) {
                    contributions++;
                }
            }

            callback(contributions);
        });
    };

app.get('/favicon.ico', function(req, res) {
    res.send(404, 'File not found');
});

app.get('/humans.txt', function(req, res) {
    res.send(200, 'Made by Espen Hovlandsdal - https://github.com/rexxars/');
});

app.all('/*', function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    next();
});

app.get('/:username', function(req, res) {
    var username = req.params.username;
    if (!username.match(/[a-z0-9-]+/i)) {
        return res.send(400, 'Invalid username');
    }

    contribCache.get(username, function(err, value) {
        if (err || !value[username]) {
            // Fetch from API
            getContributionCountFromApi(username, function(contributions) {
                contribReply(req, res, contributions);
                contribCache.set(username, { 'count': contributions });
            });

            return;
        }

        contribReply(req, res, value[username].count);
    });
});

app.listen(3000);