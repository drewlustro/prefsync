#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    log = require('verbalize'),
    colors = require('colors'),
    nconf = require('nconf'),
    mkdirp = require('mkdirp'),
    Promise = require('bluebird'),
    _ = require('underscore');

// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
// SETUP

// Fetch default configuration path from process environment
nconf.env(['HOME', 'NODE_ENV']);

var userHomeDir = nconf.get('HOME');

var config = {
    userConfigFile: path.join(userHomeDir, '.prefsync', 'config.json'),
    dataDir: path.join(userHomeDir, '.prefsync', 'apps'),
    userPrefSource: path.join(userHomeDir, 'Library', 'Preferences')
};

mkdirp.sync(path.dirname(config.userConfigFile));

// Add conf file as 1st hierarchy for nconf
nconf.use('file', { file: config.userConfigFile });
console.log(('Using prefsync configuration: ' + config.userConfigFile).yellow);

// Add argv as 2nd hierarchy for nconf
nconf.argv({
    'save': {
        alias: 's',
        describe: 'Bool on whether to save argv options to config file (default: false)',
        default: false
    }
});

// Allow argv to override existing prefs
// nconf.set('slack:user', nconf.get('user'));
// nconf.set('slack:channel', nconf.get('channel'));
// nconf.set('slack:bot', nconf.get('bot'));
// if (nconf.get('url') !== null) nconf.set('slack:url', nconf.get('url'));

// Save only if -s flag passed
if (nconf.get('save')) saveConfig();

// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
// App

var supportedApps = {
    'Atom': {
        'src': ['com.github.atom.plist']
    },
    'iTerm2': {
        'src': ['com.googlecode.iterm2.plist']
    },
    'Divvy': {
        'src': ['com.mizage.Divvy.plist']
    }
};

var selectedApps = supportedApps;


Promise.promisifyAll(fs);

mkdirp.sync(config.dataDir);

_.each(selectedApps, function(appInfo, appName, list) {
    log.writeln(log.gray('[' + appName + ']') + ' sync starting...');
    var files = appInfo.src;
    if (!_.isArray(files)) files = [files];

    _.each(files, function(file) {
        var readPath = path.normalize(path.join(config.userPrefSource, file));
        log.writeln(log.gray('[' + appName + ']') + ' read file: "' + log.bold(readPath) + '"');

        var rs = fs.createReadStream(readPath, {
            encoding: 'utf8'
        });

        var writeDir = mkdirp.sync(path.join(config.dataDir, appName));
        var writePath = path.normalize(path.join(config.dataDir, appName, file));

        log.writeln(log.gray('[' + appName + ']') + ' begin write file: "' + log.bold(writePath) + '"');

        var ws = fs.createWriteStream(writePath, {
            encoding: 'utf8'
        });

        // log.writeln(rs);

        try {
            rs.pipe(ws);
            log.success(log.gray('[' + appName + ']') + ' complete!:');
        } catch (e) {
            log.writeln(log.red('Catch Error: ' + e.message), e.stack);
        }

        // rs.then(function(readStream) {
        //     var writePath = path.normalize(path.join(config.dataDir, appName, file));
        //     log.writeln(log.gray('[' + appName + ']') + ' write file: "' + log.bold(writePath) + '"');
        //     return readStream.pipeAsync();
        // })
        // // .then(function(result) {
        // //     log.success(log.gray('[' + appName + ']') + ' result of pipe.');
        // // })
        // .error(function(e) {
        //     log.writeln(log.red('Error: ' + e.message));
        // })
        //     .
        // catch (function(e) {
        //     log.writeln(log.red('Catch Error: ' + e.message), e.stack);
        // });
    });
});



// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
// Helpers

function saveConfig() {
    nconf.save(function (err) {
        if (err) {
            console.error('Error saving prefsync conf file.'.red);
            throw err;
        }

        console.log('Saved nconf file successfully!'.green);

        fs.readFile(config.userConfigFile, function (err, data) {
            if (err) throw err;
            console.log('[Current Config]'.grey);
            console.dir(JSON.parse(data.toString()));
        });
    });
}

function getUserHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

// Verbalize `runner`
// log.runner = 'nowplaying-slack';
