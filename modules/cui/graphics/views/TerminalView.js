const FlexView = require("../views/FlexView");
const TextInput = require("../controls/TextInput");
const Layout = require("../base/Layout");
const UTILS = require("../extras/sshutils");
const termutils = require("../base/termutils");
const { CygwinAgent } = require("ssh2");

const connection_details = {
    host: '192.168.1.14',
    username: 'joseph',
    password: 'Summer@1987'
};


class TerminalView extends FlexView {
    #sessionPrompt = "$_:";
    #tbuffer = null;
    #session = null;
    #default_colors = { fg: UTILS.TERMINAL_COLORS[37], bg: null}
    constructor(options) {
        super({...options, flow:"column", gap: 1, padding: 1, color: {bg:"212;212;206"}});
        
        this.#tbuffer = new UTILS.SimpleTermBuffer();

        this.content = this.addChild(new Layout({flex: 1}));
        this.content.isFocusable = true;
        this.content.setAttribute("scrollable", true);
        this.inputContainer = this.addChild(new Layout({color: termutils.COLORS.RED, fixed: 1}));
        this.content.handleEvent = this.onContenthandleEvent.bind(this);
        this.textInput = this.inputContainer.addChild(new TextInput({readonly: false}));
        this.textInput.handleEvent  = this.handleEvent.bind(this);

        this.textInput.setOnActionListener((value) => {
            if (value === 'login') {
                this.login();
            } else if (value === 'cls') {
                this.#tbuffer.clear();
                this.render(true);
           
            } else if (value === 'raw') {
                this.#rawInput = true;
                this.textInput.setAttribute('color', termutils.COLORS.RED)
            } else if (value === '!raw') {
                this.#rawInput = false;
                this.textInput.setAttribute('color', termutils.COLORS.control.fill);
            } else if (value === "end") {
                this.#session.close();
                 this.#tbuffer.clear();
                this.render(true);
            } else {
                
                this.#session.send(value + "\r");
            }
            this.textInput.clear();
        });
        
        this.content.scrollHeight = this.#tbuffer.height;

        this.content.render = this.onRenderContent.bind(this);
    }

    login() {
        if (this.#session == null) {
            this.#session = new UTILS.SSHSession(connection_details, this.onData.bind(this));
            this.#session.connect();
        }
    }

    layout(rect) {
        super.layout(rect);
    }
    
    onRenderContent(now) {

    }


    

    render(now = true) {
        // if (!this.isShowing()) {
        //     return;
        // }

        // this.getStage().sceneFillRect(this.rect, this.getAttribute('color'), this.getAttribute('char'));

        // let len = this.#sessionPrompt.length;
        // let wd = this.inputContainer.width;
        // this.textInput.setRect(0, 0, 1, (wd-len-1), this.inputContainer.sceneY, this.inputContainer.sceneX + len + 1 );
        // this.textInput.render(now);

        // this.getStage().drawText(this.#sessionPrompt, this.inputContainer.sceneY, this.inputContainer.sceneX, termutils.COLORS.control.bold);
        // // this.getStage().put(this.#tbuffer, this.content.rect, this.content.scrollTop);
        // UTILS.renderView(this.#tbuffer, this.content);
        // this.content.drawVScrollbar();
        // this.getStage().sceneRenderRect(this.rect);
       
    }
    #z = 1;
    onData(data) {
        process.stdout.write(data);
        // console.log("\x1b[1;1H", [data], " <<< ")
            
        // if (data.includes("\x1b[1B")) {
        //     // return;
        // }
        // if (data.includes('\x1b[?1h')) {
        //     this.#rawInput = true;
        //     this.textInput.setAttribute("color", termutils.COLORS.RED);
        //     this.content.scrollTop = 0;
        // }

        // if (data.includes('\x1b[?1l')) {
        //     this.scrollTop = 0;
        //     this.#tbuffer.clear();
        //     this.#rawInput = false;
        //     this.textInput.setAttribute('color', termutils.COLORS.control.fill);
        //     return;
        // }

        // if (UTILS.looksLikeShellPrompt(data)) {
        //     this.#rawInput = false;
        //     this.scrollTop = 0;
        //     this.#sessionPrompt = UTILS.extractShellPrompt(data);
        //     this.textInput.clear();
        //     this.render(true);
        //     return;
        // }


        // const parsed = UTILS.generateRenderSequence(data);

        // for (let seq of parsed) {
        //     this.#drawLine(seq);
        //     this.#tbuffer.nextRow();        
        // }
        // const viewHeight = this.content.rect.height;
        // this.content.scrollHeight = this.#tbuffer.getCursor().y - viewHeight - 1;
        
        // const nearBottom = (this.content.scrollTop + this.content.rect.height) <= (this.#tbuffer.getCursor().y);
        // if (!this.#rawInput && nearBottom) {
        //     this.content.scrollTop = Math.max(0, this.#tbuffer.getCursor().y - this.content.rect.height);
        // }

        // this.render(true);

    }

    #ingnoreNext = false;
    #drawLine(seq) {
        if (!(seq instanceof Array)) return;

        let colors = { ...this.#default_colors };
        for (let item of seq) {
            if (item.type === 'sequence') {
                const content = item.content;
                switch (content.code) {
                    case "l":
                    case "h":
                        // this.#ingnoreNext = true;
                        // console.log('\x1b[4;1:', {params: content.params}); 
                        break;
                    case "M":
                        // console.log("\x1b[24;1H", content.params)
                        break;
                    case 'm': colors = UTILS.mCodes(colors, content); break;
                    case 'J': 
                        this.#tbuffer.clear(); 
                        this.content.scrollTop = 0;
                        break;
                    case 'H':
                        const y = (content.params[0] || 1) - 1;
                        const x = (content.params[1] || 1) - 1;
                        this.#tbuffer.setCursor(y, x);
                        break;
                    case 'B':
                        this.#tbuffer.moveY(content.params[0] ?? 1);
                        break;
                    case 'A':
                        this.#tbuffer.moveY(-(content.params[0] ?? 1));
                        break;

                    case 'C':
                        this.#tbuffer.moveX(content.params[0] ?? 1);
                        break;
                    case 'D':
                        this.#tbuffer.moveX(-(content.params[0] ?? 1));
                        break;
                    default:
                        // this.#ingnoreNext = true;
                        break;
                }
            } else if (item.type === 'text') {
                if (!this.#ingnoreNext)
                    this.#tbuffer.writeString(item.content, colors);

                this.#ingnoreNext = false;
            }
        }
    }
    #focusHandler = null;

    onContenthandleEvent(event) {
        // if (this.#rawInput && this.#session) {
        //     console.log("\x1b[30;1H", [event.rawData]);
            
        //     if (event.type === 'MouseEvent') {
        //         if (event.action === 'mousedown') {
        //             this.#focusHandler=this.onContenthandleEvent.bind(this);
        //         }
        //         UTILS.updateCursorPos(event, this.content.sceneY, this.content.sceneX);
        //     }
        //     this.#session.send(event.rawData);

        //     return;
        // }

        // switch (event.type) {
        //     case 'MouseEvent':
        //         this.contentHandleMouseEvent(event);
        //         break;
        //     case 'KeyEvent':
        //         return this.contentHandleKeyEvent(event);
        // }
    }

    onContenthandleEventx(event) {
        
        if (this.#rawInput && this.#session) {
            this.#session.send(event.rawData);
            return;
        }

        switch (event.type) {
            case 'MouseEvent':
                this.contentHandleMouseEvent(event);
                break;
            case 'KeyEvent':
                return this.contentHandleKeyEvent(event);
        }
    }

    contentHandleMouseEvent(event) {
        if (this.content.forScroll(event, this)) {
            return;
        }

        if (event.button === 'scroll') {
            let delta = event.delta;
            let oldTop = this.content.scrollTop;
            this.content.scrollTop = Math.max(0, this.content.scrollTop - delta * 4);
            if (oldTop !== this.scrollTop) {
                this.render(true);
            }
        } 
    }

    contentHandleKeyEvent(event) {
        
    }

    handleEvent(event) {
        if (this.#focusHandler) {
            this.#focusHandler(event);
            return;
        }
        switch (event.type) {
            case 'MouseEvent':
                this.handleMouseEvent(event);
                break;
            case 'KeyEvent':
                return this.handleKeyEvent(event);
        }
    }

    handleMouseEvent(event) {
        
        this.textInput.handleMouseEvent(event);
    }
    
   
    #rawInput = '';

    handleKeyEvent(event) {
        if (this.#rawInput && this.#session) {
            if (this.#rawInput && this.#session) {
                // console.log("\x1b[30;1H", [event.rawData]);
                
                if (event.type === 'MouseEvent') {
                    // if (event.action === 'mousedown') {
                    //     this.#focusHandler=this.onContenthandleEvent.bind(this);
                    // }
                    UTILS.updateCursorPos(event, this.content.sceneY, this.content.sceneX);
                }
                this.#session.send(event.rawData);

                return;
            }
            // let data = null;

            // if (event.raw === 'enter') {
            //     data = this.textInput.value + '\r';
            // } else if (event.raw === 'escape') {
            //     data = '\x1B';
            // } else if (event.raw === 'backspace') {
            //     data = '\x7F';
            // } else if (['up', 'down', 'left', 'right'].includes(event.raw)) {
            //     const arrowMap = {
            //         'up':    '\x1B[A',
            //         'down':  '\x1B[B',
            //         'right': '\x1B[C',
            //         'left':  '\x1B[D'
            //     };
            //     data = arrowMap[event.key];
            // } else if (this.textInput.value === 'exit') {
            //     data = '\u0003';
            // } else if (event.raw.length === 1) {
            //     // Normal printable key, like ':', 'd', '$', etc.
            //     // data = this.textInput.value + "\r";// event.raw;

            // }

            // if (data != null) {
            //     this.#session.send(data, true);
            //     return true; // prevent TextInput from interfering
            // }
        }

        return this.textInput.handleKeyEvent(event);
    }


    handleKeyEventx(event) {
        if (this.#rawInput && this.#session) {
            let data = null;// event.raw;// || event.xraw;
            if (event.key === 'enter') {
                data = '\r';
            } else if (event.key === 'escape') {
                data = '\x1B';
            } else if (event.key === 'backspace') {
                data = '\x7F'; // vi expects ASCII DEL for backspace
            } else if (['down', 'left', 'right', 'up'].includes(event.key)) { //event.key.startsWith('Arrow')) {
                // Handle arrow keys
                const arrowMap = {
                    'up':    '\x1B[A',
                    'down':  '\x1B[B',
                    'right': '\x1B[C',
                    'left':  '\x1B[D'
                };
                data = arrowMap[event.key] || data;
            }
            if (data != null) {
                this.#session.send(data);
                return true; // Prevent default TextInput handling
            }
        }
        return this.textInput.handleKeyEvent(event);
    }

}

module.exports = TerminalView

