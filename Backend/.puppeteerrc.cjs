const { join } = require('path');

/**
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer so Render does not delete it between builds.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
