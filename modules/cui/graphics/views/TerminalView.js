const FlexView = require("../views/FlexView");
const TextInput = require("../controls/TextInput");
const Layout = require("../base/Layout");
const UTILS = require("../extras/sshutils");
const termutils = require("../base/termutils");

class TerminalView extends FlexView {
    #buffer = []
    #default_colors = { fg: 37, bg: null}
    constructor(options) {
        super({...options, flow:"column", gap: 1, padding: 1, color: {bg:"212;212;206"}});
        
        this.setAttribute("scrollable", true);


        this.content = this.addChild(new Layout({flex: 1}));
        this.textInput = this.addChild(new TextInput({readonly: false}));
        this.textInput.setOnActionListener((value) => {
            value = UTILS.unescapeStringLiteral(value);
            console.log("\x1b[1;1H", `You selected: ${value}`);
            this.#buffer.push(...UTILS.generateRenderSequence(value));
            this.textInput.clear();
            this.render(true);
        })
this.#buffer.push(...UTILS.generateRenderSequence(
        `
[0m[01;34mdir1[0m
[0m-rw-r--r--[0m 1 user group 1024 May 15 21:37 [0mfile1.txt[0m
[0m-rwxr-xr--[0m 1 user group 2048 May 10 10:00 [0m[01;32mscript.sh[0m[0m*
[0m-rw-rw-r--[0m 1 user group 4096 May 12 15:22 [0marchive.tar.gz[0m
[0m[01;36mlink_to_dir[0m[0m -> [0mdir1[0m
[0mlrwxrwxrwx[0m 1 user group    9 May 15 21:37 [0m[01;36mlink_to_file[0m[0m -> [0mfile1.txt[0m
`));
        this.content.render = this.onRenderContent.bind(this);
    }

    layout(rect) {
        super.layout(rect);
    }
/*
 this.setAttribute("scrollable", true);
        this.setAttribute('color', termutils.COLORS.editor.fill);
        this.isFocusable = true;
*/
    onRenderContent(now) {
        let rect = this.content.rect;
        this.getStage().sceneFillRect(rect, termutils.COLORS.BACKGROUND_DK)
        let screen_row = 1;
        let buffer_row = this.scrollTop;
        let bottom = this.content.height;
        for (; screen_row < bottom && buffer_row < this.#buffer.length; buffer_row++, screen_row++) {
            this.#drawLine(screen_row, this.#buffer[buffer_row]);
        }
        this.scrollHeight = (buffer_row - this.height);
        this.content.drawVScrollbar();
    }

    render(now = true) {
        if (!this.isShowing()) {
            return;
        }
        super.render();
        this.textInput.render(now);
        this.content.render(now);
        this.getStage().sceneRenderRect(this.rect);
      
    }

    #drawLine(screen_row, seq) {
        if (seq instanceof Array) {
            let colors = { ...this.#default_colors };
            let color = UTILS.TERMINAL_COLORS[30];
            let x = 4 + this.sceneLeft;
            let y = screen_row + this.sceneTop;
            for (let item of seq) {
                let content = item.content;
                if (item.type === 'sequence') {
                    switch (content.code) {
                        case 'm': 
                            colors = UTILS.mCodes(colors, content);
                            break;
                        case 'J':
                            if (content.params[0] === 2) this.clear();
                            break;
                    }
                    if (colors == null) colors = { fg: this.#default_colors.fg, bg: null };
                } else if (item.type === 'text') {
                    let text = content;
                    if (text.startsWith('\x1B')) continue;
                    let t_len = text.length;
                    
                    this.getStage().drawText(text, y, x, colors);
                    
                    x += t_len;
                }
            }
        }
    }

    handleEvent(event) {
        switch (event.type) {
            case 'MouseEvent':
                this.handleMouseEvent(event);
                break;
            case 'KeyEvent':
                return this.handleKeyEvent(event);
        }
    }

    handleMouseEvent(event) {
        if (this.forScroll(event)) {
            return;
        }
        if (event.button === 'scroll') {
            let delta = event.delta;
            let oldTop = this.scrollTop;
            this.scrollTop = Math.max(0, this.scrollTop - delta * 4);
            if (oldTop !== this.scrollTop) {
                this.update();
            }
        } else if (event.button === 'left') {

        }
    }

    handleKeyEvent(event) {
        
    }
}

module.exports = TerminalView
