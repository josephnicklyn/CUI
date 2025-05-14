const Layout = require("../base/Layout");

class ButtonBase extends Layout {
    constructor(...args) {
        super(...args);
        this.setAttribute("hoverable", true);
        this.setAttribute("activatable", true);
        this._hovered = false;
    }

    hoverIn() {
        if (!this._hovered) {
            this._hovered = true;
            this.render?.(true);
        }
    }

    hoverOut() {
        if (this._hovered) {
            this._hovered = false;
            this.render?.(true);
        }
    }

    isHovered() {
        return this._hovered;
    }

    // onActivate() {
    //     return false;
    //     // return super.onActivate?.() ?? false;
    // }

    render(now = false) {
        let text = this.getAttribute("text", "");
        const color = this.isHovered?.() ? this.getAttribute("hoverColor") : this.getAttribute("color");
        this.getStage().sceneDrawAlignedText(text, this.rect, this.getAttribute("align", "center"), color);
        if (now) {
            this.getStage().sceneRenderRect(this.rect);
        }
    }
}

module.exports = ButtonBase