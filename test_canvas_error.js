const { createCanvas } = require('canvas');
const canvas = createCanvas(200, 200);
const ctx = canvas.getContext('2d');
try {
  ctx.arc(100, 100, -5, 0, Math.PI * 2);
  console.log("Success");
} catch(e) {
  console.log("Error:", e.message);
}
