const fs = require('fs'); 
const util = require('util');
const layBuilder = require("./layBuilder");

console.clear();

console.inspect = (object, depth=3) => {
    console.log(util.inspect(object, false, depth, true));
}


Object.defineProperty(String.prototype, 'showWhitespace', {
    value: function(tabSize = 4) {
        let result = '';
        let col = 0;

        for (let ch of this) {
            if (ch === '\t') {
                let spaces = tabSize - (col % tabSize);
                result += '→' + (spaces>0?' '.repeat(spaces-1):'');
                col += spaces;
            } else if (ch === ' ') {
                result += '·';
                col++;
            } else {
                result += ch;
                col++;
            }
        }

        return result;
    },
    writable: true,
    configurable: true,
    enumerable: false
});


Object.defineProperty(String.prototype, 'expandTabs', {
    value: function(tabSize = 4) {
        let result = '';
        let col = 0;

        for (let ch of this) {
            if (ch === '\t') {
                let spaces = tabSize - (col % tabSize);
                result += ' '.repeat(spaces);
                col += spaces;
            } else {
                result += ch;
                col++;
            }
        }

        return result;
    },
    writable: true,
    configurable: true,
    enumerable: false
});


const load = (path) => {
    try {
        const data = fs.readFileSync(path, 'utf8');
        return data.replaceAll("\t", "    ").split("\n");
      } catch (err) {
        return `<root></root>`;
    }
}



Array.prototype.peek = function() {
    return this.length>0?this[this.length - 1]:null;
}


function parseValue(val) {
    if (typeof val === 'string') val = val.trim();
    if (val === "true") return true;
    if (val === "false") return false;
    if (!isNaN(val) && val.trim() !== "") return Number(val);

    // Handle array-like values
    if (val.startsWith('[') && val.endsWith(']')) {
        // Slice off the brackets and split, but keep phrases like "cross road" intact
        let inner = val.slice(1, -1);
        let items = [];
        let buffer = '';
        for (let i = 0; i < inner.length; i++) {
            let c = inner[i];
            if (c === ',' && inner[i - 1] !== '\\') {
                items.push(buffer.trim());
                buffer = '';
            } else {
                buffer += c;
            }
        }
        if (buffer.length > 0) items.push(buffer.trim());
        return items.map(parseValue);
    }

    return val;
}

function parseAttributes(options) {
    if (!options.trim()) return {};

    let pairs = [];
    let buffer = '';
    let insideBracket = 0;

    for (let i = 0; i < options.length; i++) {
        let c = options[i];
        if (c === '[') insideBracket++;
        else if (c === ']') insideBracket--;
        if (c === ',' && insideBracket === 0) {
            pairs.push(buffer.trim());
            buffer = '';
        } else {
            buffer += c;
        }
    }

    if (buffer.trim()) pairs.push(buffer.trim());

    return Object.fromEntries(
        pairs.map(s => {
            let [key, val] = s.split('=');
            return [key.trim(), parseValue(val)];
        })
    );
}


const parseLayout = (lines) => {
    let VALID_FIRST_CHAR = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-@=:$'
    let views = {};
    let currentView = null;
    let structures = {};
    let currentList = null;
    let stack = [];
    let pause = false;
    let currentStructure = null;
    let currentTabulation = null;
    let context = '';
    for (let line of lines) {
        let tl = line.trim();
        if (tl == '' || tl.startsWith("#")) continue;

        if (line.startsWith('"')) {
            pause = !pause;
            continue;
        }

        let fl = tl[0];
        if (pause) continue;

        // if (!VALID_FIRST_CHAR.includes(fl)) {
        //     throw `Invalid start char at line ${lines.indexOf(line)}`;
        // }

        if (tl.startsWith('=')) {
            const viewName = tl.substring(1).trim();
            currentView = viewName;
            views[currentView] = [];
            currentList = views[currentView];
            stack = [];
            currentStructure = null;
            currentTabulation = null;
            continue;
        } else if (tl.startsWith('$') || (tl.startsWith('%'))) {
            context = tl.charAt(0);
            const structName = tl.substring(1).trim();
            structures[structName] = [];
            currentStructure = structName;
            currentList = structures[structName];
            currentTabulation = null;
            stack = [];
            continue;
        } else if (tl.startsWith('~')) {
            const tabulationName = tl.substring(1).trim();
            structures[tabulationName] = [];
            currentTabulation = tabulationName;
            currentList = structures[tabulationName];
            currentStructure = null;
            stack = [];
            continue;
        } 

        let spaces = line.match(/^\s*/)[0].length;
        let indent = spaces / 4;
        if (spaces % 4 !== 0) {
            throw `Indent is incorrect at line: "${line}"`;
        }

        let parts = tl.split(':');
        let what = parts[0].trim();
        let isComponent = what.startsWith("@");
        let _cls = (isComponent ? what.substring(1) : "textitem").toLowerCase();
        let options = (parts[1] || '').trim();
        let attributes = parseAttributes(options);

        let node;

        if (currentStructure !== null) {
            if (context == '$') {
                node = { text: what, attributes, children: [] };
            } else {
                node = { text: what, attributes, depth: (indent-1) };
            }
        } else if (currentTabulation !== null) {
            const parsed = line
                .split(',')
                .map(item => item.trim());
            currentList.push(parsed);
            continue;

        } else {
            node = isComponent
                ? { type: _cls, attributes, children: [] }
                : { type: _cls, value: what || "", attributes, children: [] };
        }

        while (stack.length && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }

        if (stack.length === 0 || !node.children) {
            currentList.push(node);
        } else {
            stack[stack.length - 1].node.children.push(node);
        }

        stack.push({ indent, node });
    }

    return { views, structures };
};

const parseDSL = (lines) => {
    let {views, structures} = parseLayout(lines);
    let results = {
        scenes:{},
        structures
    };
    for(let name in views) {
        let view = views[name];
        results.scenes[name] = layBuilder.buildView(view, structures);
        
    }
    return results;
}




module.exports = {
    parseLayout,
    load,
    parseDSL
};