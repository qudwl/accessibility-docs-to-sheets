const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const { sheets } = require('googleapis/build/src/apis/sheets');

// If modifying these scopes, delete token.json.
const SCOPES = [
    "https://www.googleapis.com/auth/documents.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

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
        type: 'authorized_user',
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

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function create(auth, title) {
    const sheets = google.sheets({ version: 'v4', auth });
    const resource = {
        properties: {
            title,
        },
    };
    const spreadsheet = await sheets.spreadsheets.create({
        resource,
        fields: ['spreadsheetId', 'sheetId'],
    });
    console.log(`Spreadsheet ID: ${spreadsheet.data.spreadsheetId}`);
    console.log(`Spreedsheet Data:`);
    console.log(spreadsheet.data);

    const request = {
        spreadsheetId: spreadsheet.data.spreadsheetId,
        resource: {
            requests: [
                {
                    'addSheet': {
                        'properties': {
                            'title': 'Summary'
                        }
                    }
                },
                {
                    'addSheet': {
                        'properties': {
                            'title': 'Success Criteria'
                        }
                    }
                },
                {
                    'addSheet': {
                        'properties': {
                            'title': 'Findings'
                        }
                    }
                },
                {
                    'deleteSheet': {
                        'sheetId': 0
                    }
                }
            ]
        }
    };

    await sheets.spreadsheets.batchUpdate(
        request
    );
    return [spreadsheet.data.spreadsheetId, sheets];
}

const getSheetIds = async (spreadsheetId, sheets) => {
    sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties'
    }, (err, res) => {
        if (err) {
            console.error("The API returned an error: ", err);
            return null;
        } else {
            const arr = [];
            for (let i in res.data.sheets) {
                arr.push([res.data.sheets[i].title, res.data.sheets[i].sheetId]);
            }

            return arr;
        }
    });
}

const createSheet = async (title, data) => {
    const auth = await authorize().catch(console.error);
    const sheets = await create(auth, title);
    const arr = await getSheetIds(...sheets);

    console.log(data);
    
    updateSheet(...sheets, data);
};

const updateSheet = async (spreadsheetId, sheets, data) => {
    const valueInputOption = "USER_ENTERED";
    let values = [];
    let range;
    values.push(['Executive Summary', data["Executive Summary"]]);
    values.push(["Browsers used", data["Browsers"].join(", ")]);
    values.push(["AT used", data["Tools"].join(", ")]);
    values.push(["URL", data["URL"]]);
    range = "Summary!A1:B5";
    sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        resource: {values},
        valueInputOption
    });

    // Adding Success Criteria.
    const wcag = {values: data["wcag"]};
    range = "Success Criteria!A1:A" + data["wcag"].length;
    sheets.spreadsheets.values.update({
        spreadsheetId,
        range: range,
        resource: wcag,
        valueInputOption
    });

    // Setting Headers.
    range = "Findings!A1:E1"
    sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        resource: {values: [["Page", "Finding", "Description", "Recommendation", "Success Criteria"]]},
        valueInputOption
    })

    range = "Findings!A2:E" + (data.findings.length + 1);
    values = [];
    for (let i = 0; i < data.findings.length; i++) {
        const row = [];
        row.push(data.findings[i].page);
        row.push(data.findings[i].title);
        row.push(data.findings[i].desc);
        row.push(data.findings[i].rec);
        row.push(data.findings[i].succ);
        values.push(row);
    }
    sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        resource: {values},
        valueInputOption
    })
}

module.exports = { createSheet };