const { COLORS } = require("../base/termutils");

const TERMINAL_COLORS = {
    30: "0;0;0",        40: "0;0;0",
    31: "255;0;0",      41: "255;0;0",
    32: "0;255;0",      42: "0;255;0",
    33: "255;255;0",    43: "255;255;0",
    34: "96;192;255",   44: "0;0;255",
    35: "255;0;255",    45: "255;0;255",
    36: "0;255;255",    46: "0;255;255",
    37: "240;240;240",  47: "255;255;255",
    

    90: "240;240;240",  100: "120;120;120",
    91: "255;0;60",     101: "255;60;60",
    92: "60;255;60",    102: "60;255;60",
    93: "255;255;60",   103: "255;255;60",
    94: "60;60;255",    104: "60;60;255",
    95: "255;60;255",   105: "255;60;255",
    96: "60;255;255",   106: "60;255;255",
    97: "230;240;250",  107: "255;255;255",
    
};

const COLOR_RANGES = {
    fg: [[30, 37], [90, 97]],
    bg: [[40, 47], [100, 107]]
};

function getBashColor(colorIndex, def_value=30) {
    return TERMINAL_COLORS[colorIndex]?TERMINAL_COLORS[colorIndex]:TERMINAL_COLORS[def_value];
}

function splitAnsiText(input) {
    const regex = /(\x1B\[[0-9;?;=]*[a-zA-Z]|\x1B\w)/g;
    let parts = input.split(regex).filter(part => part !== "");
    
    return parts.reduce((acc, part) => {
        if (/^\x1B\[[0-9;?;=]*[a-zA-Z]$|^\x1B\w$/.test(part)) {
            acc.push(part);
        } else {
            if (acc.length > 0 && !/^\x1B\[[0-9;?;=]*[a-zA-Z]$|^\x1B\w$/.test(acc[acc.length - 1])) {
                acc[acc.length - 1] += part;
            } else {
                acc.push(part);
            }
        }
        return acc;
    }, []);
}

function generateRenderSequence(text) {
    
    function parseAnsiSequence(ansiString) {
        const ansiRegex = /\x1B(?:\[([0-9;?;=]*)?([a-zA-Z])|(\w))/g;
        let match = ansiRegex.exec(ansiString);
        return match ? {
            params: match[1] ? match[1].split(';').map(Number) : [],
            code: match[2] || match[3],
            predicate: match[1] ? match[1].charAt(0) : ''
        } : null;
    }

    let results = [];
    text.replaceAll("\r", "").split('\n').forEach(line => {
        if (line.length == 0) {
            results.push({ "type": "sequence", content: "" });
        } else 
        {
            let round = splitAnsiText(line);
            let seq = [];
            for (let item of round) {
                let pSeq = parseAnsiSequence(item);
                if (pSeq != null) {
                    seq.push({ "type": "sequence", content: pSeq });
                } else {
                    // Ensure we don't include any stray escape characters in text
                    if (!item.startsWith('\x1B')) {
                        seq.push({ "type": "text", content: item });
                    } 
                }
            }
            if (seq.length) {
                results.push(seq);
            }
        }
    });

    return results;
}

function escapeStringLiteral(str) {
    return str
      .replace(/\\/g, '\\\\')   // escape backslashes
      .replace(/'/g, '\\\'')    // escape single quotes
      .replace(/"/g, '\\"')     // escape double quotes (optional)
      .replace(/\n/g, '\\n')    // escape newlines
      .replace(/\r/g, '\\r')    // escape carriage returns
      .replace(/\t/g, '\\t')    // escape tabs
      .replace(/\b/g, '\\b')    // escape backspace
      .replace(/\f/g, '\\f')    // escape form feed
      .replace(/\v/g, '\\v');   // escape vertical tab
  }
  

function unescapeStringLiteral(str) {
    return str
        .replace(/\\\\/g, '\\')   // must come first
        .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
        .replace(/\\v/g, '\v')
        .replace(/\\'/g, '\'')
        .replace(/\\"/g, '"');
  }

function colorInRange(component, value) {
    if (component instanceof Array) {
      for(let i of component) {
        if (value >= i[0] && value <= i[1])
          return true;
      }
    }
    return false;
}
  
function mapColorCodesToValues(org, indexes) {
    let results = {fg: null, bg: null}
    for(let i of indexes) {
      if (i == 0) {
        results.bg = null;
        results.fg = 37;
      }
      if (colorInRange(COLOR_RANGES.fg, i)) {
        results.fg = i;
      } else if (colorInRange(COLOR_RANGES.bg, i)) {
        results.bg = i;
      }
    }

    if (results.bg != null)
        results.bg = getBashColor(results.bg);
    results.fg = getBashColor(results.fg);
  
    return results;
}

function mCodes(colors, attrs) {
    let results = mapColorCodesToValues(colors, attrs.params);
    return results;
}


module.exports = {
    splitAnsiText,
    generateRenderSequence,
    getBashColor,
    COLOR_RANGES,
    TERMINAL_COLORS,
    escapeStringLiteral,
    unescapeStringLiteral,
    mCodes
}
