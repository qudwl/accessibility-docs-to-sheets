const parseGoogleDocsJson = require("parse-google-docs-json");
const fs = require("fs");

const key = fs.readFileSync("./secret_key", { encoding: "utf8", flag: "r" });

async function start() {
  const parsed = await parseGoogleDocsJson({
    documentId: "142a2yhRqaEzMS2mcNBeiMH9FPQ_eGjedR59ilV1Apa0",
    clientEmail: "limb2@miamioh.edu",
    privateKey: key,
  });

  console.log(parsed.toJson());
  console.log(parsed.toMarkdown());
}

start();
