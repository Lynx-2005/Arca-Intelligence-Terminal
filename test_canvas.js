const assert = require('assert');

// Simulate the exact code
let x = NaN;
let currT = { k: 1, x: 0, y: 0 };
let width = 1000, height = 800;

const screenX = x * currT.k + currT.x;
const screenY = y * currT.k + currT.y;
console.log('Is NaN culled?', (screenX < -100 || screenX > width + 100 || screenY < -100 || screenY > height + 100));
