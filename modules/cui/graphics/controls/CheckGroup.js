const Layout = require("../base/Layout");
const Node = require("../base/Node");
const termutils = require("../base/termutils");

class CheckGroup extends Layout {
    #selectedIndex = 0;

    constructor(options = {}) {
        super(options);
        this.setAttribute("color", termutils.COLORS.control.inherit);
        this.setAttribute("selected", termutils.COLORS.control.focus);
        this.setAttribute("selection", options.selection || ""); // "radio" or ""
        
        this.isFocusable = true;
        const items = options.items || [];
        for (let i = 0; i < items.length; i++) {
            const item = new Node({ text: items[i].label });
            item.setAttribute("checked", !!items[i].checked);
            this.addChild(item);

            if (items[i].checked && this.#selectedIndex === 0) {
                this.#selectedIndex = i;
            }
        }
    }

    handleEvent(event) {
        if (event.type === "KeyEvent") {
            this.handleKeyEvent?.(event);
        } else if (event.type === "MouseEvent") {
            this.handleMouseEvent?.(event);
        }
    }

    handleMouseEvent(event) {
        if (event.button === 'left' && event.action === 'mousedown') {
            this.requestFocus();
            let eventTarget = this.clickTest(event.relY, event.relX);
            if (eventTarget) {
                let {child, index} = eventTarget;
                this.setSelectedItem(index);
            }
        }
    }

    handleKeyEvent(event) {
        switch (event.name) {
            case "down":
                this.nextOption();
                break;
            case "up":
                this.prevOption();
                break;
            case "space":
                this.toggleSelectedItem();
                break;
        }

    }

    get value() { return this.getValue(); }

    getValue() {
        let results = [];
        for (const child of this.getChildren()) {
            if (child.getAttribute("checked")) {
                results.push(child.getText());
            }
        }
        if (this.getAttribute('selection') === 'radio') {
            results = results[0] || null;
        }
        return results;
    }

    setValue(vals) {
        if (!Array.isArray(vals)) return;
        for (const child of this.getChildren()) {
            const label = child.getText();
            child.setAttribute("checked", vals.includes(label));
        }
        this.render(true);
    }

    setSelectedItem(index) {
        const selectionType = this.getAttribute("selection", "");
        const children = this.getChildren();
        if (index >= 0 && index < children.length) {
            if (selectionType === "radio") {
                children.forEach((c, i) => c.setAttribute("checked", i === index));
            } else {
                const current = children[index];
                const currentVal = current.getAttribute("checked");
                current.setAttribute("checked", !currentVal);
            }
            this.#selectedIndex = index;
            this.render(true);
        }
    }

    toggleSelectedItem() {
        this.setSelectedItem(this.#selectedIndex);
    }

    nextOption() {
        let index = this.#selectedIndex + 1;
        if (index >= this.getChildren().length) index = 0;
        this.#selectedIndex = index;
        this.render(true);
    }

    prevOption() {
        let index = this.#selectedIndex - 1;
        if (index < 0) index = this.getChildren().length - 1;
        this.#selectedIndex = index;
        this.render(true);
    }

    layout(rect) {
        const children = this.getChildren();
        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            node.setRect(0, 0, 1, this.rect.width, this.sceneTop + i, this.sceneLeft)
        }
    }

    render(now = false) {
        const isRadio = this.getAttribute("selection", "") === "radio";
        const children = this.getChildren();
        const hasFocus = this.hasFocus();

        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            const checked = node.getAttribute("checked");
            const label = node.getText();
            const mark = checked ? (isRadio ? "◉" : "▣") : (isRadio ? "◯" : "□");
            this.getStage().sceneDrawText(
                ` ${mark} ${label}`,
                node.rect, 
                i === this.#selectedIndex && hasFocus
                    ? this.getAttribute("selected")
                    : this.getAttribute("color"),
                false
            );
        }

        if (now) {
            this.getStage().sceneRenderRect(this.rect);
            this.updateCursorPosition();
        }
    }

    setCursorPos(x, y) {
        this.setSelectedItem(y);
    }

    updateCursorPosition() {
        termutils.QCODES.CURSOR_HIDE();
    }

    onBlur() {
        this.render(true);
    }
   
}

module.exports = CheckGroup;
