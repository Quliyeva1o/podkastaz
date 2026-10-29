// Startup file for cPanel "Setup Node.js App" (CloudLinux / LiteSpeed).
//
// The app root holds no code of its own — deploy.sh puts each Next.js standalone build in
// releases/<id> and points ./current at the active one. Settings come from shared/.env,
// uploaded media live in shared/uploads (both survive deploys).
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS on purpose: the hosting's Node loader require()s this file */

const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const envFile = path.join(root, "shared", ".env");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

process.env.NODE_ENV = "production";
// The account's process limit counts threads; libuv would size its pool for the host's
// 32 CPUs. (V8's pool is set by NODE_OPTIONS=--v8-pool-size=2 in the app's environment.)
process.env.UV_THREADPOOL_SIZE ||= "2";
process.env.UPLOAD_DIR ||= path.join(root, "shared", "uploads");
// CloudLinux sets HOSTNAME to the machine's name. Next.js treats HOSTNAME as its own
// origin: with anything but the wildcard, its internal rewrites (e.g. / → /az) look like
// external URLs and get proxied back into the app, which then redirects in a loop.
process.env.HOSTNAME = "0.0.0.0";

require(path.join(root, "current", "server.js"));
