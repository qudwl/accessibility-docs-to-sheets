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

}

module.exports = attrReducer;