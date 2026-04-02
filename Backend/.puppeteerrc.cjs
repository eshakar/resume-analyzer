const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer so it gets included in the Render runtime deployment
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
