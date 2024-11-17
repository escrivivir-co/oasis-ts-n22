#! /usr/bin/env node

import fs from 'fs';
import path from 'path';
import SecretStack from 'secret-stack';
import caps from 'ssb-caps';
import ProgressBar from './ssb/progress';
import packageJson from '../package.json';
import Config from 'ssb-config/inject';
import minimist from 'minimist';

import config from 'ssb-config';

var argv = process.argv.slice(2)
var i = argv.indexOf('--')
var conf = argv.slice(i + 1)
argv = ~i ? argv.slice(0, i) : argv

var baseConfig = Config("ssb", minimist(conf))
var config = {
	...baseConfig,
	global: {
		keys: baseConfig.keys,
		appKey: caps.shs
	},
	replicationScheduler: {
	  "autostart": true,
	  "partialReplication": null
	},
	friends: {
	  "dunbar": 10,
	  "hops": 1
	},
	conn: {
	  "autostart": true,
	  "incoming": {
		"net": [
		  { "scope": ["public"], "transform": "shs", "port": 8008 },
		  { "scope": ["device"], "transform": "shs", "port": 8008 }
		],
		"tunnel": [
		  {
			"scope": ["public"],
			"transform": "shs",
			"portal": "@1wOEiCjJJ0nEs1OABUIV20valZ1LHUsfHJY/ivBoM8Y=.ed25519"
		  }
		],
		"onion": [
		  { "scope": ["public"], "transform": "shs" }
		],
		"ws": [
		  { "scope": ["public"], "transform": "shs", "port": 8989 }
		]
	  },
	  "outgoing": {
		"net": [{ "transform": "shs" }],
		"ws": [{ "transform": "shs" }],
		"tunnel": [{ "transform": "shs" }]
	  }
	},
	ebt: {
		logging: false, // Opcional: desactiva logs detallados
		persist: false, // Desactiva persistencia para evitar conflictos
	},
	db: {
		path: baseConfig.path
	},
	db2: {
		path: baseConfig.path
	}
}

var manifestFile = path.join(config.path, 'manifest.json')
console.log("The manifest", manifestFile)

// generate initial info
if (argv[0] == 'start') {

	console.log(packageJson.name, "[version: " + packageJson.version + "]", "[dataPath: " + config.path + "]", "[" + 'logging.level:' + config.logging.level + "]")
	console.log('my key ID:', config.keys.public)

	if (!fs.existsSync(config.path)) {
		fs.mkdirSync(config.path, { recursive: true });
	  }

	const Server = SecretStack( caps )
	// Plugins esenciales
	.use(require('ssb-master'))
	.use(require('ssb-db2'))
	.use(require('ssb-db2/compat'))
	.use(require('ssb-ebt'))
	.use(require('ssb-friends'))
    .use(require('ssb-replication-scheduler'))
	.use(require('ssb-conn'))
	.use(require('ssb-blobs'))
	.use(require('ssb-threads'))
	.use(require('ssb-invite'))
	// Plugins adicionales
	.use(require('ssb-lan'))
	.use(require('ssb-search2'))
	.use(require('ssb-room-client'))
	.use(require('ssb-about'))
	.use(require('ssb-onion'))
	.use(require('ssb-unix-socket'))
	.use(require('ssb-no-auth'))
	// Otros plugins necesarios
	.use(require('ssb-logging'))
	.use(require('ssb-partial-replication'))

	// add third-party plugins (loaded from ~/.ssb/config)
	require('ssb-plugins').loadUserPlugins(Server, config)


	// load config into ssb & start it
	var server = Server(config)

	// generate manifest
	fs.writeFileSync(manifestFile, JSON.stringify(server.getManifest(), null, 2))

	// show server progress
	if (process.stdout.isTTY && (config.logging.level != 'info'))
		if (server.progress) ProgressBar(server.progress)
	console.log("The db query", server.db.query)

} else {
	throw new Error(`Invalid start route!`)
	/*var manifest
	try {
		manifest = JSON.parse(String(fs.readFileSync(manifestFile)))
	} catch (err: any) {
		throw new Error(`${err}, 'no manifest file - should be generated first time server is run`)
	}
	var opts = {
		manifest: manifest,
		port: config.port,
		host: 'localhost',
		caps: config.caps,
		key: config.key || config.keys.id
	}
	Client(config.keys, opts, function (err, rpc) {
		if (err) {
		if (/could not connect/.test(err.message)) {
			console.error('Error: Could not connect to ssb-server ' + opts.host + ':' + opts.port)
			console.error('Use the "start" command to start it.')
			console.error('Use --verbose option to see full error')
			if (config.verbose) throw err
			process.exit(1)
		}
		throw err
		}
		for (var k in cmdAliases) {
		rpc[k] = rpc[cmdAliases[k]]
		manifest[k] = manifest[cmdAliases[k]]
		}
		manifest.config = 'sync'
		rpc.config = function (cb) {
		console.log(JSON.stringify(config, null, 2))
		cb()
		}
		if (process.argv[2] === 'blobs.add') {
		var filename = process.argv[3]
		if (!filename && process.stdin.isTTY) {
			console.error('USAGE:')
			console.error('  blobs.add <filename> # add a file')
			console.error('  source | blobs.add   # read from stdin')
			process.exit(1)
		} else {
			pull(
			pull.values([filename]),
			rpc.blobs.add(null, function (err, hash) {
				if (err)
				throw err
				console.log(hash)
				process.exit()
			})
			)
			return
		}
		}
		muxrpcli(argv, manifest, rpc, config.verbose)
	})*/
}

