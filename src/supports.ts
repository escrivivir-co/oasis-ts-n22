#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from 'os';
import h from 'hyperscript';
const { a,
  br,
  li, } =
  require('hyperscript-helpers')(h);
import envPaths from "env-paths";
import cli from "./cli";
import ssb from "./ssb";
import getModels from "./models";

const homedir = os.homedir();
const supportingPath = path.join(homedir, ".ssb/flume/contacts2.json");


const defaultConfig = {};
const defaultConfigFile = path.join(
  envPaths("oasis", { suffix: "" }).config,
  "/default.json"
);

const config = cli(defaultConfig, defaultConfigFile);
if (config.debug) {
  process.env.DEBUG = "oasis,oasis:*";
}
const cooler = ssb({ offline: config.offline });
const { about } = getModels({
  cooler,
  isPublic: config.public,
});

async function getNameByIdSupported(supported) {
  const name_supported = await about.name(supported);
  return name_supported
}

async function getNameByIdBlocked(blocked) {
  const name_blocked = await about.name(blocked);
  return name_blocked
}

async function getNameByIdRecommended(recommended) {
  const name_recommended = await about.name(recommended);
  return name_recommended
}

export default async function getSupports() {
  let supporting: JSON | undefined = undefined;
  try {
    supporting = JSON.parse(fs.readFileSync(supportingPath, { encoding: 'utf8', flag: 'r' })).value;
  } catch {
    // keep it undefined
  }

  let arr: any = [], arr2: any = [], arr3: any = [];//TODO: these need proper typing

  if (supporting != undefined && Object.keys(supporting)[0] != undefined) {
    var keys = Object.keys(supporting);
    var data = Object.entries(supporting[keys[0]]);
    Object.values(data).forEach(async (value) => {
      if (value[1] === 1) {
        var supported = (value[0])
        if (!arr.includes(supported)) {
          const name_supported = await getNameByIdSupported(supported);
          arr.push(
            li(
              name_supported, br,
              a(
                { href: `/author/${encodeURIComponent(supported)}` },
                supported
              )
            ), br
          );
        }
      }
    });
  }

  var supports = arr;
  if (supporting != undefined && Object.keys(supporting)[0] != undefined) {
    var keys = Object.keys(supporting);
    var data = Object.entries(supporting[keys[0]]);
    Object.entries(data).forEach(async ([key, value]) => {
      if (value[1] === -1) {
        var blocked = (value[0])
        if (!arr2.includes(blocked)) {
          const name_blocked = await getNameByIdBlocked(blocked);
          arr2.push(
            li(
              name_blocked, br,
              a(
                { href: `/author/${encodeURIComponent(blocked)}` },
                blocked
              )
            ), br
          );
        }
      }
    });
  }

  var blocks = arr2;

  if (supporting != undefined && Object.keys(supporting)[0] != undefined) {
    var keys = Object.keys(supporting);
    var data = Object.entries(supporting[keys[0]]);
    Object.entries(data).forEach(async ([key, value]) => {
      if (value[1] === -2) {
        var recommended = (value[0])
        if (!arr3.includes(recommended)) {
          const name_recommended = await getNameByIdRecommended(recommended);
          arr3.push(
            li(
              name_recommended, br,
              a(
                { href: `/author/${encodeURIComponent(recommended)}` },
                recommended
              )
            ), br
          );
        }
      }
    });
  }
  var recommends = arr3;

  return {
    supports,
    blocks,
    recommends
  }
}

