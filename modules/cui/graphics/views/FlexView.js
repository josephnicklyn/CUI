const Layout = require("../base/Layout")
const termutils = require("../base/termutils");

class FlexView extends Layout {
    constructor(options) {
        super(options);
        if (!options.color)
            this.setAttribute('color', termutils.COLORS.BACKGROUND2);
    }
    
    get flow() {
        let value = this.getAttribute("flow");
        return value === 'column' ? 'column' : 'row';
    }

    get gap() {
        let value = this.getAttribute("gap", 0);
        if (isNaN(value)) {
            value = 0;
        }
        return value;
    }

    layout(rect) { 
        let padding = this.getAttribute("padding", 0);
        this.rect = rect;
        let {width, height, sceneX, sceneY} = this.rect;
        width-=(padding*2);
        height-=(padding*2);
        const isColumn = this.flow === "column";
        let availableSize = isColumn ? height : width;
        let fixedSize = 0;
        let totalFlex = 0;
    
        const children = this.getChildren();
    
        // Adjust for total gaps
        availableSize -= (children.length - 1) * this.gap;
    
        // First pass: calculate space taken by fixed nodes and total flex units
        for (let child of children) {
            if (!child.isShowing())  continue;
            
            let options = child.getAttributes();
            if (options) {
                if (typeof options.flex === "number") {
                    totalFlex += options.flex;
                } else if (typeof options.fixed === "number") {
                    fixedSize += options.fixed;
                } else {
                    fixedSize += child.getMinSize(1)
                }
            } else {
                totalFlex += 1;
            }
        }
    
        const remainingSize = Math.max(0, availableSize - fixedSize);
        let pos = 0;//padding;
    
        // Second pass: assign sizes and positions
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (!child.isShowing())  continue;
            
            let options = child.getAttributes();
            let nodeSize;
            if (options) {
                if (typeof options.flex === "number") {
                    nodeSize = Math.round((options.flex / totalFlex) * remainingSize);
                } else if (typeof options.fixed === "number") {
                    nodeSize = child.getMinSize(options.fixed);
                } else {
                    nodeSize = child.getMinSize(1);
                }
            } else {
                nodeSize = Math.round((1 / totalFlex) * remainingSize);
            }
            // Ensure the last child takes remaining space to avoid gaps
            if (i === children.length - 1) {
                nodeSize = isColumn ? height - pos : width - pos;
            }
            let pRect = isColumn?
                { y:pos, x:padding, height:Math.max(1, nodeSize), width, sceneX:sceneX+padding, sceneY: sceneY+pos+padding}:
                {y:padding, x:pos, height, width:Math.max(1, nodeSize), sceneX:sceneX+pos+padding, sceneY: sceneY+padding};

            child.rect = pRect;
            if (child instanceof Layout) {
                child.layout(pRect);
                if (child.getParent().isShowing())
                    child.render(true);
            }

            pos += nodeSize + this.gap;
        }
        this.markDirty();
    }
}

module.exports = FlexView;