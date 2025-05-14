const Node = require("../base/Node");
const termutils = require("../base/termutils");

class CheckBox extends Node {
    
    constructor(options = {}) {
        super(options);
        this.setAttribute("color", termutils.COLORS.control.fill);
    }

    get value() {
        return Boolean(this.getAttribute("value", false));
    }

    set value(value) {
        this.setValue(value);
        this.render(true);
    }
    
    setValue(value) {
        this.setAttribute('value', Boolean(value));
    }

    processKeyEvent(event) {
        switch (event.raw) {
            case " ":
                this.value = this.value = !this.value;
                break;
        }
        this.render(true);
    }

    render(now) {
        // ✔
        let visibleText = "[" + (this.value?"✔":" ") + "]";
        this.getStage().sceneDrawText(visibleText, this.rect, this.getAttribute("color"), false);

        if (now) {
            this.getStage().sceneRenderRect(this.rect);
            this.updateCursorPosition();
        }

    }

    setCursorPos() {
        this.value = this.value = !this.value; 
    }

    updateCursorPosition() {
        let fixed = this.getStage().sceneGetRelativePos(this.rect, 1, 2, false);
        termutils.QCODES.MOVE_CURSOR(fixed.y, fixed.x, 3);
    }

    focus() {
        this.updateCursorPosition();
    }

    focusOut() {
        
    }
}



module.exports = CheckBox;