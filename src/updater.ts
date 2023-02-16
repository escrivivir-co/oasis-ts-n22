import request from "request";
import fs from "fs";
import path from "path";
import { promisify } from 'util';

const cb = promisify(request);
const localpackage = path.join("package.json");
const remoteUrl = "https://code.03c8.net/KrakensLab/oasis/src/master/package.json" // Official SNH-Oasis
const remoteUrl2 = "https://github.com/epsylon/oasis/blob/main/package.json" // Mirror SNH-Oasis

let requestInstance, requestInstance2;

function diffVersion(body) {
  let remoteVersion = body.split('<li class="L3" rel="L3">').pop().split('</li>')[0];
  remoteVersion = remoteVersion.split('&#34;version&#34;: &#34;').pop().split('&#34;,')[0];
  let localVersion = fs.readFileSync(localpackage, "utf8");
  if (!localVersion) return "";
  localVersion = localVersion.split('"name":').pop()!.split('"description":')[0];//HACK:exclaims are BAD!!
  localVersion = localVersion.split('"version"').pop()!.split('"')[1];
  if (remoteVersion != localVersion) {
    return "required";
  } else {
    return "";
  };
};

const getRemoteVersion = function (callback: (string) => any): any {
  (async () => {
    if (fs.existsSync(".git")) {
      requestInstance = await cb(remoteUrl, function (error, response, body) {
        if (error != null) {
          requestInstance2 = request(remoteUrl2, function (error, response, body) {
            callback(diffVersion(body));
          });
        } else {
          callback(diffVersion(body));
        };
      });
    };
  })();
};


export default getRemoteVersion