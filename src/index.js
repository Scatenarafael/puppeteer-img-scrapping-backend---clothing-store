require("dotenv/config");
const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const app = express();
const request = require("request");
const cors = require("cors");

(async () => {
  newDataList = await imgScrap(process.env.SCRAP_URL);
  imgDownload(newDataList);

  app.use(
    cors({
      origin: "http://localhost:3000",
    })
  );
  app.get("/data", (req, res) => {
    res.send(newDataList);
  });
  console.log("server is running");
  app.listen(5000);
})();

async function imgScrap(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, {
    waitUntil: "networkidle0",
  });

  await page.setViewport({
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
  });

  await autoScroll(page);
  const dataList = await page.evaluate(() => {
    const dataList = [];

    document.querySelectorAll(".container-fluid").forEach((node) => {
      dataList.push({
        url:
          node.children[0].children[0].children[1].children[0].currentSrc ===
          undefined
            ? node.children[0].children[0].children[1].children[0].children[0]
                .children[0].children[1].dataset.src
            : node.children[0].children[0].children[1].children[0].currentSrc,
        description: node.children[1].innerText,
        cost: node.children[2].innerText,
        sizes: [
          node.children[3]?.innerText,
          node.children[4]?.innerText,
          node.children[5]?.innerText,
          node.children[6]?.innerText,
          node.children[7]?.innerText,
        ].filter((ch) => {
          return ch !== undefined;
        }),
      });
    });

    console.log(document.querySelectorAll(".container-fluid"));
    return dataList;
  });
  const newDataList = [];

  dataList.forEach((data) => {
    let a = data.url.split("/");
    let lastpos = a.length - 1;
    newDataList.push({
      url: data.url,
      description: data.description,
      imagepath: a[lastpos],
      sizes: data.sizes.map((size) => {
        return size.split("\n").filter((s) => {
          return (
            s !== "+" &&
            s !== "-" &&
            s !== "" &&
            s !== "×" &&
            s !== " Selecionar Opções" &&
            s !== "Selecionar Opções" &&
            s !== "Finalizar Seleção"
          );
        });
      }),
    });
  });
  await browser.close();
  return newDataList;
}

function imgDownload(newDataList) {
  newDataList.forEach(async (data) => {
    const filePath = path.join(
      __dirname,
      "../../front/pdfgen/public/images",
      data.imagepath
    );
    await download(data.url, filePath);
  });
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 50;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
function download(uri, filename) {
  return new Promise((resolve, reject) => {
    request.head(uri, function (err, res, body) {
      request(uri).pipe(fs.createWriteStream(filename)).on("close", resolve);
    });
  });
}
