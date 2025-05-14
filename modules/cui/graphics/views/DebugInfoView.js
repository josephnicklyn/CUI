const Layout = require("../base/Layout"); // Assuming Layout is your base
const termutils = require("../base/termutils");
class DebugInfoView extends Layout {
    #lines = ["HELLO"];

    constructor(options = {}) {
        super(options);
        this.setAttribute("fixed", 9); // maybe 2-3 lines tall
        this.setAttribute("color", termutils.COLORS.editor.fill);
    }

    setLines(lines) {
        this.#lines = lines || [];
        this.draw();
    }

    draw() {
        const { sceneX, sceneY, width } = this.rect;
        for (let i = 0; i < this.#lines.length; i++) {
            let text = ` ${this.#lines[i]} ` || '';
            this.getStage().sceneDrawText(
                text.padEnd(width, ' ').slice(0, width),
                { x: 0, y: 0, width:width-3, height: 1, sceneX:sceneX+1, sceneY: sceneY + i+2 },
                this.getAttribute('color')
            );
        }
        this.getStage().sceneRenderRect(this.rect);
    }

    render() {
        super.render(true);
        if (!this.isShowing()) return;
        this.getStage().sceneDrawFrame(0, this.rect, termutils.COLORS.BORDER, false);
        this.getStage().sceneRenderRect(this.rect);

    }
}

module.exports = DebugInfoView;
