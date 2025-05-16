const Layout = require("../base/Layout");
const {TextBuffer} = require("../extras/TextBuffer");
const termutils = require("../base/termutils");
const Clipboard = require("../base/Clipboard");

const fs = require('fs');
const path = require('path');
const FILE_MANAGER = require("../../FileManager");

class EditView extends Layout {
    static #activeFiles = {};

    static getActiveFiles() {
        return this.#activeFiles;
    }

    static normalize(filePath) {
        return path.resolve(filePath);
    }

    static get(filePath) {
        return this.#activeFiles[this.normalize(filePath)];
    }

    static set(filePath, view) {
        this.#activeFiles[this.normalize(filePath)] = view;
    }

    static remove(filePath) {
        delete this.#activeFiles[this.normalize(filePath)];
    }

    static removeByView(view) {
        for (const [key, val] of Object.entries(this.#activeFiles)) {
            if (val === view) {
                delete this.#activeFiles[key];
                return key;
            }
        }
        return null;
    }

    static rename(oldPath, newPath, view) {
        oldPath+='';
        newPath+='';
        oldPath = this.normalize(oldPath);
        newPath = this.normalize(newPath);

        if (this.#activeFiles[oldPath] === view) {
            delete this.#activeFiles[oldPath];
        }
        this.#activeFiles[newPath] = view;
    }
  
  
    #docPosition = { y: 0, x: 0, top_line: 0, left_col: 0 };
    #gutter = 5;
    #isMouseDown = false;
    #textBuffer = new TextBuffer();
    #includeLineNumbers = true;
    #showWhiteSpace = false;
  
    
    inputDialog(callback) {
        return this.getStage().requestDialog("input", {
            title: "Add SSH Config",
            fields: [
                { name: "host", label: "Host", value: "192.168.1.10" },
                { name: "username", label: "Username" },
                { name: "password", label: "Password", password: true },
                {
                    name: "options",
                    label: "Options",
                    type: "group",
                    items: [
                        { label: "Agent Forwarding", checked: true },
                        { label: "Compression" }
                    ]
                }
            ]
        }, null, null, {width: 48, height: 15}).then(result => {
            if (!result.cancelled) {
            }
        });
    }
    constructor(options) {
        super(options);
        this.#includeLineNumbers = true;
        this.#gutter = this.#includeLineNumbers ? 5 : 0;
        this.setAttribute("scrollable", true);
        this.setAttribute('color', termutils.COLORS.editor.fill);
        this.isFocusable = true;
    }
 
    get hasGutter() {
        return this.#gutter > 0;
    }

    get gutter() {
        return this.#gutter;
    }

    get includeLineNumbers() {
        return this.#includeLineNumbers;
    }

    get topLine() {
        return this.#docPosition.top_line;
    }

    get scrollbarX() {
        return this.clientRight - this.clientLeft - this.gutter - this.frameWidth;
    }

    updateSpecial(forRedraw = false, updateScroll = true) {
        let { x, y } = this.getCursorRelPosition(); // relative to view
        let h = this.height;
        let w = this.width;
    
        let innerHeight = h - 2;
        let innerWidth = w - (5 + this.#gutter);
    
        let needsUpdate = false;
    
        if (updateScroll) {
            // Selection scroll logic
            let selRange = this.#textBuffer.getSelectionRange();
            if (selRange) {
                let startY = selRange.start.row - this.scrollTop;
                let endY = selRange.end.row - this.scrollTop;
                if (startY < 0) {
                    this.scrollTop += startY;
                    needsUpdate = true;
                } else if (endY >= innerHeight) {
                    this.scrollTop += (endY - innerHeight + 1);
                    needsUpdate = true;
                }
            }
    
            // Caret vertical scroll
            if (y < 0) {
                this.scrollTop += y;
                needsUpdate = true;
            } else if (y >= innerHeight) {
                this.scrollTop += (y - innerHeight + 1);
                needsUpdate = true;
            }
    
            // Caret horizontal scroll
            let caretAbsX = this.#textBuffer.caret.col;
            let visibleCols = innerWidth;
    
            if (caretAbsX < this.scrollLeft) {
                this.scrollLeft = Math.floor(caretAbsX - (innerWidth / 3));
                needsUpdate = true;
            } else if (caretAbsX >= this.scrollLeft + visibleCols) {
                this.scrollLeft = Math.floor(caretAbsX - visibleCols + (innerWidth / 3));
                needsUpdate = true;
            }
    
            // Clamp
            this.scrollTop = Math.max(0, this.scrollTop);
            this.scrollLeft = Math.max(0, this.scrollLeft);
        }
    
        if (needsUpdate || forRedraw) {
            this.update();
        } else {
            this.updateCursorPosition();
        }
    }
    


    getVisualColumn(str, charIndex, tabSize = 4) {
        let col = 0;
        for (let i = 0; i < charIndex && i < str.length; i++) {
            if (str[i] === '\t') {
                col += tabSize - (col % tabSize);
            } else {
                col += 1;
            }
        }
        return col;
    }
    

    getCursorRelPosition() {
        let viewTop = this.scrollTop;
        let viewLeft = this.scrollLeft;
        let caret = this.#textBuffer.caret;
        let y = caret.row - viewTop;
    
        let rawLine = this.#textBuffer.lines[caret.row] || "";
        let visualX = this.getVisualColumn(rawLine, caret.col, this.tabSize || 4);
    
        let x = visualX - viewLeft;
        if (x < 0) x = 0;
        return { y, x };
    }

    updateCursorPosition() {
        if (this.isShowing()) {
            let {x, y} = this.getCursorRelPosition();
            let fixed = this.getStage().sceneGetRelativePos(this.rect, y+1, x+this.#gutter+3);
            termutils.QCODES.MOVE_CURSOR(fixed.y, fixed.x);
        } else {
            termutils.QCODES.CURSOR_HIDE;
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

     getCharIndexFromVisualCol(str, visualCol, tabSize = 4) {
        let col = 0;
        for (let i = 0; i < str.length; i++) {
            if (col >= visualCol) return i;
            if (str[i] === '\t') {
                col += tabSize - (col % tabSize);
            } else {
                col += 1;
            }
        }
        return str.length;
    }
    
    setCaretFromMouseEvent(y, x, updateScroll = true) {
        let rx = x - this.sceneLeft - (this.#gutter + 2) + this.scrollLeft;
        let ry = y - this.sceneTop - 1 + this.scrollTop;
    
        ry = Math.max(0, Math.min(this.#textBuffer.lineCount - 1, Math.floor(ry)));
    
        let rawLine = this.#textBuffer.lines[ry] || "";
        let tabSize = this.tabSize || 4;
    
        // Convert visual column (rx) to raw char index
        let caretCol = this.getCharIndexFromVisualCol(rawLine, rx, tabSize);
    
        this.#textBuffer.setCaret(ry, caretCol);
        this.updateSpecial(true, updateScroll);
        
    }
    
    async handleKeyEvent(event) {
                
        let beforeAndAfter = null;
        switch (event.name) {
            case 'ctrl-P': {
                // this.pasteClipboard();
                this.inputDialog((data) => {
                    
                });
                break;
            }
            case 'ctrl-T':
                this.getStage().showFileDialog((data) => {
                    this.loadFile(data.path)
                }, {title: "Open File ...", path: this.filePath});
                break;
                
            case 'ctrl-W':
                this.#showWhiteSpace = !this.#showWhiteSpace;
                beforeAndAfter = true;
                break;
            case 'ctrl-S':
                this.saveFile();
                break;
            case 'ctrl-D':
                this.saveAs();
                break;
    
            case "ctrl-V":
                this.pasteClipboard();
                break;
            
            case "ctrl-C":
                this.copySelection();
                break;
            case "ctrl-X":
                this.cutSelection();
                break;
            case "ctrl-A":
                this.#textBuffer.selectAll();
                beforeAndAfter = true;
                break;

            case 'enter':
                this.#textBuffer.clearSelection();
                beforeAndAfter = this.#textBuffer.insert("\n", true);
                break;
            case 'pageup':
            case 'pagedown':
                this.#textBuffer.applyKey(event.name, this.rect.height-2);
                break;
            case 'tab':
                beforeAndAfter = this.#textBuffer.insert(" ".repeat(4), true);
                break;
            case 'insert':
                break;
            default:
                let code = event.raw?.charCodeAt(0);
                if (code >= 0x20 && code < 0x7F) {
                    beforeAndAfter = this.#textBuffer.insert(event.raw);
                } else {
                    beforeAndAfter = this.#textBuffer.applyKey(event.name);
                }
                break;
        }
        this.updateSpecial(beforeAndAfter != null);
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
        } else 
        if (event.button === 'left') {
            
            if (event.dbl === true) {
                if (this.#textBuffer.selectWordAtCaret()) {
                    this.drawEditor();
                }
            } else if (event.action === 'mousedown') {
                this.requestFocus();
                this.setCaretFromMouseEvent(event.relY, event.relX, false);
                this.#isMouseDown = true;
                this.#textBuffer.setSelectionAnchor();
            }
            
            else if (event.action === 'mousemove') {
                if (this.#isMouseDown) {
                    this.setCaretFromMouseEvent(event.relY, event.relX);
                    this.drawEditor();

                }
            } else if (event.action === 'mouseup') {
                if (this.#isMouseDown) {
                    this.#isMouseDown = false;
                    this.setCaretFromMouseEvent(event.relY, event.relX);
                    // Check if selection is empty (same anchor and caret)
                    const range = this.#textBuffer.getSelectionRange();
                    if (range && range.start.row === range.end.row && range.start.col === range.end.col) {
                        this.#textBuffer.clearSelection();
                    }
                } 
                this.drawEditor();

            }
            
        }
    }

    drawEditor() {
        let lines = this.#textBuffer.lines;
        let color = termutils.COLORS.editor.fill;
        let selectedColor = termutils.COLORS.editor.selected;
        let lineFocus = termutils.COLORS.editor.lineFocus;

        let h = 1;
        this.getStage().sceneDrawFrame(this.border || 0, this.rect, termutils.COLORS.BORDER, termutils.COLORS.editor.fill, true);
        this.drawHScrollbar();
        let screenRow = this.rect.sceneY + 1;
        let gutterLeft = this.sceneX + 1;
        let docLeft = this.rect.sceneX + 2 + this.gutter;
        let viewHeight = this.rect.height - 2;
        let viewWidth = this.rect.width - (this.#gutter + 4);
        this.scrollHeight = Math.max(0, lines.length - viewHeight/2);
        let caretAtLine = this.#textBuffer.caret.row;
        let topLine = Math.min(this.scrollTop, this.scrollHeight);
        let maxLen = 0;

        for (let i = topLine; i < lines.length && h <= viewHeight; i++, h++, screenRow++) {
            let line = lines[i];
            let lineLen = line.length;
            if (lineLen > maxLen) { 
                maxLen = lineLen;
            }
            if (this.#showWhiteSpace) {
                line = line.showWhitespace();
                if (i < lines.length-1)
                    line = line + "¶";
            } else {
                line = line.expandTabs();
            }
            
            let visibleLine = line.slice(this.scrollLeft, this.scrollLeft + viewWidth);
            // Draw gutter
            let lineNum = String(i + 1 + '▐').padStart(this.gutter, ' ');
            this.getStage().sceneDrawText(
                lineNum,
                { sceneX: gutterLeft, sceneY: screenRow, width: this.gutter },
                termutils.COLORS.editor.gutter
            );
    
            // Draw document text with selection highlighting
            let docLine = i;
            let selStart = this.#textBuffer.getSelectionStart();
            let selEnd = this.#textBuffer.getSelectionEnd();
            
            if (selStart && selEnd && docLine >= selStart.row && docLine <= selEnd.row) {
  
                const rawLine = this.#textBuffer.lines[docLine] || "";
                const tabSize = this.tabSize || 4;
                
                let startCol = docLine === selStart.row
                    ? this.getVisualColumn(rawLine, selStart.col, tabSize) - this.scrollLeft
                    : 0;
                
                let endCol = docLine === selEnd.row
                    ? this.getVisualColumn(rawLine, selEnd.col, tabSize) - this.scrollLeft
                    : visibleLine.length;
                

                // Clamp columns to visible area
                startCol = Math.max(0, Math.min(startCol, viewWidth));
                endCol = Math.max(startCol, Math.min(endCol, viewWidth));
    
                // Draw unselected left side
                if (startCol > 0) {
                    this.getStage().sceneDrawText(
                        visibleLine.slice(0, startCol),
                        { sceneX: docLeft, sceneY: screenRow, width: startCol },
                        color
                    );
                }
    
                // Draw selected part
                if (startCol < endCol) {
                    this.getStage().sceneDrawText(
                        visibleLine.slice(startCol, endCol),
                        { sceneX: docLeft + startCol, sceneY: screenRow, width: endCol - startCol },
                        selectedColor
                    );
                }
    
                // Draw unselected right side
                if (endCol < visibleLine.length) {
                    this.getStage().sceneDrawText(
                        visibleLine.slice(endCol),
                        { sceneX: docLeft + endCol, sceneY: screenRow, width: visibleLine.length - endCol },
                        color
                    );
                }
            } else {
            
                this.getStage().sceneDrawEText(
                    " " + visibleLine,
                    { sceneX: docLeft-1, sceneY: screenRow, width: viewWidth+1 },
                    (i==caretAtLine?lineFocus:color)
                );

            }
        }
    
        // Draw remaining gutter lines
        if (this.hasGutter && h <= viewHeight) {
            while (h++ <= viewHeight) {
                let lineNum = " ".repeat(this.gutter - 1) + '▐';
                this.getStage().sceneDrawText(
                    lineNum,
                    { sceneX: gutterLeft, sceneY: screenRow++, width: this.gutter },
                    termutils.COLORS.editor.gutter
                );
            }
        }
        let w = Math.floor(maxLen - (this.width * 0.75));
        if (w < 0 && this.scrollLeft > 0) {
            this.scrollLeft = 0;
            this.drawEditor()
            return;
        }
        this.scrollWidth = w;
        this.drawVScrollbar();
        this.getStage().sceneRenderRect(this.rect);
        this.updateCursorPosition();
    }

    layout(rect) {
        this.rect = rect;
    }

    render() {
        this.clearMe(false);
        this.drawEditor();
        // this.update();
        this.updateCursorPosition();
    }

    update() {
        this.clearMe(false);
        this.drawEditor();
    }

    actionListener(action) {
        if (action === "SAVE") {
            this.saveFile();
        } else if (action === "SAVE_AS") {
            this.saveAs();
        }
    }

    destroy() {
        EditView.removeByView(this);
        super.destroy?.();
    }

    async loadFile(filePath) {
        try {
            const contents = await FILE_MANAGER.read(filePath, true);
            this.#textBuffer.setText(contents);
            this.filePath = filePath;
            this.update();
        } catch (err) {
            this.getStage().showError({error: "Unable to load file", filePath});
        }
    }

    saveFile() {
        if (this.filePath) {
            this.__writeFile(this.filePath);
        } else {
            this.saveAs("Create New File...");
        }
    }

    __writeFile(path, updateTracking=false) {
        if (typeof(path) !== 'string') 
            return;
        try {
            FILE_MANAGER.write(path, this.#textBuffer.toString(), {overwrite: true});

            if (updateTracking === true) {
                this.filePath = path;
                this.setTitle(this.filePath.split("/").pop());
            }

            return true;
        } catch (err) {
            this.getStage().showError({error: "Unable to write file", path:path, err});
            return false;
        }
    }

    async saveAs(title="Save As...") {
        this.getStage().showFileDialog((data) => {
            if (data && data.path);
                this.__writeFile(data.path, true);
        }, {title:"Save As...", path:this.filePath});
    }

    onFocus() {
        this.updateSpecial(true, false);
    }

    cutSelection() {
        if (!this.#textBuffer.hasSelection) return false;
        const len = this.#textBuffer.getSelectionLength().len;
        const text = this.#textBuffer.getSubText(this.#textBuffer.getSelectionStart(), len);
        Clipboard.write(text);
        
        this.#textBuffer.deleteRange(0);
        this.drawEditor();
        return true;
    }
    
    copySelection() {
        if (!this.#textBuffer.hasSelection) return false;
        const len = this.#textBuffer.getSelectionLength().len;
        const text = this.#textBuffer.getSubText(this.#textBuffer.getSelectionStart(), len);

        Clipboard.write(text);
        return true;
    }
    
    async pasteClipboard() {
        const text = await Clipboard.read();

        if (text) {
            this.#textBuffer.insert(text);
            this.drawEditor();
            return true;
        } else {
            return false;
        }
    }

    xpasteClipboard() {
        const text = Clipboard.read();
        if (text) {
            this.#textBuffer.insert(text);
            this.drawEditor();
            return true;
        }
        return false;
    }

    getMenuContext() {
        return {
            UNDO:       {active:this.#textBuffer.hasUndo(), onAction: () => {this.#textBuffer.doUndo(); this.drawEditor()}},
            REDO:       {active:this.#textBuffer.hasRedo(), onAction: () => {this.#textBuffer.doRedo(); this.drawEditor()}},
            CUT:        {active: this.#textBuffer.hasSelection, onAction: () => {this.cutSelection(); this.drawEditor()} },
            COPY:       {active: this.#textBuffer.hasSelection, onAction: () => {this.copySelection()} },
            PASTE:      {active: true, onAction: () => {this.pasteClipboard()} },
            SAVE:       {active:(this.#textBuffer.hasUndo() || this.#textBuffer.hasUndo()), onAction: () => this.saveFile()},
            SAVE_AS:    {active:(this.#textBuffer.hasUndo() || this.#textBuffer.hasUndo()), onAction: () => this.saveAs()},
        }
    }
}


function openFile(filePath) {
    let absPath = FILE_MANAGER.resolve(filePath);
    let view = EditView.getActiveFiles()[absPath];        
    let baseName = path.basename(absPath);
    if (!view) {
        view = new EditView({title:baseName});
        if (fs.existsSync(absPath)) {
            view.loadFile(absPath);
        }

        EditView.set(absPath, view);
        
    }
    return view;
}

module.exports = {EditView, openFile};
// this is a very very long line, would you like to see how this very long line can work with horizontal scolling enabled, now we can and there will be something very coool here what do you think about this?