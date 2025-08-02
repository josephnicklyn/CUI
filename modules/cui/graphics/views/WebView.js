const FlexView = require("../views/FlexView");
const ComboBox = require("../controls/ComboBox");
const DatePicker = require("../controls/DatePicker");

class WebView extends FlexView {
    #comboBox = null;
    constructor(options) {
        super({...options, flow:"column", gap: 1, padding: 1, color: {bg:"212;212;206"}});
        
        this.content = this.addChild(new DatePicker({flex: 1}));
        this.comboBox = this.addChild(new ComboBox({readonly: true}));
        this.comboBox.setOnActionListener((value) => {
            // console.log("\x1b[3;1H", `You selected: ${value}`);
        })
    }

    async promptForValue() {
        const selected = await this.comboBox.getValue();
        this.content.setAttribute("text", `Selected: ${selected}`);
        this.content.render(true);
    }

    layout(rect) {
        super.layout(rect);
        
    }
    render(now = true) {
        if (!this.isShowing()) {
            return;
        }
        super.render(now);
        this.comboBox.render(now);
        this.content.render(now);
        this.getStage().sceneRenderRect(this.rect);
      
    }
}

module.exports = WebView