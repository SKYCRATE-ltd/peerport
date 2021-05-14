#!/usr/bin/env node

import peerport from "./index.js";

let [
	interf,
	CMD,
	...args
] = process.argv.slice(2);

peerport(CMD, interf, ...args);
