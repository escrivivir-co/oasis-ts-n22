#! /usr/bin/env node

import fs from 'fs';
import path from 'path';
import SecretStack from 'secret-stack';
import caps from 'ssb-caps';
import SSB from 'ssb-db';
import Client from 'ssb-client';
import cmdAliases from './ssb/cli-cmd-aliases';
import ProgressBar from './ssb/progress';
import packageJson from '../package.json';
import Config from 'ssb-config/inject';
import minimist from 'minimist';
import muxrpcli from 'muxrpcli';
// add ssb server required plugins
import tribes from 'ssb-tribes';
import conn from 'ssb-conn';
import legacy_conn from 'ssb-legacy-conn';
import db2 from 'ssb-db2';
import replication_scheduler from 'ssb-replication-scheduler'
import friends from 'ssb-friends';
import ebt from 'ssb-ebt';
import box from 'ssb-box';
import threads from 'ssb-threads';
import invite from 'ssb-invite';
import conn_db from 'ssb-conn-db';
import search2 from 'ssb-search2';
import friend_pub from 'ssb-friend-pub';
import invite_client from 'ssb-invite-client';
import tunnel from 'ssb-tunnel';
import config from 'ssb-config';
import conn_query from 'ssb-conn-query';
import conn_hub from 'ssb-conn-hub';
import conn_staging from 'ssb-conn-staging';
import device_address from 'ssb-device-address';
import poll from 'scuttle-poll';
import gossip from 'ssb-gossip';
import master from 'ssb-master';
import logging from 'ssb-logging';
import partial_replication from 'ssb-partial-replication';
import about from 'ssb-about';
import onion from 'ssb-onion';
import unix from 'ssb-unix-socket';
import auth from 'ssb-no-auth';
import backlinks from 'ssb-backlinks';
import links from 'ssb-links';
import pull from 'pull-stream';

var argv = process.argv.slice(2)
var i = argv.indexOf('--')
var conf = argv.slice(i + 1)
argv = ~i ? argv.slice(0, i) : argv

var config = Config("ssb", minimist(conf))
var config = Config("ssb", { "replicationScheduler": { "autostart": true, "partialReplication": null }, "pub": true, "local": true, "friends": { "dunbar": 300, "hops": 3 }, "gossip": { "connections": 10, "local": true, "friends": true, "seed": false, "global": false }, "connections": { "incoming": { "net": [{ "scope": "public", "transform": "shs", "port": 8008 }, { "scope": "device", "transform": "shs", "port": 8008 }], "tunnel": [{ "scope": "public", "portal": "@1wOEiCjJJ0nEs1OABUIV20valZ1LHUsfHJY/ivBoM8Y=.ed25519", "transform": "shs" }], "onion": [{ "scope": "public", "transform": "shs" }], "ws": [{ "scope": "public", "transform": "shs" }] }, "outgoing": { "net": [{ "transform": "shs" }], "ws": [{ "transform": "shs" }], "tunnel": [{ "transform": "shs" }] } } })

var manifestFile = path.join(config.path, 'manifest.json')

// generate initial info
if (argv[0] == 'start') {
  console.log(packageJson.name, "[version: " + packageJson.version + "]", "[dataPath: " + config.path + "]", "[" + 'logging.level:' + config.logging.level + "]")
  console.log('my key ID:', config.keys.public)

  // add other required plugins (+flotilla) by SNH-Oasis (client) (plugin order is required!)
  //@ts-ignore //TODO: I'm ignoring here, but if there are so many args where there should be 1, we have a problem
  var Server = SecretStack({ caps }).use(SSB, gossip, tribes, conn, db2, master, ebt, box, threads, invite, conn_db, search2, friend_pub, invite_client, tunnel, config, conn_query, conn_hub, conn_staging, device_address, poll, friends, logging, replication_scheduler, partial_replication, about, onion, unix, auth, backlinks, links)
    .use(require('ssb-master'))
    .use(require('ssb-gossip'))
    .use(require('ssb-ebt'))
    .use(require('ssb-friends'))
    .use(require('ssb-blobs'))
    .use(require('ssb-lan'))
    .use(require('ssb-meme'))
    .use(require('ssb-ooo'))
    .use(require('ssb-plugins'))
    .use(require('ssb-conn'))
    .use(require('ssb-box'))
    .use(require('ssb-search'))
    .use(require('ssb-friend-pub'))
    .use(require('ssb-invite-client'))
    .use(require('ssb-logging'))
    .use(require('ssb-replication-scheduler'))
    .use(require('ssb-partial-replication'))
    .use(require("ssb-room/tunnel/client"))
    .use(require('ssb-about'))
    .use(require('ssb-onion'))
    .use(require('ssb-unix-socket'))
    .use(require('ssb-no-auth'))
    .use(require('ssb-backlinks'))
    .use(require("ssb-tangle"))
    .use(require('ssb-links'))
    .use(require('ssb-query'))

  // add third-party plugins (loaded from ~/.ssb/config)
  require('ssb-plugins').loadUserPlugins(Server, config)

  // load config into ssb & start it
  var server = Server(config)

  // generate manifest
  fs.writeFileSync(manifestFile, JSON.stringify(server.getManifest(), null, 2))

  // show server progress
  if (process.stdout.isTTY && (config.logging.level != 'info'))
    ProgressBar(server.progress)

} else {
  var manifest
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
  })
}

