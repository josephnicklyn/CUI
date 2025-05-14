const Layout = require("../base/Layout");

class FlowLayout extends Layout {
    constructor(options) {
        super(options);

    }

    layout(rect) {
        this.layoutChildren();
    }

    measureChildren() {
        // let w = this.width - (this.getAttribute("padding", 0) * 2)
        let tw = this.getAttribute("gap", 0) * (this.getChildren().length-1);
        for (let child of this.getChildren()) {
            tw += child.width;
        }
        return tw;
    }

    

    layoutChildren() {
        let totalRequiredForChildren = this.measureChildren();
        let innerWidth = this.width - (this.getAttribute("padding", 0) * 2);
        let gap = this.getAttribute("gap", 0);
        let padding = this.getAttribute("padding", 0);
        let align = this.getAttribute('align');
            align = ['left', 'right', 'center'].includes(align)?align:'left';
        let cPadding = innerWidth - totalRequiredForChildren;
        let x = padding;
        
        if (cPadding > 0) {
            switch (align) {
                case "left":    x = 1 + padding; break;
                case "right":   x = x + (innerWidth+1+padding) - totalRequiredForChildren; break;
                case "center": {
                    let rem = innerWidth - (padding*2+totalRequiredForChildren);
                    let leftSide = rem/2;
                    let rightSide = leftSide;
                    if (leftSide+rightSide > innerWidth) {
                        rightSide = innerWidth - leftSide;
                    }
                }       
            }
        }

        for(let child of this.getChildren()) {
            child.setRect( 
                1+this.padding, x, 
                1,
                child.width,
                this.rect.sceneY+padding, 
                this.rect.sceneX+x
            )
            x+=child.width+gap;
        }
    }

    render(now) {
        if (!this.getStage()) return;
        this.layoutChildren();
        
        super.render(true);
        for(let child of this.getChildren()) {
           child.render();
        }

        if (now) {
            this.getStage().sceneRenderRect(this.rect);
        }
    }

}

module.exports = FlowLayout;