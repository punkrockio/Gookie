/**
 * Node GitHub AutoDeploy
 * Created by Liam Gray (@hoxxep)
 * Released under the MIT License.
 */

var exec = require('child_process').exec,
    bodyParser = require('body-parser'),
    express = require('express'),
    app = express();

// Logging levels
var VERBOSE = true;

var repos;

function main() {
    var config = loadConfig();
    server(config.port);
}

function loadConfig() {
    /**
     * Load users settings and add defaults
     * @type {{port: number, repositories: Array}}
     */

    var defaults = {
        "port": 8001,
        "repositories": []
    };

    var repo_defaults = {
        "url": "https://github.com/hoxxep/GitHubAutoDeploy",
        "path": "~/Documents/Projects/GitHubAutoDeploy",
        "deploy": "git pull",
        "secret": ""
    };

    var config = require('./config.json');
    config = merge(defaults, config);

    repos = {};
    for (var repo in config['repositories']) {
        repos[config['repositories'][repo].url] = merge(repo_defaults, config['repositories'][repo]);
    }

    return defaults;
}

function merge(object1, object2) {
    /**
     * Merge attributes of two objects
     * @param object1: default object
     * @param object2: customised object
     * @type {{}}
     * @return object1 overwritten by object2
     */
    var object3 = {};
    for (var attr in object1) {object3[attr] = object1[attr]}
    for (var attr in object2) {object3[attr] = object2[attr]}
    return object3;
}

function server(port) {
    /**
     * Start listening for webhook
     * @param port: port to start AutoDeploy server on
     */
    app.use(bodyParser({extended: true}));

    app.route('/')
        .get(function(req, res) {
            console.log(timePrefix() + 'ERROR: GET requests not supported');
            res.status(400).json({error: 'None shall pass.'}).end();
        })
        .post(function(req, res) {
            try {
                validateRequest(req.body);

                if (VERBOSE) console.log(timePrefix() + 'user ' + req.body.pusher.name + ' pushed to ' + req.body.repository.url);

                res.status(204).end();
            } catch (e) {
                console.log(timePrefix() + e);
                res.status(400).send('Bad request.').end();
                return;
            }

            matchRepo(req.body);
        });

    app.listen(port);
    if (VERBOSE) console.log(timePrefix() + 'Server started on port ' + port);
}

function validateRequest(json) {
    /**
     * Validate GitHub JSON by checking repo matches etc.
     * TODO: support for secret
     * TODO: better parsing of GitHub url
     * @param json: decoded JSON request body
     * @throws error when invalid JSON
     */
    if (!json.hasOwnProperty('repository') || !json.repository.hasOwnProperty('url')) {
        throw 'ERROR: invalid JSON!';
    }
    if (!repos.hasOwnProperty(json.repository.url)) {
        throw 'ERROR: ' + json.repository.url + ' just sent a webhook but is not configured?';
    }
}

function matchRepo(json) {
    /**
     * Match repo in JSON to deploy command
     * @param json: decoded JSON request body
     */
    var repo = repos[json.repository.url];
    deploy(repo.path, repo.deploy);
}

function deploy(directory, command) {
    /**
     * Run deploy command in git repo
     * Execs: cd "directory" && command
     * @param directory: directory of git repo
     * @param command: deploy command to run
     */
    command = 'cd "' + directory + '" && ' + command;
    exec(command, function(error, stdout, stderr) {
        if (VERBOSE) console.log('----' + timePrefix() + command + ' ----');
        if (VERBOSE && stdout) console.log(stdout);
        if (stderr) console.log(stderr);
        if (error) console.log(error);
        if (VERBOSE) console.log('----- end of deploy output ------');
    });
}

function timePrefix() {
    /**
     * Time prefix for console.log
     * @return prefix in the form of ' [hh:mm:ss] '
     */
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    return ' [' + hour + ':' + min + ':' + sec + '] ';
}

main();