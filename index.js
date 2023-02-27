const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const { convertGoogleDocumentToJson } = require("./parser");
const { createSheet } = require("./sheets");
const {attrReducer, dataReducer} = require("./data_reducer");

// If modifying these scopes, delete token.json.
const SCOPES = [
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function getDataFromDoc(auth) {
  const docs = google.docs({ version: "v1", auth });
  const res = await docs.documents.get({
    documentId: "142a2yhRqaEzMS2mcNBeiMH9FPQ_eGjedR59ilV1Apa0",
  });

  return {
    body: convertGoogleDocumentToJson(res.data),
    title: res.data.title,
    auth: auth,
  };
}

authorize().then((res) => {
  getDataFromDoc(res).then((res) => {
    // const sheet = createSheet(res.title);

    const data = {};
    const body = res.body.content;

    let startIndex = 0;
    let curReducerIndex = 0;

    // Getting URL
    for (let i = startIndex; i < body.length; i++) {
      const keyCur = Object.keys(body[i])[0];
      const nextKey = Object.keys(body[i + 1])[0];
      const result = attrReducer[curReducerIndex][1](body[i][keyCur], body[i + 1][nextKey]);
      if (result[0]) {
        data[attrReducer[curReducerIndex][0]] = result[1];
        curReducerIndex++;
      }

      if (curReducerIndex >= attrReducer.length) {
        startIndex = i + 1;
        while (Object.keys(body[startIndex]).indexOf("h1") == -1) {
          startIndex++;
        }
        break;
      }
    }

    let arr = null;
    let page = null;
    let title = null;
    const findings = [];

    while (startIndex < body.length) {
      const key = Object.keys(body[startIndex])[0];
      if (key == "h1") {
        page = body[startIndex].h1;
      } else if (key == "ol") {
        arr = body[startIndex].ol;
      } else if (key == "h3") {
        title = body[startIndex].h3;
      }

      if (arr && page && title) {
        const data = dataReducer(page, title, arr);
        findings.push(data);
        arr = null;
        title = null;
      }

      startIndex++;
    }
    
    data.findings = findings;

    console.log(data);
  });
})