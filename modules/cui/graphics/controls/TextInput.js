const Layout = require("../base/Layout");
const termutils = require("../base/termutils");
const Clipboard = require("../base/Clipboard");

class TextInput extends Layout {
    #scrollLeft = 0;
    #cursorPos = 0;
    // New properties for selection
    #selectionAnchor = null; // Start of selection (null if no selection)
    #selectionFocus = null;  // End of selection (null if no selection)

    constructor(options = {}) {
        super(options);
        this.setAttribute("color", termutils.COLORS.control.fill);
        this.isFocusable = true;
        this.readonly = options.readonly || false;
    }

    get value() {
        return this.getAttribute("value", "");
    }

    set value(value) {
        this.setAttribute('value', value);
        this.#cursorPos = 0;
        this.#scrollLeft = 0;
        this.#selectionAnchor = null; // Reset selection
        this.#selectionFocus = null;
        this.render(true);
    }

    setValue(value) {
        this.setAttribute('value', value);
        this.#selectionAnchor = null; // Reset selection
        this.#selectionFocus = null;
    }

    move(y, x, width, sy, sx) {
        this.setRect(x, y, 1, width, sy + y, sx + x);
    }

    async handleEvent(event) {
        if (event.type === "KeyEvent") {
            if (this.readonly) {
                if ((this.readonly && ["ctrl-C", "ctrl-A"].includes(event.name)) || !this.readonly) {
                    this.handleKeyEvent?.(event);
                }
            } else {
                this.handleKeyEvent?.(event);
            }
        } else if (event.type === "MouseEvent") {
            this.handleMouseEvent?.(event);            
        }
    }

    selectWordAtCaret(col) {
    
        // Find beginning of word
        let bWord = termutils.skipBackward(this.value, col);
        // Find end of word
        let eWord = termutils.skipForward(this.value, col, false);

        // Safety checks
        if (bWord < 0) bWord = 0;
        if (eWord > this.value.length) eWord = this.value.length;
        let alreadySelected =
            this.hasSelection &&
            this.#selectionAnchor === bWord &&
            this.#selectionFocus === this.eWord;

        if (alreadySelected) {
            bWord = 0;
            eWord = this.value.length;    
        }

        this.eWord = eWord;
        
        this.setCursorPos(this.#scrollLeft + bWord, false); // Set cursor and clear selection
        this.#selectionAnchor = this.#cursorPos; // Start selection
        this.#selectionFocus = eWord;
        
        return true;
    }

    handleMouseEvent(event) {
        // if (this.readonly) return;
        if (event.button === 'left') {
            let r = event.relX - this.sceneLeft;
                
            if (event.dbl === true) {
                if (this.selectWordAtCaret(r)) {
                    this.render(true);
                }
            } else if (event.action === 'mousedown') {
                this.requestFocus();
                this.setCursorPos(this.#scrollLeft + r, false); // Set cursor and clear selection
                this.#selectionAnchor = this.#cursorPos; // Start selection
                this.#selectionFocus = this.#cursorPos;
                this.render(true);
            } else if (event.action === 'mousemove' && this.#selectionAnchor !== null) {
                // Update focus to mouse position, clamped to text bounds
                this.#selectionFocus = Math.max(0, Math.min(this.#scrollLeft + r, this.value.length));
                this.#cursorPos = this.#selectionFocus; // Cursor follows focus
                this.render(true);
            } else if (event.action === 'mouseup') {
                // Optional: Finalize selection (e.g., keep selection active)
                this.render(true); // Ensure final render
            }
        }
    }

    async handleKeyEvent(event) {
        // Helper to clear selection unless Shift is involved
        let clearSelection = !event.name.startsWith("shift-");
        switch (event.name) {
            case "ctrl-V":
                const text = await Clipboard.read();
                if (text) {
                    this.insert(text);
                }
                break;
            
            case "ctrl-C":
                if (this.hasSelection()) {
                    await Clipboard.write(this.getSelectedText());
                }
                clearSelection=false;
                break;
            case "ctrl-X":
                if (this.hasSelection()) {
                    await Clipboard.write(this.getSelectedText());
                    this.deleteSelection();
                }
                clearSelection=false;
                break;
            case "ctrl-A":
                this.#selectionAnchor = 0;
                this.#selectionFocus = this.value.length;
                this.#cursorPos = this.#selectionFocus; // Cursor follows focus
                clearSelection=false;
                break;
            case "right":
                this.#cursorPos = Math.min(this.#cursorPos + 1, this.value.length);
                break;
            case "left":
                this.#cursorPos = Math.max(this.#cursorPos - 1, 0);
                break;
            case "shift-right":
                if (this.#selectionAnchor === null) {
                    this.#selectionAnchor = this.#cursorPos; // Set anchor at current position
                    this.#selectionFocus = this.#cursorPos;
                }
                this.#selectionFocus = Math.min(this.#selectionFocus + 1, this.value.length);
                this.#cursorPos = this.#selectionFocus; // Cursor follows focus
                break;
            case "shift-left":
                if (this.#selectionAnchor === null) {
                    this.#selectionAnchor = this.#cursorPos; // Set anchor at current position
                    this.#selectionFocus = this.#cursorPos;
                }
                this.#selectionFocus = Math.max(this.#selectionFocus - 1, 0);
                this.#cursorPos = this.#selectionFocus; // Cursor follows focus
                break;
            case "ctrl-right":
                this.#cursorPos = termutils.skipForward(this.value, this.#cursorPos);
                break;
            case "ctrl-left":
                this.#cursorPos = termutils.skipBackward(this.value, this.#cursorPos);
                break;
            case "end":
                this.#cursorPos = this.value.length;
                break;
            case "home":
                this.#cursorPos = 0;
                break;
            case "delete":
                if (this.hasSelection()) {
                    this.deleteSelection();
                } else if (this.#cursorPos >= 0) {
                    this.setValue(
                        this.value.substring(0, this.#cursorPos) +
                        this.value.substring(this.#cursorPos + 1)
                    );
                }
                break;
            case "backspace":
                if (this.hasSelection()) {
                    this.deleteSelection();
                } else if (this.#cursorPos > 0) {
                    this.setValue(
                        this.value.slice(0, this.#cursorPos - 1) +
                        this.value.slice(this.#cursorPos)
                    );
                    this.#cursorPos--;
                }
                break;
            case "enter":
                if (this.hasActionListener?.()) {
                    this.sendAction();
                }
                break;
            default:
                const code = event.raw.charCodeAt(0);
                if (code >= 0x20 && code < 0x7F) {
                    if (this.hasSelection()) {
                        this.deleteSelection();
                    }
                    this.insert(event.raw);
                }
                break;
        }

        if (clearSelection) {
            this.clearSelection();
        }
        
        this.render(true);
    }

    clearSelection() {
        this.#selectionAnchor = null;
        this.#selectionFocus = null;
    }

    // Helper to check if there is an active selection
    hasSelection() {
        return this.#selectionAnchor !== null && this.#selectionFocus !== null && this.#selectionAnchor !== this.#selectionFocus;
    }

    // Helper to delete selected text
    deleteSelection() {
        if (!this.hasSelection() || this.readonly) return;
        const start = Math.min(this.#selectionAnchor, this.#selectionFocus);
        const end = Math.max(this.#selectionAnchor, this.#selectionFocus);
        this.setValue(this.value.slice(0, start) + this.value.slice(end));
        this.#cursorPos = start;
        this.#selectionAnchor = null;
        this.#selectionFocus = null;
    }

    insert(str) {
        if (this.readonly) return;
        if (typeof str === 'string' && str.length > 0) {
            if (this.hasSelection()) {
                this.deleteSelection();
            }
            this.setValue(this.value.slice(0, this.#cursorPos) + str + this.value.slice(this.#cursorPos));
            this.#cursorPos += str.length;
        }
    }

    setCursorPos(pos, preserveSelection = false) {
        this.#cursorPos = Math.max(0, Math.min(pos, this.value.length));
        if (!preserveSelection) {
            this.#selectionAnchor = null;
            this.#selectionFocus = null;
        }
    }

    render(now) {
        let viewWidth = this.rect.width;
        if (this.#cursorPos < 0) 
            this.#cursorPos = 0;
        else if (this.#cursorPos > this.value.length) 
            this.#cursorPos = this.value.length;

        // Adjust scroll to keep cursor in view
        if (this.#cursorPos < this.#scrollLeft) {
            this.#scrollLeft = this.#cursorPos;
        } else if (this.#cursorPos > this.#scrollLeft + viewWidth - 1) {
            this.#scrollLeft = this.#cursorPos - (viewWidth - 1);
        }
        this.#scrollLeft = Math.max(0, Math.min(this.#scrollLeft, this.value.length - viewWidth + 1));

        let visibleText = this.value.slice(this.#scrollLeft, this.#scrollLeft + viewWidth);
        if (this.getAttribute("password", false)) {
            visibleText = "●".repeat(visibleText.length);
        }

        // Render background
        this.getStage().sceneFillRect(this.rect, this.getAttribute("color"));

        // Render text
        this.getStage().sceneDrawText(visibleText, this.rect, this.getAttribute("color"), false);
        // Render selection highlight if present
        if (this.hasSelection()) {
            const selStart = Math.min(this.#selectionAnchor, this.#selectionFocus) - this.#scrollLeft;
            const selEnd = Math.max(this.#selectionAnchor, this.#selectionFocus) - this.#scrollLeft;
            if (selStart < viewWidth && selEnd >= 0) {
                const highlightStart = Math.max(0, selStart);
                const highlightEnd = Math.min(viewWidth, selEnd);
                const highlightRect = {
                    ...this.rect,
                    width: highlightEnd - highlightStart,
                    sceneX: this.sceneLeft + highlightStart,
                };
                // Use a different color for selection highlight (e.g., blue background)
                this.getStage().sceneHighlightRect(highlightRect, termutils.COLORS.control.highlight);
            }
        }


        if (now) {
            this.getStage().sceneRenderRect(this.rect);
            this.updateCursorPosition();
        }
    }

    updateCursorPosition() {
        if (this.readonly) return;
        const cursorIndex = this.#cursorPos - this.#scrollLeft;
        let fixed = this.getStage().sceneGetRelativePos(this.rect, 1, cursorIndex + 1, false);
        termutils.QCODES.MOVE_CURSOR(fixed.y, fixed.x, 1);
    }

    getSelectedText() {
        if (!this.hasSelection()) return "";
        const start = Math.min(this.#selectionAnchor, this.#selectionFocus);
        const end = Math.max(this.#selectionAnchor, this.#selectionFocus);
        return this.value.slice(start, end);
    }

    focus() {
        this.updateCursorPosition();
    }

    onBlur() {
        this.focusOut();
    }

    focusOut() {
        this.#cursorPos = 0;
        this.#selectionAnchor = null;
        this.#selectionFocus = null;
        this.render(true);
    }
}

module.exports = TextInput;