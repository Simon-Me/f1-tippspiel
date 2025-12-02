const fs = require('fs')
const path = require('path')

const srcDir = path.join(__dirname, '../CARS')
const destDir = path.join(__dirname, '../public/cars/top')

// Create destination directory
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true })
}

// Copy TOP_OPEL.png as default.png
const src = path.join(srcDir, 'TOP_OPEL.png')
const dest = path.join(destDir, 'default.png')

fs.copyFileSync(src, dest)
console.log('Copied TOP_OPEL.png to public/cars/top/default.png')




