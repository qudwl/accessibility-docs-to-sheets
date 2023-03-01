const { createSheet } = require("./sheets");
const reducer = require("./data_reducer");
const getData = require("./readDocs");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout
})

const formData = async (res) => {
  const data = await reducer(res.body.content);

  const sheet = createSheet(res.title, data);
}

const cli = async () => {
  readline.question("Enter Document ID: ", id => {
    getData(id).then(res => {
      formData(res);
    });
    readline.close();
  });
}

cli();