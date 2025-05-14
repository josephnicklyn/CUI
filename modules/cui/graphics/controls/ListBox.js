const Layout = require("../base/Layout");
const termutils = require("../base/termutils");

class ListBox extends Layout {
    #items = [];
    #selectedIndex = 0;

    constructor(options = {framed:true}) {
        super(options);
        this.setAttribute("scrollable", true);
        this.setAttribute("color", options.color || termutils.COLORS.editor.fill);
        this.setRect(0, 0, 10, 30, 0, 0);
        this.isFocusable = true;
    }

    handleEvent(event) {
        switch (event.type) {
            case "MouseEvent": return this.handleMouseEvent(event);
            case "KeyEvent": return this.handleKeyEvent(event);
        }
        return false;
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
        } else if (event.button === 'left' && event.action === 'mousedown') {
            let framed = this.getAttribute('framed', false)?1:0;

            const y = event.relY - this.sceneY + this.scrollTop - framed;
            if (y >= 0 && y < this.#items.length) {
                this.#selectedIndex = y;
                this.sendAction(this.#items[this.#selectedIndex], event.dbl);
                this.render(true);
            }
        }
    }

    handleKeyEvent(event) {
        if (event.name === "up") this.#selectedIndex = Math.max(0, this.#selectedIndex - 1);
        if (event.name === "down") this.#selectedIndex = Math.min(this.#items.length - 1, this.#selectedIndex + 1);
        if (event.name === "enter") this.sendAction(this.#items[this.#selectedIndex], "enter");
        this.ensureSelectedInView();
        this.render(true);
        return true;
    }

    clear() {
        this.#items = [];
        this.#selectedIndex = -1;
    }

    getItems() { return this.#items; }
    
    setSelectedIndex(i) { this.#selectedIndex = i; this.render(true); }

    ensureSelectedInView() {
        let framed = this.getAttribute('framed', false)?3:1;
        const visibleStart = this.scrollTop;
        const visibleEnd = this.scrollTop + this.height - framed;
        if (this.#selectedIndex < visibleStart) this.scrollTop = this.#selectedIndex;
        else if (this.#selectedIndex >= visibleEnd) this.scrollTop = this.#selectedIndex - (this.height - framed);
    }

    addItem(item) {
        if (typeof(item) === 'string') {
            item = {text: item}
        } 
        if (item && item.text) {
            this.#items.push(item);
        }
    }

    addItems(...items) {
        for(let item of items) {
            this.addItem(item);
        }
        // this.#items.push(...items);
        this.render(true);
    }

    render(now = false) {
        if ( !this.getStage()) {
            return;
        }
        termutils.QCODES.CURSOR_HIDE();
        const stage = this.getStage();
        const color = termutils.COLORS.list.item;
        const selColor = termutils.COLORS.list.item_selected;
        let framed = this.getAttribute('framed', false)?1:0;
        if (framed)
            stage.sceneDrawFrame(this.getAttribute("border", 1), this.rect, termutils.COLORS.BORDER, this.getAttribute("color"));
        else
            stage.sceneFillRect(this.rect, this.getAttribute("color"));// this.getAttribute("color"));
        //else 

        this.drawVScrollbar();

        let y = -this.scrollTop + framed;
        const x = framed;
        const viewWidth = this.width - (framed?3:1);

        for (let i = 0; i < this.#items.length; i++) {
            const item = this.#items[i];
            const isSelected = i === this.#selectedIndex;

            if (y >= 0 && y < this.height - framed) {
                stage.sceneDrawAlignedText(
                    ` ${item.text}`,
                    { sceneX: this.sceneLeft + x, sceneY: this.sceneTop + y, width: viewWidth },
                    "left",
                    isSelected ? selColor : color
                );
            }
            y++;
        }

        this.scrollHeight = Math.max(0, this.#items.length - (this.height - (framed?2:0)));
        if (now) stage.sceneRenderRect(this.rect);
    }
}

module.exports = ListBox;