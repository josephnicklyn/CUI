/*
  0 = left/right side
  1 = top 
  2 = bottom
  3,4,5,6 are the corners
  .. the rest are for grids and things like that - not important for drawing a basic box
*/
const BOX_CHARS = [
    
    "││──┌┐└┘├┤─┴┬┼",
    "││──╭╮╰╯├┤─┴┬┼",
    "║║══╔╗╚╝╟╢─╧╤┼",
    "││═─╒╕└┘├┤─┴╤┼",
    "▌▐▀▄▛▜▙▟▌▐─███",
    "██████████████",
    "██▀▄██████─███"
    //  "||--++++||-+++",
    // "||--++++||-+++",
    // "||--++++||-+++",
    // "||--++++||-+++",
    // "||--++++||-+++",
    // "||--++++||-+++",
    // "||--++++||-+++",
    // "||--++++||-+++",
];
// U+258x	▀	▁	▂	▃	▄	▅	▆	▇	█	▉	▊	▋	▌	▍	▎	▏
// U+259x	▐	░	▒	▓	▔	▕	▖	▗	▘	▙	▚	▛	▜	▝	▞	▟
const ANSI_RGB = (fg3, bg3) => {
    let [fr, fg, fb] = fg3; // Foreground RGB
    let [br, bg, bb] = bg3; // Background RGB
    return `\x1b[0;38;2;${fr};${fg};${fb};48;2;${br};${bg};${bb}m`;
}

const ANSI_RGB_ITALIC = (fg3, bg3) => {
  let [fr, fg, fb] = fg3; // Foreground RGB
  let [br, bg, bb] = bg3; // Background RGB
  return `\x1b[3;38;2;${fr};${fg};${fb};48;2;${br};${bg};${bb}m`;
}

const ANSI_RGB_BOLD = (fg3, bg3) => {
  let [fr, fg, fb] = fg3; // Foreground RGB
  let [br, bg, bb] = bg3; // Background RGB
  return `\x1b[1;38;2;${fr};${fg};${fb};48;2;${br};${bg};${bb}m`;
}

const ANSI_RGB_BOLD_UNDERLINE = (fg3, bg3) => {
  let [fr, fg, fb] = fg3; // Foreground RGB
  let [br, bg, bb] = bg3; // Background RGB
  return `\x1b[1;4;38;2;${fr};${fg};${fb};48;2;${br};${bg};${bb}m`;
}

const COLORS = {
  PROMPT:             {fg: "0;192;216", bg:null, mode:'1'},
  BORDER:             {fg: "90;94;98", bg: "250;250;254"},
  BORDER_FOCUS:       {fg: "130;120;110", bg: "250;250;254"},
  WINDOW:             {fg: "20;25;30", bg: "220;220;230"},
  WINDOW_BACKGROUND:  {fg: "60;70;80", bg:"222;223;225"},
  BACKGROUND:         {fg: "210;220;230", bg: "40;50;65", mode:"0"}, 
  BACKGROUND2:        {fg: "255;255;220", bg: "130;150;170"},
  BACKGROUND_DK:      {fg: "240;200;0", bg: "20;40;60"},
  BUTTON:             {fg: "216;160;0", bg: "100;120;140"},
  BUTTON_HOVER:       {fg: "236;180;0", bg: "140;160;180"},
  APPBAR:             {fg: "175;175;128", bg: "30;40;50"},
  SPLITBAR:           {fg: "140;160;180", bg: "10;40;60"},
  
  scrollbar: {
    fill:             {fg: "180;180;183", bg: "255;255;255"},
    pill:             {fg: "0;192;128"}
  },
  control: {
    fill:             {fg: "40;70;120", bg:"255;255;250", mode:"0"},
    fill2:            {fg: "140;90;60", bg:"255;255;250", mode:"0"},
    fill2_bold:       {fg: "140;90;60", bg:"240;235;230", mode:"1"},
    focus_bold:       {fg: "140;50;60", bg:"255;215;200", mode:"1"},

    focus:            {fg: "40;50;60", bg:"210;220;230"}, //, mode:"0"},
    highlight:        {bg: "255;128;0"},
    bold:             {fg: "30;60;110", mode: "1"},
    underlined:       {fg: "30;60;110", mode: "4"},
    label:            {fg: "60;90;140", mode: "1"},
    inherit:          {fg: "40;70;120", mode:"0"},
    loud:             {fg: "100;90;40",  bg:"255;255;250", mode:"1"},
    hover:            {fg: "180;90;0", bg:"255;255;250"},

  },
  editor: {
    fill:             {fg: "80;110;160", bg:"252;252;255", mode:"0"},
    gutter:           {fg: "140;130;110", bg:"242;242;245", mode:"3"},
    lineFocus:        {fg: "60;90;140", bg: "232;242;252"},
    selected:         {fg: "60;90;140", bg: "200;230;255"},
    darkfill:         {fg: "60;70;80", bg:"242;242;245"},
    muted:            {fg: "120;145;170", bg: "238;240;242"}, mode: "3",
  },
  dialog: {
    title:            {fg: "220;180;0", bg: "30;50;70"},
    fill:             {fg: "50;70;90", bg: "230;232;234"},
  },
  menu: {
    menuitem:         {fg: "90;60;30", bg: "255;254;253"},
    menuframe:        {fg: "50;60;70", bg: "255;254;253"},
    menuitem_dim:     {fg: "190;200;210", bg: "255;254;253"},
  },
  infobar: {
    fill:             {fg: "200;200;190", bg: "90;92;94"},
    dark:             {fg: "180;180;170", bg: "60;65;70"},
    darker:           {fg: "160;186;150", bg: "40;45;50"}
  },
  list: {
    header:           {fg: "220;225;230", bg: "70;75;80"},
    hdr_selected:     {fg: "255;200;0", bg: "40;45;50"},
    item:             {fg: "100;70;30", bg: "240;243;246"},
    item_selected:    {fg: "90;60;20", bg: "180;185;190"}
  },
  toast: {
    fill:             {fg: "200;100;0", bg: "255;250;245"},
    border:           {fg: "140;80;30", bg: "255;250;245"},
  },
  table: {
    header:           {fg: "50;60;70", bg: "230;232;234", mode: '1'},
    cell:             {fg: "120;90;40", bg: "250;250;254"},
    cell_focus:       {fg: "255;221;0", bg: "100;160;255"},
    altRow:           {fg: "120;90;40", bg: "240;240;244"},

  },

  RED:                {fg: "255;255;0", bg: "255;0;0", mode:"0"},
  YELLOW:             {fg: "255;192;0", bg: "255;255;0"},
  ORANGE:             {fg: "255;192;0", bg: "255;128;0"},
  GREEN:              {fg: "255;192;0", bg: "0;255;0"},
  BLUE:               {fg: "255;192;0", bg: "0;0;255"},
  WHITE:              {fg: "235;225;215", bg: "255;255;255"},

}

const   TERMINAL_COLORS = {
    30: "0;0;0",        40: "40;50;65",
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

const QCODES = {
    SET_COLOR:          (...codes) => `\x1b[${codes.join(';')}m`,
    MOVE_CURSOR:        (row=0, col=0, type=5) => process.stdout.write(`\x1b[?25h\x1b[${type} q\x1b[${row};${col}H`),
    CURSOR_HIDE:        () => {process.stdout.write('\x1b[?25l')},
    CURSOR_SHOW:        () => {process.stdout.write('\x1b[?25h')},

    RESET:              '\x1b[0m',
    
    CLEAR_SCREEN:       '\x1b[2J',
    CURSOR_HOME:        '\x1b[H',
    ERASE_LINE:         '\x1b[2K',
    ERASE_LINE_AFTER:   `\x1b[0K`,
    ERASE_LINE_BEFORE:  `\x1b[1K`,
    CURSOR_TYPES: {     BLINK_BLOCK: 1,
                        STEADY_BLOCK: 2,
                        BLINK_UNDERLINE: 3,
                        STEADY_UNDERLINE: 4,
                        BLINK_BAR: 5,
                        STEADY_BAR: 6
                    }

}



const THEME = {
  FRAME:        QCODES.SET_COLOR(40, 33),
  TEXT:         QCODES.SET_COLOR(40, 37),
  HIGHLIGHT:    QCODES.SET_COLOR(30, 47),
  GUTTER:       QCODES.SET_COLOR(40, 37, 2),
  FOCUS:        QCODES.SET_COLOR(32),
  SELECTION:    QCODES.SET_COLOR(30, 47, 2)
}


// Padding utility function
function padString(str, width, align, pad=' ') {
  if (!width) return str;
  if (str.length > width) {
    return str.substring(0, width);
  }
  if (align === 'center') {
    const padding = width - str.length;
    if (padding <= 0) return str;
    const leftPadding = Math.floor(padding / 2);
    const rightPadding = padding - leftPadding;
    return pad.repeat(leftPadding) + str + pad.repeat(rightPadding);
  } else if (align === 'right') {
    return str.padStart(width, pad);
  } else {
    return str.padEnd(width, pad);
  }
}

function isPrototypeByName(obj, prototypeName) {
  // Basic input validation:  Check for null or undefined object.
  if (!obj) {
    return false;
  }

  let currentProto = obj;
  while (currentProto) {
    // Check if the object has a constructor property and if the constructor's name matches the given prototypeName.
    if (currentProto.constructor && currentProto.constructor.name === prototypeName) {
      return true;
    }
    //Traverse up the prototype chain.
    currentProto = Object.getPrototypeOf(currentProto);
  }
  return false;
}
  
function isInstanceOfByName(obj, constructorName) {
  // Basic input validation: Check for null or undefined object.
  if (!obj) {
    return false;
  }

  let currentProto = Object.getPrototypeOf(obj); // Start with the object's prototype.

  while (currentProto) {
    // Check if the constructor property exists and has the expected name.
    if (currentProto.constructor && currentProto.constructor.name === constructorName) {
      return true;
    }
    currentProto = Object.getPrototypeOf(currentProto); // Traverse up the prototype chain.
  }
  return false;
}


function removeNonPrintableChars(str) {
  return str.replace(/[^\x20-\x7E]/g, '');
  //return str.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

}

function ensureInteger(value) {
  if (Number.isInteger(value)) {
      return value;
  } else if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
          return parsed;
      }
  }
  return undefined;
}

function ensureIntegerInRange(value, min, max) {
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num)) {
      return min;
  }
  return Math.min(Math.max(num, min), max);
}


function skipForward(str, index, toNextWord=true) {
  const len = str.length;

  // Step 1: Skip non-word characters (spaces, punctuation, etc.)
  while (index < len && !/\w/.test(str[index])) {
    index++;
  }

  // Step 2: Skip current word characters
  while (index < len && /\w/.test(str[index])) {
    index++;
  }

  // Step 3: Skip following non-word characters to reach next word
  if (toNextWord) {
    while (index < len && !/\w/.test(str[index])) {
      index++;
    }
  }

  return index;
}

function skipToEndOfWord(str, index) {
  const len = str.length;

  // Step 1: Skip non-word characters (spaces, punctuation, etc.)
  while (index < len && !/\w/.test(str[index])) {
    index++;
  }

  // Step 2: Skip current word characters
  while (index < len && /\w/.test(str[index])) {
    index++;
  }

  // // Step 3: Skip following non-word characters to reach next word
  // while (index < len && !/\w/.test(str[index])) {
  //   index++;
  // }

  return index;
}

function skipBackward(str, index) {
  if (index <= 0) return 0;

  // Step 1: Move back over non-word characters
  index--;
  while (index >= 0 && !/\w/.test(str[index])) {
    index--;
  }

  // Step 2: Move back over the word
  while (index >= 0 && /\w/.test(str[index])) {
    index--;
  }

  // Step 3: We're now before the start of the word, so step forward one
  return Math.max(0, index + 1);
}
function removeNonPrintableChars(str) {
  return str.replace(/[^\x20-\x7E]/g, '');
}

function removeCRLF(text) {
  return text.replaceAll("\r", "");
}

function removeHexSubstrings(str) {
  return str.replace(/\\x[0-9a-fA-F]{2}/g, '');
}

function splitInts(str, sep=';', defValue = null) {
    let p = str.split(sep);
    let r = [];
    for(let it of p) {
      let val = parseInt(it);
      if (!isNaN(val))
        r.push(val);

    }
    if (r.length == 0 && defValue instanceof Array) {
      r.push(...defValue);
    }
    return r;
}

function getBashColor(colorIndex, def_value=37) {
    return TERMINAL_COLORS[colorIndex]?TERMINAL_COLORS[colorIndex]:TERMINAL_COLORS[def_value];
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

function mapColorCodesToValues(indexes) {
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



function splitAnsiText(input) {
    const regex = /(\x1B\[[0-9;?;=]*[a-zA-Z]|\x1B[\(\)][\x20-\x7E]|\x1B[78u])/g;
    let parts = input.split(regex).filter(part => part !== "");

    return parts.reduce((acc, part) => {
        if (/^\x1B\[[0-9;?;=]*[a-zA-Z]$|^\x1B[\(\)][\x20-\x7E]$|^\x1B\w$/.test(part)) {
            acc.push(part);
        } else {
            if (acc.length > 0 && !/^\x1B\[[0-9;?;=]*[a-zA-Z]$|^\x1B[\(\)][\x20-\x7E]$|^\x1B\w$/.test(acc[acc.length - 1])) {
                acc[acc.length - 1] += part;
            } else {
                acc.push(part);
            }
        }
        return acc;
    }, []);
}

function generateRenderSequence(text) {
    const results = [];
    const oscRegex = /\x1b\](\d+);([^\x07]*)\x07/g;

    function splitAndClassifyAnsi(input) {
        const parts = splitAnsiText(input);
        return parts.map(part => {
            const parsed = parseAnsiSequence(part);
            if (parsed) {
                return { type: 'sequence', content: parsed };
            } else {
                return { type: 'text', content: part };
            }
        });
    }

    function parseAnsiSequence(ansiString) {
        const csiMatch = /^\x1b\[([0-9;?;=]*)?([a-zA-Z])/.exec(ansiString);
        if (csiMatch) return { params: csiMatch[1] || '', code: csiMatch[2] };

        const appCursorMatch = /^\x1bO([A-D])/.exec(ansiString);
        if (appCursorMatch) return { params: '', code: appCursorMatch[1], appCursor: true };

        const charsetMatch = /^\x1b([\(\)][\x20-\x7E])/.exec(ansiString);
        if (charsetMatch) return { params: '', code: charsetMatch[1] };

        return null;
    }

    const controlCharRegex = /(\x1b\][0-9]+;[^\x07]*\x07)|(\x1b\[[0-9;?=]*[a-zA-Z])|(\x1b[\(\)][\x20-\x7E])|(\x1bO[A-D])|(\r\n|\r|\n)/g;

    // const controlCharRegex = /(\x1b\][0-9]+;[^\x07]*\x07)|(\x1b\[[0-9;?=]*[a-zA-Z])|(\x1b[\(\)][\x20-\x7E])|(\x1bO[A-D])|([\x0D\x0A])/g;
    
    let index = 0;
    let match;
    let line = [];

    while ((match = controlCharRegex.exec(text)) !== null) {
        if (match.index > index) {
            const preText = text.slice(index, match.index);
            line.push({ type: 'text', content: preText });
        }

        const token = match[0];

        if (token.startsWith('\x1b]')) {
            const oscMatch = /\x1b\](\d+);([^\x07]*)\x07/.exec(token);
            if (oscMatch) {
                line.push({ type: 'osc', content: { code: oscMatch[1], data: oscMatch[2] } });
            }
        } else if (token === '\r\n' || token === '\n' || token === '\r') {
            // line.push({ type: 'text', content: token });
            line.push({ type: 'control', content: token });
        } else {
            const parsed = parseAnsiSequence(token);
            if (parsed) {
                line.push({ type: 'sequence', content: parsed });
            } else {
                line.push({ type: 'text', content: token });
            }
        }

        index = controlCharRegex.lastIndex;
    }

    // Remaining text
    if (index < text.length) {
        line.push({ type: 'text', content: text.slice(index) });
    }

    if (line.length > 0) {
        results.push(line);
    }

    return results;
}



module.exports = {
    BOX_CHARS,
    COLORS,
    COLOR_RANGES,
    TERMINAL_COLORS,
    QCODES,
    THEME,
    generateRenderSequence,
    mapColorCodesToValues,
    ANSI_RGB,
    padString,
    isInstanceOfByName,
    isPrototypeByName,
    removeNonPrintableChars,
    ensureInteger,
    ensureIntegerInRange,
    skipForward,
    skipBackward,
    removeNonPrintableChars,
    removeCRLF,
    skipToEndOfWord,
    removeHexSubstrings,
    splitInts,
    getBashColor
}



//   /*
// U+250x	─	━	│	┃	┄	┅	┆	┇	┈	┉	┊	┋	┌	┍	┎	┏
// U+251x	┐	┑	┒	┓	└	┕	┖	┗	┘	┙	┚	┛	├	┝	┞	┟
// U+252x	┠	┡	┢	┣	┤	┥	┦	┧	┨	┩	┪	┫	┬	┭	┮	┯
// U+253x	┰	┱	┲	┳	┴	┵	┶	┷	┸	┹	┺	┻	┼	┽	┾	┿
// U+254x	╀	╁	╂	╃	╄	╅	╆	╇	╈	╉	╊	╋	╌	╍	╎	╏
// U+255x	═	║	╒	╓	╔	╕	╖	╗	╘	╙	╚	╛	╜	╝	╞	╟
// U+256x	╠	╡	╢	╣	╤	╥	╦	╧	╨	╩	╪	╫	╬	╭	╮	╯
// U+257x	╰	╱	╲	╳	╴	╵	╶	╷	╸	╹	╺	╻	╼	╽	╾	╿


// U+258x	▀	▁	▂	▃	▄	▅	▆	▇	█	▉	▊	▋	▌	▍	▎	▏
// U+259x	▐	░	▒	▓	▔	▕	▖	▗	▘	▙	▚	▛	▜	▝	▞	▟
// ▁
/*
▲	9650	25B2	BLACK UP-POINTING TRIANGLE
△	9651	25B3	WHITE UP-POINTING TRIANGLE
▴	9652	25B4	BLACK UP-POINTING SMALL TRIANGLE
▵	9653	25B5	WHITE UP-POINTING SMALL TRIANGLE
▶	9654	25B6	BLACK RIGHT-POINTING TRIANGLE
▷	9655	25B7	WHITE RIGHT-POINTING TRIANGLE
▸	9656	25B8	BLACK RIGHT-POINTING SMALL TRIANGLE
▹	9657	25B9	WHITE RIGHT-POINTING SMALL TRIANGLE
►	9658	25BA	BLACK RIGHT-POINTING POINTER
▻	9659	25BB	WHITE RIGHT-POINTING POINTER
▼	9660	25BC	BLACK DOWN-POINTING TRIANGLE
▽	9661	25BD	WHITE DOWN-POINTING TRIANGLE
▾	9662	25BE	BLACK DOWN-POINTING SMALL TRIANGLE
▿	9663	25BF	WHITE DOWN-POINTING SMALL TRIANGLE
◀	9664	25C0	BLACK LEFT-POINTING TRIANGLE
◁	9665	25C1	WHITE LEFT-POINTING TRIANGLE
◂	9666	25C2	BLACK LEFT-POINTING SMALL TRIANGLE
◃	9667	25C3	WHITE LEFT-POINTING SMALL TRIANGLE
◄	9668	25C4	BLACK LEFT-POINTING POINTER
◅	9669	25C5	WHITE LEFT-POINTING POINTER
◆	9670	25C6	BLACK DIAMOND
◇	9671	25C7	WHITE DIAMOND
◈	9672	25C8	WHITE DIAMOND CONTAINING BLACK SMALL DIAMOND
◉	9673	25C9	FISHEYE

◢	9698	25E2	BLACK LOWER RIGHT TRIANGLE
◣	9699	25E3	BLACK LOWER LEFT TRIANGLE
◤	9700	25E4	BLACK UPPER LEFT TRIANGLE
◥	9701	25E5	BLACK UPPER RIGHT TRIANGLE

◸	9720	25F8	UPPER LEFT TRIANGLE
◹	9721	25F9	UPPER RIGHT TRIANGLE
◺	9722	25FA	LOWER LEFT TRIANGLE
◻	9723	25FB	WHITE MEDIUM SQUARE
◼	9724	25FC	BLACK MEDIUM SQUARE
◽	9725	25FD	WHITE MEDIUM SMALL SQUARE
◾	9726	25FE	BLACK MEDIUM SMALL SQUARE
◿	9727	25FF	LOWER RIGHT TRIANGLE

□ 


help me to ensure that any instance of TermBuffer other than primary_buffer
rect is relative to primary_buffer

for example if buffer.render() is not the primary_buffer, buffer.render()
is rendered relative to primary_buffer


*/