# Playwright with puppeteer-stealth

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/playwright-ts-puppet?referralCode=dPr4mc)

A basic Playwright setup with stealth plugin for bot detection testing and web automation. **Note: This template prioritizes compatibility and ease of use over perfect stealth.**
There are stronger stealth contenders that I will update / add as a template soon.

## What it does

- Uses `playwright-extra` with `puppeteer-extra-plugin-stealth` for basic bot detection bypass
- Launches a headless Chrome browser and tests against SannySoft bot detection
- Provides detailed test results showing which detection methods pass/fail
- Built with TypeScript for better development experience

## ⚠️ Important Limitations

**This template CAN be fingerprinted and detected by advanced anti-bot systems:**

- ✅ **Works well for**: Basic testing, screenshots, simple automation, development
- ❌ **Will be detected by**: Advanced fingerprinting sites, Cloudflare, modern anti-bot systems
- 🎯 **Use case**: Development, testing, proof-of-concepts, educational purposes

**Docker Version Lock**: Uses Playwright v1.65.1 to match Microsoft's official Docker image (`mcr.microsoft.com/playwright:v1.65.1-noble`). Microsoft's images are often behind the latest Playwright releases, so this template is locked to maintain compatibility.
Let me know if you find them too slow. I've build a few ones myself before.

# 1-click install
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/playwright-ts-puppet?referralCode=dPr4mc)
\
(railway is pretty cool, I promise)


## About railway
It's one of the few places that allow easy deploys, have everything, without running into real limitations.
Their bandwidth pricing is also fair. Need cheaper? Ovh + docker swarm! But don't call me to manage it.

## Eject repo to get your own code clone:
1. In the service settings, under Source, find the Upstream Repo setting
2. Click the Eject button
3. Select the appropriate GitHub organization to create the new repository
4. Click Eject service

For detailed instructions, see: [Railway Template eject Guide](https://docs.railway.com/guides/deploy#eject-from-template-repository)
