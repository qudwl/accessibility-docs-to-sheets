const url = (cur, next) => {
    if (cur.indexOf("Test URL") != -1) {
        let result;
        if (cur.indexOf("[_") == -1) {
            const first = next.indexOf("[_");
            const last = next.indexOf("_]");
            result = next.substring(first + 2, last);
        } else {
            const first = cur.indexOf("[_");
            const last = cur.indexOf("_]");
            result = cur.substring(first + 2, last);
        }

        return [true, result];
    } else {
        return [false];
    }
}

const summary = (cur, next) => {
    if (cur.indexOf("Executive Summary") != -1) {
        return [true, next];
    } else {
        return [false];
    }
}

const browser = (cur, next) => {
    if (cur.indexOf("Browser") != -1) {
        return [true, next];
    } else {
        return [false];
    }
}

const tools = (cur, next) => {
    if (cur.indexOf("Tools") != -1) {
        return [true, next];
    } else {
        return false;
    }
}

const attrReducer = [
    ["URL", url],
    ["Executive Summary", summary],
    ["Browsers", browser],
    ["Tools", tools]
];

const dataReducer = (page, title, list) => {
    const result = {page};
    result.title = title.substring(title.indexOf(":") + 1);
    result.desc = list[0].substring(list[0].lastIndexOf("*") + 2);
    result.rec = list[1].substring(list[1].lastIndexOf("*") + 2);
    result.succ = list[2].substring(list[2].lastIndexOf("*") + 2);

    return result;
}

const reducer = async (body) => {
    const data = {};

    let startIndex = 0;
    let curReducerIndex = 0;

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
    const wcag = [];
    const searchNum = /[012346789]/;

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
        if (data.succ.search(searchNum) != -1) {
            const critera = data.succ.substring(data.succ.search(searchNum), data.succ.search(searchNum) + 5);
            data.succ = critera;
            if (wcag.indexOf(critera) == -1) {
                wcag.push(critera);
            }
        }
        findings.push(data);
        arr = null;
        title = null;
      }
      startIndex++;
    }

    const wcagFormat = [];
    while (wcag.length) wcagFormat.push(wcag.splice(0, 1));
    
    data.findings = findings;
    data.wcag = wcagFormat;
    return data;
}

module.exports = reducer;