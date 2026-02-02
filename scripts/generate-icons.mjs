#!/usr/bin/env node

import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const iconsDir = join(rootDir, 'public/icons')

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true })
}

// Read SVG file
const svgPath = join(iconsDir, 'icon.svg')
const svgBuffer = readFileSync(svgPath)

// Icon sizes to generate
const sizes = [
  // iOS Apple Touch Icons
  { size: 180, name: 'apple-touch-icon-180x180.png' },
  { size: 167, name: 'apple-touch-icon-167x167.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  // PWA/Android icons
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
]

console.log('Generating PNG icons from SVG...\n')

for (const { size, name } of sizes) {
  const outputPath = join(iconsDir, name)

  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath)

  console.log(`  Generated: ${name} (${size}x${size})`)
}

console.log('\nDone! All icons generated successfully.')
