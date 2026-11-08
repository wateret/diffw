// dw — run a diff-producing command (or read stdin) and review it as a GitHub-style diff in the browser.
//   dw git show HEAD      dw git diff main...      git diff | dw
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const USAGE = `usage: dw [options] <command...>
       <command> | dw [options]

options:
  -p, --port <list>  ports to try in order, e.g. 7700,7800-7810 (default: random free port)
  -o, --open       also open the browser
  -h, --help       show this help

examples:
  dw git show HEAD
  dw git diff main...feature
  git diff --staged | dw`;

function parseArgs(argv) {
  const opts = { ports: [0], open: false, cmd: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { console.log(USAGE); process.exit(0); }
    else if (a === '-o' || a === '--open') opts.open = true;
    else if (a === '-p' || a === '--port') opts.ports = parsePorts(argv[++i]);
    else { opts.cmd = argv.slice(i); break; }
  }
  return opts;
}

function parsePorts(spec = '') {
  const ports = [];
  for (const part of spec.split(',')) {
    const m = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part);
    if (!m) { console.error(`dw: invalid port list '${spec}'`); process.exit(2); }
    for (let p = +m[1]; p <= +(m[2] || m[1]); p++) ports.push(p);
  }
  return ports;
}

// Over SSH the browser is on another machine, so listen on all interfaces and
// print the address of this server (3rd field of SSH_CONNECTION) instead of 127.0.0.1.
const sshHost = (process.env.SSH_CONNECTION || '').split(' ')[2] || null;
const bindHost = sshHost ? '0.0.0.0' : '127.0.0.1';

function listenOnFirstFree(server, ports) {
  return new Promise((resolve, reject) => {
    const tryNext = (i) => {
      if (i >= ports.length) return reject(new Error(`no free port in: ${ports.join(', ')}`));
      server.once('error', (e) => (e.code === 'EADDRINUSE' || e.code === 'EACCES') ? tryNext(i + 1) : reject(e));
      server.listen(ports[i], bindHost, () => { server.removeAllListeners('error'); resolve(server.address().port); });
    };
    tryNext(0);
  });
}

function readStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

async function getInput(cmd) {
  if (cmd.length === 0) {
    if (process.stdin.isTTY) { console.error(USAGE); process.exit(2); }
    return readStream(process.stdin);
  }
  const child = spawn(cmd[0], cmd.slice(1), {
    stdio: ['inherit', 'pipe', 'inherit'],
    env: { ...process.env, GIT_PAGER: 'cat', NO_COLOR: '1' },
  });
  child.on('error', (e) => { console.error(`dw: ${e.message}`); process.exit(127); });
  const out = await readStream(child.stdout);
  const code = await new Promise((r) => child.on('close', r));
  if (code) console.error(`dw: '${cmd.join(' ')}' exited with ${code}`);
  return out;
}

function openBrowser(url) {
  const [bin, args] = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : ['xdg-open', [url]];
  execFile(bin, args, () => {});
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const diff = await getInput(opts.cmd);
  if (!diff.trim()) { console.error('dw: no diff output'); process.exit(1); }

  const template = fs.readFileSync(path.join(__dirname, 'viewer.html'), 'utf8');
  const title = opts.cmd.length ? opts.cmd.join(' ') : 'stdin';
  const payload = JSON.stringify({ title, diff })
    .replace(/</g, '\\u003c').replace(new RegExp('\\u2028', 'g'), '\\u2028').replace(new RegExp('\\u2029', 'g'), '\\u2029');
  const html = template.replace('/*__DATA__*/null', () => payload);

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(html);
  });
  const port = await listenOnFirstFree(server, opts.ports);
  const url = `http://${sshHost && sshHost.includes(':') ? `[${sshHost}]` : sshHost || '127.0.0.1'}:${port}/`;
  console.log(url);
  console.error('dw: hosting this diff — Ctrl-C to stop');
  if (sshHost) console.error('dw: SSH session detected — listening on all interfaces; anyone who can reach this address can view the diff');
  if (opts.open) openBrowser(url);
}

module.exports = { main };
