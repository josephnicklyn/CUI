const { TermBuffer } = require("../base/TermBuffer");
const { COLORS } = require("../base/termutils");
const { Client } = require('ssh2');
const utils = require("../base/termutils");

const   TERMINAL_COLORS = {
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

function getBashColor(colorIndex, def_value=37) {
    return TERMINAL_COLORS[colorIndex]?TERMINAL_COLORS[colorIndex]:TERMINAL_COLORS[def_value];
}

function splitAnsiText(input) {
    const regex = /(\x1B\[[0-9;?;=]*[a-zA-Z]|\x1B[78u])/g;

    // const regex = /(\x1B\[[0-9;?;=]*[a-zA-Z]|\x1B\w)/g;
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
    text.split('\n').forEach(line => {
        if (line.length == 0) {
            // results.push({ "type": "sequence", content: "" });
            results.push([]);
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
                        item = utils.removeNonPrintableChars(item);
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

function parseEscapedString(str) {
    return str.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|[\\'"nrbtfv])/g, (match, code) => {
        switch (code) {
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'b': return '\b';
            case 'f': return '\f';
            case 'v': return '\v';
            case '\\': return '\\';
            case "'": return "'";
            case '"': return '"';
        }
        if (code.startsWith('x')) {
            return String.fromCharCode(parseInt(code.slice(1), 16));
        }
        if (code.startsWith('u')) {
            return String.fromCharCode(parseInt(code.slice(1), 16));
        }
        return match; // unknown escape, leave as is
    });
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
    let results = { fg: null, bg: null, mode: "" };

    for (let i = 0; i < indexes.length; ) {
        const code = indexes[i];

        if (code === 38 || code === 48) {
            const isFg = (code === 38);
            const mode = indexes[i + 1];

            if (mode === 5 && indexes[i + 2] != null) {
                const colorIndex = indexes[i + 2];
                if (isFg) results.fg = getBashColor(colorIndex);
                else results.bg = getBashColor(colorIndex);
                i += 3;
                continue;
            }

            if (mode === 2 && indexes.length >= i + 5) {
                const r = indexes[i + 2];
                const g = indexes[i + 3];
                const b = indexes[i + 4];
                const rgbStr = `${r};${g};${b}`;
                if (isFg) results.fg = rgbStr;
                else results.bg = rgbStr;
                i += 5;
                continue;
            }
        }

        // Handle classic ANSI codes (30–37, 40–47, etc)
        if (indexes[i] < 8) {
            results.mode += results.mode ? `;${indexes[i]}` : `${indexes[i]}`;
        } else if (colorInRange(COLOR_RANGES.fg, indexes[i])) {
            results.fg = getBashColor(indexes[i]);
        } else if (colorInRange(COLOR_RANGES.bg, indexes[i])) {
            results.bg = getBashColor(indexes[i]);
        }

        i++;
    }

    return results;
}


function mapColorCodesToValuesx(org, indexes) {
    let results = {fg: null, bg: null}
    if (indexes[1] === 38){
      results.mode = `${indexes[0]}`;
      results.fg = `${indexes[3]};${indexes[4]};${indexes[5]}`;
      results.bg = `${indexes[8]};${indexes[9]};${indexes[10]}`
    } else {
      for(let i of indexes) {
          if (i < 8) {
            if (results.mode) 
              results.mode += `;${i}`;
            else 
              results.mode = `${i}`;
        } else if (colorInRange(COLOR_RANGES.fg, i)) {
          results.fg = i;
        } else if (colorInRange(COLOR_RANGES.bg, i)) {
          results.bg = i;
        }
      }

      if (results.bg != null)
          results.bg = getBashColor(results.bg);
      results.fg = getBashColor(results.fg);
    }
    return results;
}

function mCodes(colors, attrs) {
    let results = mapColorCodesToValues(colors, attrs.params);
    return results;
}

class TerminalBuffer extends TermBuffer {
    #cursor = { x: 0, y: 0 };

    constructor(rows = 100, cols = 120, y = 0, x = 0, style = utils.COLORS.BACKGROUND) {
        super(rows, cols, y, x, style);
    }

    scrollUp() {
        this.BUFFER.shift();
        this.BUFFER.push(Array.from({ length: this.width }, () => ({ char: ' ', style: this.defaultStyle })));
        if (this.#cursor.y > 0) {
            this.#cursor.y--;
        }
    }

    clear() {
      super.clear();
        this.#cursor = { x: 0, y: 0 };
    }
    
    get cursor() {
      return this.#cursor;
    }

    setCursor(y=null, x=null) {
        if (y !== null)
          this.#cursor.y = Math.max(0, Math.min(y, this.height - 1));
        if (x !== null)
          this.#cursor.x = Math.max(0, Math.min(x, this.width - 1));
    }

    moveX(delta = null) {
      if (delta != null) {
        let x = this.#cursor.x + delta;
        this.#cursor.x = Math.max(0, Math.min(x, this.width - 1));
      }
    }

    moveY(delta = null) {
      if (delta != null) {
        let y = this.#cursor.y + delta;
        this.#cursor.y = Math.max(0, Math.min(y, this.height - 1));
      }
    }

    nextRow() {
      this.#cursor.y++;
      this.#cursor.x = 0; 
    }

    getCursor() {
        return { ...this.#cursor };
    }

    writeString(str, style = this.defaultStyle) {
        let { x, y } = this.#cursor;

        for (const char of str) {
            if (char === '\n') {
                y++;
                x = 0;
            } else if (char === '\r') {
                x = 0;
            } else {
                if (y >= this.height) {
                    this.scrollUp();
                    y = this.height - 1;
                }

                this.setChar(y, x+1, char, style);
                x++;
                if (x >= this.width) {
                    x = 0;
                    y++;
                }
            }
        }

        this.setCursor(y, x);
    }
}

    

class SSHSession {
  constructor({ host, port = 22, username, password }, callback) {
    this.onDataCallback = (callback instanceof Function?callback:null);

    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.conn = new Client();
    this.shellStream = null;
  }
// this.shellStream.write('\x1b[?1000h'); // Enable mouse click tracking
        // this.shellStream.write('\x1b[?1006h'); // Use SGR (CSI <...M) encoding
        // this.shellStream.write('\x1b[?1002h'); // Optional: enable mouse drag tracking
        // this.shellStream.write('\x1b[?1003h'); // Optional: enable mouse motion (all movement)

        // this.shellStream.write('\r\n');
  
  connect() {
    this.conn.on('ready', () => {
      this.conn.shell({ term: 'xterm-256color', cols: 80, rows: 30 }, (err, stream) => {
        if (err) {
          console.error('Shell error:', err);
          this.conn.end();
          return;
        }

        this.shellStream = stream;
        

        stream.on('data', (data) => {
          if (this.onDataCallback) {
            this.onDataCallback(data.toString());
          }
          
          
        });

        stream.stderr.on('data', (data) => {
          console.error('STDERR:', data.toString());
        });

        stream.on('close', () => {
          this.conn.end();
        });
      });
    });

    this.conn.on('error', (err) => {
      console.error('SSH connection error:', err);
    });

    this.conn.connect({
      host: this.host,
      port: this.port,
      username: this.username,
      password: this.password
    });
  }

  onData(callback) {
    this.onDataCallback = callback;
  }

  send(cmd) {
    if (!this.shellStream && cmd === 'login') {
      this.conn = new Client();
      this.connect();
    }
    if (this.shellStream) {
      this.shellStream.write(cmd + "\n");
    }
  }

  sendSeq(cmd) {
    if (this.shellStream) {
      this.shellStream.write(cmd);
    }
  }

  close() {
    if (this.shellStream) {
      this.shellStream.end('exit\n');
    }
    this.conn.end();
  }
}

function looksLikeShellPrompt(lineText) {
    const trimmed = lineText.trim();
    if (trimmed.length < 3) return false;
    return /[a-zA-Z0-9@:/~.-]+[#$>] ?$/.test(trimmed);
}

function extractShellPrompt(lineText, defaultPrompt = "$_:") {
    const stripped = lineText.replace(/\x1B\[[0-9;?=]*[a-zA-Z]/g, '').trim();

    // Match user@host:/path$ or variations ending in $, #, or >
    const promptRegex = /^([a-zA-Z0-9@:/~._-]+[#$>])\s*$/;

    const match = stripped.match(promptRegex);
    return match?.[1] || defaultPrompt;
}

function updateCursorPos(event, sceneY = 0, sceneX = 0) {
  if (event && event.rawData) {
    const sgrMatch = /\x1b\[<(\d+);(\d+);(\d+)([mM])/.exec(event.rawData);
        if (sgrMatch) {
            const [, btnCodeStr, xStr, yStr, type] = sgrMatch;
            const x = Math.max(1, parseInt(xStr, 10)-sceneX);
            const y = Math.max(1, parseInt(yStr, 10)-sceneY);
            event.rawData = `\x1b[<${btnCodeStr};${x};${y}${type}`;
        }
  }
}


class SimpleTermBuffer {
    constructor(rows = 1000, cols = 80) {
        this.totalRows = rows;
        this.cols = cols;
        this.screen = Array.from({ length: rows }, () => Array(cols).fill(' '));
        this.cursorX = 0;
        this.cursorY = 0;
        this.scrollTop = 0;   // Top visible line
        this.viewHeight = 24; // Visible rows
    }

    write(data) {
        const str = data.toString('utf8');
        let i = 0;

        while (i < str.length) {
            const char = str[i];

            if (char === '\x1b' && str[i + 1] === '[') {
                const match = /\x1b\[([0-9;]*)([A-Za-z])/.exec(str.slice(i));
                if (match) {
                    const [, params, cmd] = match;
                    this.handleCSI(params, cmd);
                    i += match[0].length;
                    continue;
                }
            }

            if (char === '\r') {
                this.cursorX = 0;
            } else if (char === '\n') {
                this.cursorY++;
                if (this.cursorY >= this.totalRows) {
                    this.scroll();
                    this.cursorY = this.totalRows - 1;
                }
            } else {
                this.screen[this.cursorY][this.cursorX] = char;
                this.cursorX++;
                if (this.cursorX >= this.cols) {
                    this.cursorX = 0;
                    this.cursorY++;
                    if (this.cursorY >= this.totalRows) {
                        this.scroll();
                        this.cursorY = this.totalRows - 1;
                    }
                }
            }

            i++;
        }
    }

    handleCSI(params, cmd) {
        const [row = 1, col = 1] = params.split(';').map(p => parseInt(p || '1', 10));
        if (cmd === 'H' || cmd === 'f') {
            this.cursorY = Math.max(0, Math.min(this.totalRows - 1, row - 1));
            this.cursorX = Math.max(0, Math.min(this.cols - 1, col - 1));
        } else if (cmd === 'J') {
            if (params === '2') this.clearScreen();
        }
    }

    scroll() {
        this.screen.shift();
        this.screen.push(Array(this.cols).fill(' '));
        this.cursorY--;
        if (this.scrollTop > 0) this.scrollTop--;
    }

    clearScreen() {
        this.screen = Array.from({ length: this.totalRows }, () => Array(this.cols).fill(' '));
        this.cursorX = 0;
        this.cursorY = 0;
        this.scrollTop = 0;
    }

    setViewport(height, width = this.cols) {
        this.viewHeight = height;
        this.cols = width;
    }

    scrollUp(lines = 1) {
        this.scrollTop = Math.max(0, this.scrollTop - lines);
    }

    scrollDown(lines = 1) {
        this.scrollTop = Math.min(this.totalRows - this.viewHeight, this.scrollTop + lines);
    }

    getViewportLines() {
        return this.screen
            .slice(this.scrollTop, this.scrollTop + this.viewHeight)
            .map(row => row.join(''));
    }
}

function renderView(termBuffer, view) {
    const lines = termBuffer.getViewportLines();
    view.clear();

    for (let y = 0; y < lines.length; y++) {
        view.drawText(y, 0, lines[y]);
    }
}
module.exports = {
    splitAnsiText,
    generateRenderSequence,
    getBashColor,
    COLOR_RANGES,
    TERMINAL_COLORS,
    escapeStringLiteral,
    unescapeStringLiteral,
    parseEscapedString,
    mCodes,
    TerminalBuffer,
    SSHSession,
    looksLikeShellPrompt,
    extractShellPrompt,
    updateCursorPos,
    SimpleTermBuffer,
    renderView
}
