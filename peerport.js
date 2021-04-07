#!/bin/env node

import peerport from "./index.js";

let [
	interface,
	CMD,
	...args
] = process.argv.slice(2);

peerport(CMD, interface, ...args);
