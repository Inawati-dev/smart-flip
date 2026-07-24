import { cpSync, existsSync } from 'node:fs'

const targets = ['legacy', 'books', 'assets', 'manifest.json', 'sw.js', 'config.json']

for (const target of targets) {
  if (existsSync(target)) {
    cpSync(target, `dist/${target}`, { recursive: true })
    console.log(`copied ${target} -> dist/${target}`)
  } else {
    console.warn(`skipped missing ${target}`)
  }
}
