#!/bin/env node

import {
	is_sudo, write, exists, exec,
	readlines, touch
} from "computer";
import Program from "termite";

const RETURN = x => x;
const NEWLINE = '\n';
const SPACE = ' ';
const FILE = '~/.rules';

touch(FILE);
const parse = file => readlines(file)
	.map(rule => {
		const parts = rule.split(SPACE).filter(RETURN);
		// storing it as is, is a bit dumb.
		return [parts[8], ...parts[12].split(':')];
	});
const parse_args = args => {
	args = args.join(' ').split('=>').map(x => x.trim());
	return [parseInt(args[0]), ...args[1].split(':')];
}
const render_rule = (port_a, dest_ip, port_b) =>
	`PREROUTING -t nat -i ${INTERFACE} -p tcp --dport ${port_a} -j DNAT --to ${dest_ip}:${port_b}`;
const render = rules => rules.map(rule => render_rule(...rule)).join(NEWLINE);

const view_rule = (entry_port, dest_ip, dest_port) => `${entry_port} => ${dest_ip}:${dest_port}`;
const view = rules => rules.map(rule => view_rule(...rule)).join(NEWLINE);
const save = rules => write(FILE, render(rules));

const RULES_FILE = parse(FILE);

export default Program({
	list(interf) {
		this.println(view(RULES_FILE));
	},
	add(interf, ...args) {
		const [entry_port, dest_ip, dest_port] = parse_args(args);
		let rule = RULES_FILE.find(([port]) => entry_port === port);
		if (!rule)
			RULES_FILE.push([entry_port, dest_ip, dest_port]);
		else
			rule.splice(0, 3, entry_port, dest_ip, dest_port);
		
		save(RULES_FILE);
		this.println(view(RULES_FILE));
	},
	remove(interf, entry_port) {
		const rule = RULES_FILE.find(([port]) => entry_port === port);
		if (!rule)
			return `ERROR: port ${entry_port} has no existing rule.`
		
		const rules = RULES_FILE.filter(([port]) => port !== entry_port);
		save(rules);
		this.println(view(rules));
	},
	clear(interf) {
		// TODO: implement
	},
	// Prepend iptables -A
	on(interf) {
		this.list(RULES_FILE
			.map(rule => render_rule(...rule))
			.map(rule => 'iptables -A ' + rule));
	},
	// Prepend iptables -D
	off(interf) {
		this.list(RULES_FILE
			.map(rule => render_rule(...rule))
			.map(rule => 'iptables -D ' + rule));
		// and then actuall set 'em!
	}
});
