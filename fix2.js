const fs = require('fs')
const path = require('path')

function getFiles(dir) {
  let res = []
  if (!fs.existsSync(dir)) return res
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory() && !['node_modules', '.next'].includes(e.name)) {
      res = res.concat(getFiles(p))
    } else if (e.isFile() && (p.endsWith('.tsx') || p.endsWith('.ts'))) {
      res.push(p)
    }
  }
  return res
}

const IMPORT_LINE = "import { supabase } from '@/lib/supabase'"
let n = 0

const files = [...getFiles('app'), ...getFiles('components')]

for (const f of files) {
  if (f.includes('lib/supabase')) continue

  let c = fs.readFileSync(f, 'utf8')

  // Le fichier utilise supabase mais n'a pas l'import
  if (c.includes('supabase') && !c.includes(IMPORT_LINE)) {
    if (c.startsWith("'use client'")) {
      c = c.replace("'use client'\n", "'use client'\n" + IMPORT_LINE + '\n')
    } else {
      c = IMPORT_LINE + '\n' + c
    }
    fs.writeFileSync(f, c, 'utf8')
    console.log('fixed:', f)
    n++
  }
}

console.log('\nDone —', n, 'fichiers corrigés')
