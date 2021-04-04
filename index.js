#!/bin/env node

// TODO: abstract something out of this with DNS... teermite + smthg smthg

import {
	readFileSync,
	writeFileSync
} from "fs";

const $ = process.argv.slice(2);

const RETURN = x => x;
const NEWLINE = '\n';
const COMMENT = '#';
const INTERFACE = 'eth0';
const encoding = "utf-8";

const FILE = '/etc/wireguard/rules';
const SPACE = ' ';
let [
	entry_port,
	CMD,
	dest_ip,
	dest_port
] = process.argv.slice(2);

const parse = file =>
	readFileSync(file, {encoding})
	.split(NEWLINE)
	.map(x => x.trim())
	.filter(RETURN)
	.filter(x => !x.startsWith(COMMENT))
	.map(rule => {
		const parts = rule.split(SPACE).filter(RETURN);
		return [parts[8], ...parts[12].split(':')];
	});

const render_rule = (port_a, dest_ip, port_b) =>
	`PREROUTING -t nat -i ${INTERFACE} -p tcp --dport ${port_a} -j DNAT --to ${dest_ip}:${port_b}`;

const render = rules =>
	rules.map(rule => render_rule(...rule)).join(NEWLINE);

const view_rule = (entry_port, dest_ip, dest_port) =>
	`${entry_port} => ${dest_ip}:${dest_port}`;

const view = rules =>
	rules.map(rule => view_rule(...rule)).join(NEWLINE);

const save = rules =>
	writeFileSync(FILE, render(rules), {encoding});

const RULES_FILE = parse(FILE);

const CMDS = {
	list: () => view(RULES_FILE),
	add: (entry_port, dest_ip, dest_port) => {
		let rule = RULES_FILE.find(([port]) => entry_port === port);
		if (!rule)
			RULES_FILE.push([entry_port, dest_ip, dest_port]);
		else
			rule.splice(0, 3, entry_port, dest_ip, dest_port);
		
		save(RULES_FILE);
		return view(RULES_FILE);
	},
	remove: entry_port => {
		const rule = RULES_FILE.find(([port]) => entry_port === port);
		if (!rule)
			return `ERROR: port ${entry_port} has no existing rule.`
		
		const rules = RULES_FILE.filter(([port]) => port !== entry_port);
		save(rules);
		return view(rules);
	},
	// Prepend iptables -A
	up: () =>
		RULES_FILE
			.map(rule => render_rule(...rule))
			.map(rule => 'iptables -A ' + rule)
			.join(NEWLINE),
	// Prepend iptables -D
	down: () => {
		RULES_FILE
			.map(rule => render_rule(...rule))
			.map(rule => 'iptables -D ' + rule)
			.join(NEWLINE)
	}
};

if (!entry_port || !CMD)
	CMD = "list";

console.log(CMDS[CMD](entry_port, dest_ip, dest_port));