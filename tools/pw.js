// shared Playwright launcher: routes web fonts through the session proxy, keeps localhost direct
const { chromium } = require('playwright');
module.exports = async () => chromium.launch({
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined,
});
