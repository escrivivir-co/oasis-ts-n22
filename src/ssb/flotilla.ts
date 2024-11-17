import debugRun from "debug";
import ssbConfig from "ssb-config";
import SecretStack from 'secret-stack';
const debug = debugRun("oasis");

const plugins = [
	require("ssb-db2"),
	require('ssb-db2/compat'),
	require("ssb-master"),
	require("ssb-conn"),
	require("ssb-about"),
	require("ssb-blobs"),
	require("ssb-ebt"),
	require("ssb-friends"),
	require("ssb-replication-scheduler"),
	require("ssb-lan"),
	require("ssb-logging"),
	require("ssb-meme"),
	require("ssb-no-auth"),
	require("ssb-onion"),
	require("ssb-plugins"),
	require("ssb-private1"),
	require('ssb-db2/full-mentions'),
	require('ssb-room-client'),
	require("ssb-search2"),
	require("ssb-unix-socket"),
	require("ssb-ws"),
];

export default (config) => {
  const server = SecretStack( config.caps );
  const walk = (input) => {
	console.log("- Walking flotilla")
    if (Array.isArray(input)) {
      input.forEach(walk);
    } else {
      debug(input.name || "???");
      server.use(input);
    }
  };

  walk(plugins);

  const c = server({ ...ssbConfig, ...config });

  return server({ ...ssbConfig, ...config });
};
