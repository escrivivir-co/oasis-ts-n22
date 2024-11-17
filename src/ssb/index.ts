"use strict";

// This module exports a function that connects to SSB and returns an interface
// to call methods over MuxRPC. It's a thin wrapper around SSB-Client, which is
// a thin wrapper around the MuxRPC module.
import caps from 'ssb-caps';
import ssbClient from "ssb-client";
import ssbConfig from "ssb-config";
import ssbKeys from "ssb-keys";
import debugRun from "debug";
import path from "path";
import lodash from "lodash";
import fs from "fs";
import os from "os";
import flotilla from "./flotilla";
import Config from 'ssb-config/inject';
import minimist from 'minimist';

const debug = debugRun("oasis");

// Use temporary path if we're running a test.
if (process.env.OASIS_TEST) {
  ssbConfig.path = fs.mkdtempSync(path.join(os.tmpdir(), "oasis-"));
  ssbConfig.keys = ssbKeys.generate();
}

const socketPath = path.join(ssbConfig.path, "socket");
const publicInteger = ssbConfig.keys.public.replace(".ed25519", "");
const remote = `unix:${socketPath}~noauth:${publicInteger}`;

/**
 * @param formatter {string} input
 * @param args {any[]} input
 */
const log = (formatter, ...args) => {
  const isDebugEnabled = debug.enabled;
  debug.enabled = true;
  debug(formatter, ...args);
  debug.enabled = isDebugEnabled;
};

/**
 * @param [options] {object} - options to pass to SSB-Client
 * @returns Promise
 */
const connect = (options) =>
  new Promise((resolve, reject) => {
    const onSuccess = (ssb) => {
      resolve(ssb);
    };
    ssbClient(process.env.OASIS_TEST ? ssbConfig.keys : null, options)
      .then(onSuccess)
      .catch(reject);
  });

let closing = false;
let serverHandle;
let clientHandle;

/**
 * Attempts connection over Unix socket, falling back to TCP socket if that
 * fails. If the TCP socket fails, the promise is rejected.
 * @returns Promise
 */
const attemptConnection = () =>
  new Promise((resolve, reject) => {
    const originalConnect = process.env.OASIS_TEST
      ? new Promise((resolve, reject) =>
        reject({
          message: "could not connect to sbot",
        })
      )
      : connect({ remote });
    originalConnect
      .then((ssb) => {
        console.log("Connected to existing Scuttlebutt service over Unix socket", (ssb as any)?.db?.query);

        resolve(ssb);
      })
      .catch((e) => {
        if (closing) return;
        console.log("Unix socket failed");
        if (e.message !== "could not connect to sbot") {
          throw e;
        }
        connect({})
          .then((ssb) => {
            console.log("Connected to existing Scuttlebutt service over TCP socket");
            resolve(ssb);
          })
          .catch((e) => {
            if (closing) return;
            console.log("TCP socket failed");
            if (e.message !== "could not connect to sbot") {
              throw e;
            }
            reject(new Error("Both connection options failed"));
          });
      });
  });

let pendingConnection: Promise<any> | null = null;

const ensureConnection = (customConfig) => {
  if (pendingConnection === null) {
    pendingConnection = new Promise((resolve) => {
      setTimeout(() => {
        attemptConnection()
          .then((ssb) => {
            resolve(ssb);
          })
          .catch(() => {
            serverHandle = flotilla(customConfig);
			console.log("the serverHandle from flotilla", serverHandle.db)
            attemptConnection()
              .then(resolve)
              .catch((e) => {
                throw new Error(e);
              });
          });
      }, 100);
    });

    const cancel = () => (pendingConnection = null);
    pendingConnection.then(cancel, cancel);
  }

  return pendingConnection;
};

export default ({ offline }) => {
  if (offline) {
    log("Offline mode activated - not connecting to scuttlebutt peers or pubs");
  }

  
  	var baseConfig = Config("ssb", minimist([ 'start' ]))
  	var baseConfig = Config("ssb", {})
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
// Make a copy of `ssbConfig` to avoid mutating.
	const customConfig = config //config;JSON.parse(JSON.stringify(ssbConfig));
  // Only change the config if `--offline` is true.
  if (offline === true) {
    lodash.set(customConfig, "conn.autostart", false);
  }

  // Use `conn.hops`, or default to `friends.hops`, or default to `0`.
  lodash.set(
    customConfig,
    "conn.hops",
    lodash.get(ssbConfig, "conn.hops", lodash.get(ssbConfig.friends.hops, 0))
  );

  /**
   * This is "cooler", a tiny interface for opening or reusing an instance of
   * SSB-Client.
   */
  const cooler = {
    open() {
      // This has interesting behavior that may be unexpected.
      //
      // If `clientHandle` is already an active [non-closed] connection, return that.
      //
      // If the connection is closed, we need to restart it. It's important to
      // note that if we're depending on an external service (like Patchwork) and
      // that app is closed, then Oasis will seamlessly start its own SSB service.
      return new Promise((resolve, reject) => {
        if (clientHandle && clientHandle.closed === false) {

			console.log("- Ya existe clientHandle, devolviendo")
          	resolve(clientHandle);
        } else {
			ensureConnection(customConfig).then((ssb) => {
				clientHandle = ssb;
				console.log("- ensureConnection clientHandle, devolviendo")
				if (closing) {
					cooler.close();
					reject(new Error("Closing Oasis"));
				} else {
					resolve(ssb);
				}
          });
        }
      });
    },
    close() {
      closing = true;
      if (clientHandle && clientHandle.closed === false) {
        clientHandle.close();
      }
      if (serverHandle) {
        serverHandle.close();
      }
    },
  };

  cooler.open();

  return cooler;
};
