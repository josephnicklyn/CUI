const utils = require("../base/termutils");
/**

 * THE MEMENTO stores changes of a TextBuffer.
 * - this implementation stores only delta's (stuff that has changed)
 *
 * THIS MEMENTO can be one of two flavors (INSERT or DELETED)
 *
 * 1) INSERT: stores the caret location and size of the insert
 *    note. the actual data will exist in the TextBuffer
 *
 * 2) DELETE: stores the caret location and a copy of the text deleted
 *
 * INSERTS and DELETES that occure at the same caret position will be chained
 *    by default where the action's are also an (INSERT or DELETE)
 *
 *    addInsertMemento && addDeleteMemento
 *    [forceNew] will override the default chaining behavior
 */


class Memento {
    constructor() {
        this.memento = [];
    }

    isEmpty() {
        return (this.memento.length == 0);
    }

    clear() {
        this.memento = [];
    }

    getLastMemento() {
        if (this.isEmpty()) {
            return null;
        } else {
            return this.memento[this.memento.length-1];
        }
    }

    peek() {
        return this.isEmpty()?null:this.memento[this.memento.length-1];
    }

    getAction() {
        return this.isEmpty()?null:this.memento[this.memento.length-1].action;
    }

    pop() {
        return this.peek()?this.memento.pop():null;
    }
    /**
     * Adds a new INSERT memento
     *   INSERTS by default are chained to reduce the number of memento's
     *   [forceNew] will optionally allow developers to break the chain
     *   for example: a developer might implement a keyinput of a space or a LF
     *   to break the chain and create more granular mementos
     *
     * @param {Integer} caretOffset zero-based index in the textbuffer where the insert began
     * @param {Integer} length the length of the insert
     * @param {Boolean} forceNew
     */
    addInsertMemento(caretOffset, length, forceNew=false) {
       
        if (length <= 0) return;

        let newMemento = {action:"INSERT", caretOffset, length};
        let lastMemento = this.peek();
        if (!forceNew && this.getAction() == "INSERT") {
            let lastEnd = lastMemento.caretOffset + lastMemento.length;
            if (lastEnd == caretOffset) {
                lastMemento.length += length;
            } else {  
                this.memento.push(newMemento);
            }  
        } else {
            this.memento.push(newMemento);
        }
    }
    /**
     * Adds a new DELETE memento
     * DELETES by default are chained to reduce the number of memento's
     *   [forceNew] will optionally allow developers to break the chain
     * @param {*} caretOffset
     * @param {*} text
     * @param {*} forceNew
     * @returns
     */
    addDeleteMemento(caretOffset, text, forceNew=false) {
        if (typeof(text) !== "string" || text=="") return;
        let lastMemento = this.peek();
        if (forceNew || lastMemento == null || !this.getAction() === "DELETE") {
            this.memento.push({action:"DELETE", caretOffset, text} );
        } else {
            let lastCaretOffset = lastMemento.caretOffset;
            let lastText = lastMemento.text;
            if (caretOffset == lastCaretOffset) {
                lastMemento.text = lastText + text;
            } else if (caretOffset + text.length == lastCaretOffset) {
                lastMemento.text = text + lastText;
                lastMemento.caretOffset = caretOffset;
            } else {
                this.memento.push({action:"DELETE", caretOffset, text} );
            }
        }
    }
}

class TextBuffer {
    constructor(text="") {
        this.setText(text);
        this.anchor = null;
        this.hasSelection = false;
        this.caret = {row: 0, col: 0, pcol: 0};
    }

    reportAnchor() {
            let selected = this.getSelectionRange();
            if (selected) {
            return `${selected.start.row}x${selected.start.col}, ${selected.end.row}x${selected.end.col}, ${this.hasSelection}`;
            } else {
                return 'nothing selected';
            }
    }
    
    /**
     * Clears the contents of the text buffer
     */
    clear() {
        this.lines = [];
        this.caret = {row: 0, col: 0, pcol: 0};
        this.anchor = null;
        this.hasSelection = false;
        this.undoMemento = new Memento;
        this.redoMemento = new Memento;
    }
    isEmpty() {
        return (this.length == 0);
    }
    /**
     * Calculates the total length of the document
     *  The sum of the (length of all lines) + (the number of lines) - 1
     * @returns the length of the document
     */
    length() {
        let len = 0;
        for(let ln of this.lines) {
            len+=ln.length;
        }
        if (this.lines.length > 1) {
            // ensure new line characters are included in the length
            // new line characters are implied by the number of lines
            len+=(this.lines.length-1);
        }
        return len;
    }
    /**
     * Sets/Resets content of the text buffer to the new value contained in [text]
     * @param {string} text : any value inserted will be turned into a text value
     */
    setText(text) {
        if (text == null)
            text = "";
        text = utils.removeNonPrintableChars(String(text));
        this.clear();
        this.#_insert(text, false, false);
        this.setCaret(0, 0);
    }
    /**
     * Returns the entire buffer as a single string
     */
    getText() {
        return this.lines.join("\n");
    
    }

    getCaretOffset(caret = null) {
        if (caret == null) 
            caret = this.caret
        let p = caret.col;
        let l = 0;
        let m = 0;
        for(let line of this.lines) {
            p+=m;
            if (l++ >= caret.row) {
                break;
            }
            p += (line.length);
            m = 1;
        }
        return p;
    }

    setCaretOffset(offset) {
        offset = utils.ensureInteger(offset);
        if (offset < 0)
            offset = 0;
        let caret = this.toCaret(offset);
        this.setCaret(caret.row, caret.col);
        return caret;
    }

    toCaret(offset) {
        let p = 0;
        let row = 0;
        let col = 0;
        let adj = 0;
        for(let line of this.lines) {
            p += (line.length+adj);
            if (p >= offset) {
                col = line.length-(p-offset);
                break;
            }
            row++;
            adj = 1;
        }
        if (row > this.lines.length)
            row = this.lines.length-1;

        return {col, row};
    }

    navLeft(jump=false) {
        let moved = 1;
        let {row, col} = this.caret;
        if (!jump) {
            col--;
            if (col < 0) { 
                row--;
                col = this.getLineLength(row);
                moved = 1;
            }
        } else {
            if (col == 0) {
                row--;
                col = this.getLineLength(row);
                moved = 1;
            } else {
                col = utils.skipBackward(this.getLine(row), col);
            }
        }
        this.setCaret(row, col, true);
        return moved;
    }

    navRight(jump=false) {
        let moved = 1;
        let {row, col} = this.caret;
        if (!jump) {
            col++;
            if (col > this.getLineLength(row) && row+1 < this.lines.length) {
                col = 0;
                row++;
                moved = 1;
            }
        } else {
            if (col+1 >= this.getLineLength(row)) {
                if (row+1 < this.lines.length) {
                    row++;
                    col = 0;
                    moved = 1;
                }
            } else {
                moved = col;
                col = utils.skipForward(this.getLine(row), col);
                moved = col - moved;
            }
        }
        this.setCaret(row, col, true);
        return moved;
    }

    selectWordAtCaret() {
        let { row, col } = this.caret;
        let line = this.getLine(row);
        if (!line) return false;
    
        // Find beginning of word
        let bWord = utils.skipBackward(line, col);
        // Find end of word
        let eWord = utils.skipForward(line, col, false);

        // Safety checks
        if (bWord < 0) bWord = 0;
        if (eWord > line.length) eWord = line.length;

        let alreadySelected =
            this.hasSelection &&
            this.anchor.row === row &&
            this.anchor.col === bWord &&
            this.caret.col === this.eWord;

        if (alreadySelected) {
            bWord = 0;
            eWord = line.length;    
        }

        this.eWord = eWord;
        

        this.clearSelection();
        this.setCaret(row, bWord);
        this.setSelectionAnchor();  // anchor at word start
        this.setCaret(row, eWord, false); // extend selection to word end
        return true;
    }

    applyKey(name, details=0) {
        let {row, col} = this.caret;
        let beforeAndAfter = {before:this.caret};
        let clearSelection = true;
        switch (name) {
            case "left":        
                this.navLeft(); 
                break;
            case "right":       
                this.navRight(); 
                break;
            case 'ctrl-right':  
                this.navRight(true); 
                break;
            case 'ctrl-left':   
                this.navLeft(true); 
                break;
            case "up":          
                this.setCaret(row-1, col, false, true); 
                break;
            case "down":        
                this.setCaret(row+1, col, false, true); 
                break;
            case "pagedown":
                this.setCaret(row+details, col, false, true); 
                break;
            case "pageup":
                this.setCaret(row-details, col, false, true); 
                break;
            case "backspace":
                if (this.hasSelection) {
                    this.deleteRange(0);
                } else {
                    this.navLeft()
                    this.deleteRange(1);
                }    
                break;
                case "shift-tab": {
                    let currentLine = this.getCurrentLine() || "";
                    let leadingSpaces = this.getLeadingWhitespaceLength(currentLine);
                    if (leadingSpaces > 0) {
                        leadingSpaces = leadingSpaces % 4;
                        if (leadingSpaces == 0) leadingSpaces = 4;
                        if (leadingSpaces >= 0) {
                            let cc = this.caret.col - leadingSpaces; 
                            this.caret.col = 0;
                            this.deleteRange(leadingSpaces);
                            this.setCaret(this.caret.row, cc);//caret.col = cc;
                        }
                    }
                }
                break;
            case "delete":      
                this.deleteRange(1); 
                break;
            case 'end':
                this.setCaret(row, this.getLineLength(row), true);
                break;
            case 'home':
                this.setCaret(row, 0, true);
                break;
            case 'ctrl-end':
                this.setCaret(this.lines.length-1, this.getLineLength(this.lines.length-1), true);
                break;
            case 'ctrl-home':
                this.setCaret(0, 0, true);
                break;
            case "shift-left":
                if (!this.hasSelection) {
                    this.setSelectionAnchor();
                }
                this.navLeft();
                clearSelection = false;
                break;
            case "shift-right":
                if (!this.hasSelection) {
                    this.setSelectionAnchor();
                }
                this.navRight();
                clearSelection = false;
                break;
            case 'ctrl-y':
                this.doRedo();
                break;
            case 'ctrl-z':
                this.doUndo();
                break;
            case 'ctrl-delete':
                this.setCaret(null, 0);
                let len = (this.getCurrentLine() || "").length;
                this.deleteRange(len+1);
                break;
            case 'shift-delete':
                let ln = this.getCurrentLine() || "";
                if (ln !== '') {
                    let col = this.caret.col;
                    if (ln[col] === ' ') {
                        let d   = 0;
                        for(let i = col; i < ln.length; i++) {
                            let ch = ln[i];
                            if (ch != ' ') {
                                break;
                            } else {
                                d++;
                            }
                        }
                        if (d>0) {
                            this.deleteRange(d);
                        }
                    }
                    
                } else {
                    this.setCaret(null, 0);
                    let len = (this.getCurrentLine() || "").length;
                    this.deleteRange(len+1);    
                }
                break;
        }
        if (clearSelection) {
            this.hasSelection = false;
        }
        beforeAndAfter.after = this.caret;
        return beforeAndAfter;
    }

    getLineLength(index) {
        let line = this.getLine(index);
        return line?line.length:0;
    }

    getLine(index) {
        if (index >= 0 && index < this.lines.length) 
            return this.lines[index];
        return null
    }

    getCurrentLine() {
        let nr = this.caret.row;
        let targetLine = this.lines[nr];
        return targetLine;
    }
    /**
     * Updates the caret position and ensures row/col are valid (within the bounds of the buffer)
     * @param {Integer} row the line (0 based index)
     * @param {Integer} col column on the row to be set (0 based index)
     * @param {Boolean} setPref updates the prefered column
     * - used to maintain column placement during up/down navigation
     */
    setCaret(row, col = 0, setPref = false, usePref = false) {

        // if (this.isEmpty()) {
        //     this.caret.row = 0;
        //     this.caret.col = 0;
        //     return;
        // }
        if (row == null) row = this.caret.row;
        let nr = utils.ensureIntegerInRange(row, 0, this.lines.length - 1);
        // if (nr < 0) 
        //     return
        let nc = utils.ensureInteger(col);
        let op = this.caret.pcol;
        let targetLine = this.lines[nr];
        if (targetLine == null)
            return;
        let tlLength = targetLine.length;

        if (this.lines.length !== 0) {
            if (nc < 0) {
                nc = 0;
            } else if (nc > tlLength) {
                nc = tlLength;
            }
        } else {
            nr = 0;
            nc = 0;
        }

        if (usePref && (op >= 0 && op <= tlLength)) {
            nc = op;
        } else if (setPref) {
            op = nc;
        }

        if (nc >= tlLength) nc = tlLength;
        if (nc < 0) nc = 0;

        this.caret = { row: nr, col: nc, pcol: op };
    }

    getSelectionStart() {
        let range = this.getSelectionRange();
        return range?range.start:null;
    }

    getSelectionEnd() {
        let range = this.getSelectionRange();
        return range?range.end:null;
    }

    getSelectionLength() {
        let len = 0;
        let range = this.getSelectionRange();
        if (range != null) {
            let startOffset = this.getCaretOffset(range.start);
            let endOffset = this.getCaretOffset(range.end);
            len = endOffset - startOffset;
        }
        return {len, range};
    }

    clearSelection() {
        let did = this.hasSelection;
        this.anchor = null;
        this.hasSelection = false;
        return did;
    }

    setSelectionAnchor() {
        this.anchor = { row: this.caret.row, col: this.caret.col };
        this.hasSelection = true;
    }

    selectAll() {
        let v = this.lines[this.lines.length-1];
        
        this.anchor = {row: 0, col: 0};
        if (v) {
            this.setCaret(this.lines.length-1, v.length);
        }
        this.hasSelection = true;
    }

    getSelectionRange() {
        if (!this.hasSelection || !this.anchor) {
            return null;
        }
        const caret = this.caret;
        const anchor = this.anchor;
        // Compare positions to normalize start <= end
        let start, end;
        if (caret.row < anchor.row || (caret.row === anchor.row && caret.col <= anchor.col)) {
            start = { row: caret.row, col: caret.col };
            end = { row: anchor.row, col: anchor.col };
        } else {
            start = { row: anchor.row, col: anchor.col };
            end = { row: caret.row, col: caret.col };
        }
    
        return { start, end };
    }

    // setAnchor(start, end) {
    //     this.anchor = start;        
    // }

    getLeadingWhitespaceLength(str) {
        const match = str.match(/^(\s*)/);
        return match ? match[0].length : 0;
    }

    // Get the leading whitespace string from a line
    getLeadingWhitespace(line) {
        let match = line.match(/^\s*/);
        return match ? match[0] : "";
    }

    // Calculate the visual width of whitespace (spaces = 1, tabs = 4)
    calculateWhitespaceWidth(whitespace) {
        let width = 0;
        for (let char of whitespace) {
            if (char === ' ') {
                width += 1;
            } else if (char === '\t') {
                width += 4; // Assume tab = 4 spaces
            }
        }
        return width;
    }

    insert(text, hangingIndent=false) {
        this.redoMemento.clear();

        if (hangingIndent && text === '\n') {
            let currentLine = this.getCurrentLine() || ""
            let lenWhiteSpace = this.getLeadingWhitespaceLength(currentLine);
            text = text + " ".repeat(lenWhiteSpace);
        }


        return this.#_insert(text, true);
    }


    /**
     * Inserts [text] at the current caret position
     * @param {String} text
     */
    #_insert(text, insertMemento=true) {
        // if (text.indexOf("\t") !== -1) {
        //     text = text.replaceAll("\t", "    ");
        // }
        let beforeAndAfter = {before:this.caret};
        if (this.hasSelection)
            this.deleteRange(0, true);
    
        text = utils.removeNonPrintableChars(text == null ? "" : String(text));
        text = utils.removeCRLF(text);
        if (text != "") {
            let tr = this.caret.row;
            let tc = this.caret.col;
            if (tr >= 0 && tr <= this.lines.length) {
                let line = tr < this.lines.length ? this.lines[tr] : "";
                if (tc >= 0 && tc <= line.length) {
                    let before = line.slice(0, tc);
                    let after = line.slice(tc);
                    let insertedText = before + text + after;
                    let newLines = insertedText.split("\n");
                    this.lines.splice(tr, 1, ...newLines);
                    // Calculate caret position
                    let textBeforeCaret = before + text;
                    let linesBeforeCaret = textBeforeCaret.split("\n");
                    tr = tr + linesBeforeCaret.length - 1;
                    tc = linesBeforeCaret[linesBeforeCaret.length - 1].length;
                    
                    if (insertMemento) {
                        this.undoMemento.addInsertMemento(this.getCaretOffset(), text.length);
                    }
                    this.setCaret(tr, tc, true);
                }
            }
        }
        beforeAndAfter.after = this.caret;
        return beforeAndAfter;
    }
    
    /**
     * Deletes [length] characters from the textbuffer at the current caret position
     * @param {Integer} length
     */
    deleteRange(length, insertMemento = true) {
        if (this.hasSelection && insertMemento) {
            let selection = this.getSelectionLength();
            this.caret = selection.range.start;
            length = selection.len;
            this.clearSelection;
        }

        if (length <= 0 || this.isEmpty()) return "";

        let caretOffset = this.getCaretOffset();
        let deletedText = this.getSubText(this.caret, length);

        let { row: startRow, col: startCol } = this.caret;
        let endOffset = caretOffset + length;
        let { row: endRow, col: endCol } = this.toCaret(endOffset);

        if (startRow === endRow) {
            // Single-line deletion
            this.lines[startRow] =
                this.lines[startRow].slice(0, startCol) +
                this.lines[startRow].slice(endCol);
        } else {
            // Multi-line deletion
            let firstPart = this.lines[startRow].slice(0, startCol);
            let lastPart = endRow < this.lines.length ? this.lines[endRow].slice(endCol) : "";
            this.lines.splice(startRow, endRow - startRow + 1, firstPart + lastPart);
        }

        // Store delete action before moving caret
        if (insertMemento && deletedText) {
            this.undoMemento.addDeleteMemento(caretOffset, deletedText);
        }

        // Move caret to start position after deletion
        this.setCaret(startRow, startCol);

        this.hasSelection = false;
        return deletedText;
    }
   
    getSubText(caret, length) {
        if (length <= 0 || this.isEmpty()) return "";
        
        let val = "";
        let ti = caret.row;
        let rem = length;
        let col = caret.col;

        for (let i = ti; i < this.lines.length && rem > 0; i++) {
            let it = this.lines[i];
            let lineText = i < this.lines.length - 1 ? it + "\n" : it; // Add newline for non-last lines
            let tl = lineText.length - col;

            if (tl > rem) tl = rem;

            if (i === ti) {
                val = lineText.substring(col, col + tl);
                rem -= val.length;
            } else {
                if (lineText.length <= rem) {
                    val += lineText;
                    rem -= lineText.length;
                } else {
                    val += lineText.substring(0, tl);
                    rem -= tl;
                }
            }
            col = 0; // Reset col for subsequent lines
        }

        return val;
    }

    doUndo() {  
        let actionMade = false;
        if (!this.undoMemento.isEmpty()) {
            let undo = this.undoMemento.pop();
            
            if (undo.action === "INSERT") {
                // Inserted text is removed now
                this.setCaretOffset(undo.caretOffset);
                let text = this.deleteRange(undo.length, false);
                if (text) {
                    this.redoMemento.addDeleteMemento(undo.caretOffset, text);
                    this.setCaretOffset(undo.caretOffset); // Restore caret *after* deletion
                    actionMade = true;
                }
            } else if (undo.action === "DELETE") {
                this.setCaretOffset(undo.caretOffset);
                this.#_insert(undo.text, false);
                this.redoMemento.addInsertMemento(undo.caretOffset, undo.text.length);
                this.setCaretOffset(undo.caretOffset + undo.text.length); // Caret at end of re-inserted text
                actionMade = true;
            }
        }    
        return actionMade;
    }

    doRedo() {
        let actionMade = false;
        if (!this.redoMemento.isEmpty()) {
            let redo = this.redoMemento.pop();
            
            if (redo.action === "INSERT") {
                this.setCaretOffset(redo.caretOffset);
                this.#_insert(redo.text, false);
                this.undoMemento.addInsertMemento(redo.caretOffset, redo.text.length);
                this.setCaretOffset(redo.caretOffset + redo.text.length); // Caret at end
                actionMade = true;
            } else if (redo.action === "DELETE") {
                this.setCaretOffset(redo.caretOffset);
                let text = this.deleteRange(redo.text.length, false);
                if (text) {
                    this.undoMemento.addDeleteMemento(redo.caretOffset, text);
                    this.setCaretOffset(redo.caretOffset); // Caret to deletion start
                    actionMade = true;
                }
            }
        }    
        return actionMade;
    }
    
    hasUndo() {
        return (!this.undoMemento.isEmpty());
    }

    hasRedo() {
        return (!this.redoMemento.isEmpty());
    }

    get lineCount() {
        return this.lines.length;
    }

    toString() {
        return this.lines.join("\n");
    }

    
}

module.exports = {
    Memento,
    TextBuffer
}