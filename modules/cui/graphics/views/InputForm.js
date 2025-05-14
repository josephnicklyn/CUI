const Layout = require("../base/Layout");
const termutils = require("../base/termutils");
const Node = require("../base/Node");

const TextInput = require("../controls/TextInput");
const CheckBox = require("../controls/CheckBox");
const CheckGroup = require("../controls/CheckGroup");

const CONTROL_TYPES = {
    checkbox: CheckBox,
    group: CheckGroup,
    text: TextInput
};

class InputForm extends Layout {
    #fieldDefs = [];
    #focused = null;
    #inButtonMode = false;
    
    constructor(options = {}) {
        super(options);
        this.setAttribute("color", termutils.COLORS.dialog.fill);
        this.#fieldDefs = options.fields || [];
        this.setAttribute("labelPosition", options.labelPosition || "left");
    }

    generateFieldDefs() {
        if (!this.getStage()) return;

        const stage = this.getStage();
        this.removeAllChildren(); // Clean previous content if reused


        let extraHeight = 0;
        for (let def of this.#fieldDefs) {
            const labelNode = new Node({ text: def.label }, [], stage);
            let type = (def.type || "text").toLowerCase();
            if (!CONTROL_TYPES[type]) type = "text";

            const options = {
                name: def.name,
                label: def.label,
                titleNode: labelNode,
                password: def.password,
                items: def.items,
                selection: def.selection,
                wrap: def.wrap,
                color: termutils.COLORS.control.fill,
                height: (def.items instanceof Array ? def.items.length : 1)
            };
            extraHeight += (options.height - 1);

            const control = new CONTROL_TYPES[type](options, stage);
            control.setValue(def.value || '');
            this.addChild(control);
        }

        this.#focused = this.getChild(0);
        const rowSpacing = (this.getAttribute("labelPosition") === "left" ? 2 : 3);
        const height = this.getChildren().length * rowSpacing + extraHeight + 2;
        const width = Math.min(stage.width / 2, 40);
        const x = Math.floor((stage.width - width) / 2);
        const y = Math.max(1, Math.floor(stage.height / 2 - height));
        this.setRect(0, 0, height, width, y, x);
    }

    layout() {
        const labelPos = this.getAttribute("labelPosition");
        const labelWidth = 10;
        let y = (labelPos === "left" ? 1 : 2);
        const x = 2;
        const width = this.width - 4;

        for (let child of this.getChildren()) {
            const label = child.getAttribute("titleNode");
            const height = child.getAttribute("height", 1);

            if (labelPos === "left") {
                label.setRect(0, x, 1, labelWidth, this.sceneTop + y, this.sceneLeft + x);
                child.setRect(0, x + labelWidth + 1, height, width - labelWidth - 1, this.sceneTop + y, this.sceneLeft + x + labelWidth + 1);
                y += (1 + height);
            } else {
                label.setRect(0, x, 1, width, this.sceneTop + y - 1, this.sceneLeft + x);
                child.setRect(0, x, height, width, this.sceneTop + y, this.sceneLeft + x);
                y += (2 + height);
            }
            child.layout(child.rect);   
            label.setAttribute("color", termutils.COLORS.control.label);
        }
        
        
    }

    focusFirstField() {
        const first = this.getChild(0);
        if (first) {
            this.#focused = first;
            first.requestFocus?.();
            first.updateCursorPosition?.();
            first.render(true);
            termutils.QCODES.CURSOR_SHOW();
        }
    }

    render(now = false) {
        super.render(true);
        

        for (let child of this.getChildren()) {
            const label = child.getAttribute("titleNode");
            if (label) label.render();
            child.render(false);
        }

        if (now) this.getStage().sceneRenderRect(this.rect);
        
        if (this.#focused && !this.#inButtonMode) {
            this.#focused.updateCursorPosition();
        } else {
            termutils.QCODES.CURSOR_HIDE();
        }

    }


    toJson() {
        let obj = {};
        for (let child of this.getChildren()) {
            const name = child.getAttribute('name');
            if (typeof name === 'string') {
                obj[name] = child.value;
            }
        }
        return obj;
    }

    handleEvent(event) {
        switch (event.type) {
            case 'MouseEvent':
                return this.handleMouseEvent(event);
            case 'KeyEvent':
                return this.handleKeyEvent(event);
        }
    }

    submit() {
        termutils.QCODES.CURSOR_HIDE();
        if (this.#focused) {
            this.#focused.setDisplay(false);
        }
        this.setDisplay(false);
        this.onSubmit?.(this.toJson());
    }
    
    cancel() {
        termutils.QCODES.CURSOR_HIDE();
        if (this.#focused) {
            this.#focused.setDisplay(false);
        }
        this.setDisplay(false);
        this.onCancel?.();
    }

    #wasOver = false;
    handleMouseEvent(event) {
        this.getStage().relativePoint(event);
        
        let msg = this.getParent().hoverButton(event);
        console.log("\x1b[1;1H", {msg});

        if (msg===true) {
            this.#focused.render?.(true);
            this.#wasOver = true;
            return;
        } else if (msg === 'cancel') {
            this.cancel();
            return;
        } else if (msg === 'submit') {
            this.submit();
            return;
        }
        
        if (this.#wasOver) {
            this.#wasOver = false;
            this.getParent().hoverButton(false);
            this.#focused.render?.(true);
        }

        let eventTarget = this.clickTest(event.relY, event.relX);
        if (event.button === 'left' && event.action === 'mousedown') {
            if (eventTarget) {
                let child = eventTarget.child;
                if (child !== this.#focused) {
                    this.#focused?.focusOut?.();
                    this.#focused = child;
                    this.#inButtonMode = false;
                }
            }
            
        }
        if (this.#focused)
            this.#focused.handleEvent(event);
    }

    handleKeyEvent(event) {
        if (event.name === "tab") {
            this.nextChild(1);
        } else if (event.name === "shift-tab") {
            this.nextChild(-1);
        } else if (event.name === "enter") {
            this.submit();
        } else if (event.name === "escape") {
            this.cancel();
        } else if (this.#focused && !this.#inButtonMode) {
            this.#focused.handleEvent(event);

        }
    }

    nextChild(delta) {
        const index = this.getChildren().indexOf(this.#focused);
        const next = (index + delta + this.getChildren().length) % this.getChildren().length;
        this.#focused?.focusOut?.();
        this.#focused = this.getChild(next);
        if (this.#focused) {
            this.#focused.requestFocus();
            this.#focused.render(true);
        }
    }
}

module.exports = InputForm;
