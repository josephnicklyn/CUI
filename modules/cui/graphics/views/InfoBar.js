const FlexLayout = require("./FlexView")
const termutils = require("../base/termutils");
const TextItem = require("../views/TextItem");
class InfoBar extends FlexLayout {
    constructor(options) {
        super(options);
        this.setAttribute('color', termutils.COLORS.infobar.fill);
    }

    setPanelText(i, text, doRender=false) {
        let node = this.getChild(i);
        if (node) {
            node.setText(text);
            this.flashRegion(node, doRender);
        }
    }

    flashRegion(child, doRender=false) {
        if (child) {
            if (child instanceof TextItem) {
                let text = child.getText();
                this.getStage().sceneDrawAlignedText(
                    ` ${text} `, 
                    child.rect, 
                    child.getAttribute('align', 'center'), 
                    child.getAttribute('color', null), 
                    1
                );
            } else {
                child.render(true);
            }
            if (doRender) {
                this.getStage().sceneRenderRect(child.rect);
            }
        }
    }

    addChild(node) {
        if (node) {
            node.setAttribute('color', termutils.COLORS.infobar.darker);
        }
        return super.addChild(node);
    }

    render(now) {
        this.getStage().sceneFillRect(this.rect, this.getAttribute('color'));
        for(let child of this.getChildren()) {
            this.flashRegion(child);
        }
        if (now)
            this.getStage().sceneRenderRect(this.rect);
        
    }
}

module.exports = InfoBar;