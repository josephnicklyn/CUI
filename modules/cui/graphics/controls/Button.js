const termutils = require("../base/termutils");
const ButtonBase = require("./ButtonBase");

class Button extends ButtonBase {
    constructor(options, stage) {
        super(options, [], stage);
        this.setAttribute("text", options.text || "OK");
        this.setAttribute("align", "center");
        this.setAttribute("color", termutils.COLORS.BUTTON);
        this.setAttribute("hoverColor", termutils.COLORS.BUTTON_HOVER);

       
    }

    render(now = false) {
        let text = this.getAttribute("text", "");
        const color = this.isHovered?.() ? this.getAttribute("hoverColor") : this.getAttribute("color");
        this.getStage().sceneDrawAlignedText(text, this.rect, this.getAttribute("align", "center"), color);
        if (now) {
            this.getStage().sceneRenderRect(this.rect);
        }
    }

    onActivate() {
        // Send an action if applicable
        if (this.hasActionListener?.()) {
            this.sendAction();
        }
        return true; // true = no mouse capture needed
    }
}

module.exports = Button;