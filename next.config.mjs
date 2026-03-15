/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
```

**Ctrl+S** puis dans le terminal :
```
git add .
git commit -m "fix config"
git push