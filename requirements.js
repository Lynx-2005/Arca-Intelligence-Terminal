const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const SERVER = path.join(ROOT, 'server');
const ROOT_MODULES = path.join(ROOT, 'node_modules');
const SERVER_MODULES = path.join(SERVER, 'node_modules');

function banner(text) {
  console.log('');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + text.padStart(29 + text.length / 2).padEnd(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log('');
}

function run(dir) {
  const name = path.basename(dir);
  const modules = path.join(dir, 'node_modules');

  if (fs.existsSync(modules)) {
    console.log(`  ✓ ${name}/ — already installed`);
    return;
  }

  console.log(`  ⌛ Installing ${name}/ dependencies...`);
  execSync('npm install', { cwd: dir, stdio: 'inherit' });
  console.log(`  ✓ ${name}/ — done`);
}

console.log('');
console.log('  █████╗ ██████╗  ██████╗ █████╗ ');
console.log('  ██╔══██╗██╔══██╗██╔════╝██╔══██╗');
console.log('  ███████║██████╔╝██║     ███████║');
console.log('  ██╔══██║██╔══██╗██║     ██╔══██║');
console.log('  ██║  ██║██║  ██║╚██████╗██║  ██║');
console.log('  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝');
console.log('');
console.log('  Installing requirements...');
console.log('');

run(ROOT);
run(SERVER);

console.log('');
console.log('  ──────────────────────────────────────────');
console.log('  All dependencies installed.');
console.log('');
console.log('  Next step:');
console.log('  $ node setup.js');
console.log('');
