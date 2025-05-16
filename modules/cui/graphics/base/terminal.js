
let __MAIN_INPUT_HANDLER = null;
let __ACTIVE_INPUT_HANDLER = null;
let __TEMP_HANDLER_STACK = [];

const setTempHandler = (callback) => {
    if (callback instanceof Function) {
        __TEMP_HANDLER_STACK.push(callback);
        __ACTIVE_INPUT_HANDLER = callback;
    }
}

const amIMainHandler = (handler) => {
    return handler === __ACTIVE_INPUT_HANDLER;
}

const releaseHandler = (ref = null) => {
    if (!ref) {
        // Blind pop
        __TEMP_HANDLER_STACK.pop();
    } else {
        const index = __TEMP_HANDLER_STACK.lastIndexOf(ref);
        if (index === -1) return; // Already gone

        // Only remove if it’s still in the stack
        __TEMP_HANDLER_STACK.splice(index, 1);
    }

    // Restore active handler to new top or fallback to main
    __ACTIVE_INPUT_HANDLER = __TEMP_HANDLER_STACK.length > 0
        ? __TEMP_HANDLER_STACK[__TEMP_HANDLER_STACK.length - 1]
        : __MAIN_INPUT_HANDLER;
};

const __INPUT_TARGET = {
    targets: [],
    clearTargets: () => {
        __INPUT_TARGET.targets = [];
    },
    push: (handler) => {
        if (handler instanceof Function && !__INPUT_TARGET.targets.includes(handler)) {
            __INPUT_TARGET.targets.push(handler);    
        }
    },
    peek: (defHandler=null) => {
        return __INPUT_TARGET.targets.length > 0?
        __INPUT_TARGET.targets[__INPUT_TARGET.targets.length-1]:defHandler; 
    },
    pop: () => {
        let target = __INPUT_TARGET.targets.pop();
        if (target) {
            target({
                type: "HookRelease"
            })
        }
        return target;
    },
    releaseAll: () => {
        for(let target of __INPUT_TARGET.targets) {
            target({
                type: "HookRelease"
            })
        }        
        __INPUT_TARGET.targets = [];
    }
}
// handlers: __INPUT_TARGET,
    
const __MOUSE_EVENT = {
    type: 'none',
    button: 0,
    action: 'none',
    x: 0,
    y: 0,
    dbl: false,
    hoverTarget: "NONE"
}

const DOUBLE_CLICK_THRESHOLD = 300; 

let lastClickTime = 0;

function decodeMouseEvent(code, isRelease, x, y) {
    if (code >= 64) {
      const delta = code === 64 ? 1 : -1;
      return { type: "MouseEvent", button: 'scroll', delta, x, y };
    }

    const btn = code & 0b11;
    const drag = !!(code & 0b100000);
    const button = ['left', 'middle', 'right'][btn] || 'none';
    
    let action = (isRelease ? 'mouseup' : drag ? 'mousemove' : 'mousedown');
    let dbl = false;
        
    
    if (x !== __MOUSE_EVENT.x || y !== __MOUSE_EVENT.y) {
        action = 'mousemove';
        lastClickTime = 0;
    } else if (action == 'mousedown' && x === __MOUSE_EVENT.x && y === __MOUSE_EVENT.y) {
        const currentTime = Date.now();
        const timeDiff = currentTime - lastClickTime;
        dbl = timeDiff < DOUBLE_CLICK_THRESHOLD;
        lastClickTime = currentTime;
    }

    
    __MOUSE_EVENT.type = "MouseEvent";
    __MOUSE_EVENT.button = button;
    __MOUSE_EVENT.action = action;
    __MOUSE_EVENT.x = x;  
    __MOUSE_EVENT.y = y;
    __MOUSE_EVENT.dbl = dbl;

    return __MOUSE_EVENT;
}

function exitApplication(sayGoodBye=false) {
    process.stdin.write('\x1b[?1000l');
    process.stdin.write('\x1b[?1002l');
    process.stdin.write('\x1b[?1003l');
    process.stdin.write('\x1b[?1006l');
    process.stdout.write('\x1b[?25h');
    process.stdin.setRawMode(false);
    console.clear();

    if (sayGoodBye===true) {
        process.stdout.write("\x1b[13;13H\x1b[0mGood Bye!!!")
        setTimeout(() => {
            console.clear();
            process.exit();
        }, 4000);
    } else {
        process.exit();
    }
}

function parseKey(buffer) {
    const str = buffer.toString();
    const bytes = Array.from(buffer, b => b.charCodeAt?.(0) ?? b);
    const code = bytes.map(b => `0x${b.toString(16).padStart(2, '0')}`);

    let name = null;

    let vcode = [];
    for(let b of bytes) {
        if (b >= 0x20 && b < 0x7F) {
            vcode.push(String.fromCharCode(b))
        }
    } 
    if (str === '\x1A') name = "ctrl-z"
    else if (str === '\x19') name = "ctrl-y";
    else if (str === '\r') name = 'enter';
    else if (str === '\n') name = 'linefeed';
    else if (str === '\t') name = 'tab';
    else if (str === '\b' || str === '\x7f') name = 'backspace';
    else if (str === '\u001b') name = 'escape';
    else if (str === ' ') name = 'space';
    else if (str >= ' ' && str <= '~') name = str;
    // Handle escape sequences
    else if (str.startsWith('\x1b')) {
        if (str === '\x1b[A') name = 'up';
        else if (str === '\x1b[B') name = 'down';
        else if (str === '\x1b[C') name = 'right';
        else if (str === '\x1b[D') name = 'left';
        else if (str === '\x1b[2~') name = 'insert';
        else if (str === '\x1b[3~') name = 'delete';
        else if (str === '\x1b[5~') name = 'pageup';
        else if (str === '\x1b[5;5~') name = 'ctrl-pageup';
        else if (str === '\x1b[6~') name = 'pagedown';
        else if (str === '\x1b[6;5~') name = 'ctrl-pagedown';
        else if (str === '\x1b[H') name = 'home';
        else if (str === '\x1b[F') name = 'end';

        else if (str === '\x1b[1;3A') name = "alt-up";
        else if (str === '\x1b[1;5A') name = "ctrl-up";

        else if (str === '\x1b[1;3B') name = "alt-down";
        else if (str === '\x1b[1;5B') name = "ctrl-down";

        else if (str === '\x1b[1;3C') name = "alt-right";
        else if (str === '\x1b[1;5C') name = "ctrl-right";
        
        else if (str === '\x1b[1;3D') name = "alt-left";
        else if (str === '\x1b[1;5D') name = "ctrl-left";

        else if (str === '\x1b[3;5~') name = "ctrl-delete";
        else if (str === '\x1b[3;2~') name = "shift-delete";

        else if (str === '\x1b[1;5H') name = "ctrl-home";
        else if (str === '\x1b[1;5F') name = "ctrl-end";
        
        else if (str === '\x1b[1;2C') name = "shift-right";
        else if (str === '\x1b[1;2D') name = "shift-left";
        else if (str === '\x1b[Z') name = "shift-tab";

        else if (str === '\x1bOQ') name = "F2";
        else if (str === '\x1b[1;2Q~') name = "shift-F2";
        

        else if (str === '\x1bOR') name = "F3";
        else if (str === '\x1b[1;2R~') name = "shift-F3";
        
        else if (str === '\x1bOS') name = "F4";
        else if (str === '\x1b[1;2S~') name = "shift-F4";
        
        else if (str === '\x1b[15~') name = "F5";
        else if (str === '\x1b[15;2~') name = "shift-F5";
        

        else if (str === '\x1b[17~') name = "F6";
        else if (str === '\x1b[17;2~') name = "shift-F6";
        
        else if (str === '\x1b[18~') name = "F7";
        else if (str === '\x1b[18;2~') name = "shift-F7";
        
        else if (str === '\x1b[19~') name = "F8";
        else if (str === '\x1b[19;2~') name = "shift-F8";
        
        else if (str === '\x1b[20~') name = "F9";

        else if (str === '\x1b[20;2~') name = "shift-F9";

        else if (str === '\x1b[23;2~') name = "shift-F11";
        
        else if (str === '\x1b[24~') name = "F12";
        else if (str === '\x1b[24;2~') name = "shift-F12";
        
        
        else if (str.match(/^\x1b\[1;.*[A-Z]$/)) name = 'modified arrow/special';
        else name = 'unknown';
    } else {
        let n = bytes[0];
        if (n >= 1 && n < 26) {
            name = "ctrl-"+"ABCDEFGHIJKLMNOPQRSTUVWXYZ"[n-1];

        }
    }

    // console.log("\x1b[1;1H", {str, code, name});

        
    return {
        type: "KeyEvent",
        raw: str,
        bytes: code,
        name
    };
}




let __BEGAN__ = false;
const begin = (mainHandler, appStartHandler, payload) => {
    if (__BEGAN__) return;

    if (!(mainHandler instanceof Function)) 
        throw new Error("Handler callback must be a function");

    __BEGAN__ = true;

    __ACTIVE_INPUT_HANDLER =
    __MAIN_INPUT_HANDLER = mainHandler;
        
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.write('\x1b[?1000h');
    process.stdin.write('\x1b[?1002h');
    process.stdin.write('\x1b[?1003h');
    process.stdin.write('\x1b[?1006h');
    process.stdout.write('\x1b[?25l');
    


    const sendResizeMessage = () => {
        __INPUT_TARGET.clearTargets();
        __ACTIVE_INPUT_HANDLER({
            type: "ResizeEvent",
            rows: process.stdout.rows,
            columns: process.stdout.columns,
            handlers: __INPUT_TARGET
        });
    }
    process.stdout.on('resize', () => {
        sendResizeMessage();
    });

    
    
    process.stdin.on('data', (data) => {
        
        const sgrMatch = /\x1b\[<(\d+);(\d+);(\d+)([mM])/.exec(data);
        if (sgrMatch) {
            const [, btnCodeStr, xStr, yStr, type] = sgrMatch;
            const btnCode = parseInt(btnCodeStr, 10);
            const x = parseInt(xStr, 10);
            const y = parseInt(yStr, 10);
            const isRelease = type === 'm';

            const mouseEvent = decodeMouseEvent(btnCode, isRelease, x, y);
           
            let target_handler =__ACTIVE_INPUT_HANDLER;
            target_handler = __INPUT_TARGET.peek(target_handler);
            target_handler(mouseEvent);
        } else {
            const keyEvent = parseKey(data);
            
            if (keyEvent.name === 'ctrl-Q') {//data === '\u0003') {//} || keyEvent.name === 'escape' ) {
                exitApplication();
            } else if (keyEvent.name === 'escape') {
                let pop = __INPUT_TARGET.pop();
                if (pop) {
                    pop({type: "EscapeEvent"});
                    return;
                }
            }

            let target_handler =__ACTIVE_INPUT_HANDLER;
            let alt_handler = __INPUT_TARGET.peek(target_handler);
            let response = target_handler(keyEvent, alt_handler);

            // if (response) {
            //     releaseHandler();
            // } 
        }
    });

    if (appStartHandler instanceof Function) {
        let results = appStartHandler(payload);
        __MAIN_INPUT_HANDLER({type: "InitializeEvent"});
    }

    sendResizeMessage();


};


const executeCommand = (command) => {
    let msg = {
        type: "CommandEvent",
        command
    };
    __MAIN_INPUT_HANDLER(msg);
}

module.exports = {
    setTempHandler,
    releaseHandler,
    begin,
    executeCommand,
    exitApplication,
    amIMainHandler
}
