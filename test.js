const util = require('util');

console.inspect = (object, depth=3) => {
    console.log(util.inspect(object, false, depth, true));
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
                        //item = utils.removeNonPrintableChars(item);
                        // item = utils.removeHexSubstrings(item); //item.replaceAll("\x0F", "");
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

let seq = "\x1B[H\x1B[J\x1B[m\x0Ftop - 23:59:57 up 25 days,  8:04,  3 users,  load average: 0.83, 0.66, 0.58\x1B[m\x0F\x1B[m\x0F\x1B[K\r"
console.inspect(generateRenderSequence(seq));