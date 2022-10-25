const puppeteer = require("puppeteer");
const express = require("express");

function encodeQueryData(data) {
  const ret = [];
  for (let d in data) if (data[d] !== undefined)
    ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
  return ret.join('&');
}

class OGImageServer {
  constructor({ port }) {
    this.port = port;
    this.browser = null;
    this.app = express();
    this.app.set('view engine', 'ejs');
    this.server = null;
    this.port = port;
  }

  async start() {
    this.browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    this.app.use('/', express.static(__dirname + '/../public'));
    this.app.get("/og/1a23", (req, res, next) => {
      const { title, desc, type } = req.query;
      res.render("1a23", { title, desc, type });
    });
    this.app.get("/og/blog", (req, res, next) => {
      const { title, desc } = req.query;
      res.render("blog", { title, desc });
    });
    this.app.get("/og/sekai", (req, res, next) => {
      const { title, desc, authors } = req.query;
      res.render("sekai", { title, desc, authors });
    });

    this.app.get("/og-image/1a23.png", async (req, res, next) => {
      try {
        const { title, desc, type } = req.query;
        const image = await this.getOGImageForText("1a23", { title, desc, type });
        res.setHeader('content-type', 'image/png');
        res.send(image);
      } catch (err) {
        next(err);
      }
    });
    this.app.get("/og-image/blog.png", async (req, res, next) => {
      try {
        const { title, desc } = req.query;
        const image = await this.getOGImageForText("blog", { title, desc });
        res.setHeader('content-type', 'image/png');
        res.send(image);
      } catch (err) {
        next(err);
      }
    });
    this.app.get("/og-image/sekai.png", async (req, res, next) => {
      try {
        const { title, desc, authors } = req.query;
        const image = await this.getOGImageForText("sekai", { title, desc, authors });
        res.setHeader('content-type', 'image/png');
        res.send(image);
      } catch (err) {
        next(err);
      }
    });

    this.server = await new Promise((resolve, reject) => {
      const server = this.app.listen(this.port, err => {
        if (err) {
          return reject(err);
        }

        resolve(server);
      });
    });

    console.log(`OG Image Server listening on port ${this.port}`);
  }

  async getOGImageForText(template, params) {
    const version = await this.browser.version();
    const page = await this.browser.newPage();
    const paramsStr = encodeQueryData(params);
    await Promise.all([
      page.goto(
        `http://localhost:${this.port}/og/${template}?${paramsStr}`
      ),
      page._frameManager._mainFrame.waitForNavigation()
    ]);
    const ogImageElement = await page.$("#og-image");
    const image = await ogImageElement.screenshot();
    await page.close();
    return image;
  }

  async stop() {
    await this.browser.close();
    this.server.close();

    this.app = null;
    this.server = null;
    this.browser = null;
  }
}

module.exports = OGImageServer;
