const Layout = require("../base/Layout")
const Node = require("../base/Node")

const termutils = require("../base/termutils");

class SplitView extends Layout {
    #isDragging = false;
    #paneA = null;
    #paneB = null;
    #options = {};
    #isAnchored = 0;
    #splitBar = null;

    constructor(options) {
        super(options, ['size', 'orientation', 'min', 'max', 'snap']);
        this.#options = {
            orientation: options.orientation || "vertical",
            size: options.size || 0.2,
            min:  options.min  || 0,
            max:  options.max  || 0,
            snap: options.snap || 0
        };

        if (this.#options.max != 0 && this.#options.max < this.#options.min) {
            let t = this.#options.max;
            this.#options.max = this.#options.min;
            this.#options.min = t;
        }

        if (this.#options.snap > this.#options.min && this.#options.min != 0) {
            let t = this.#options.snap;
            this.#options.snap = this.#options.min;
            this.#options.min = t;
        }
        this.#options.otherSide = this.#options.size <= 0;
        this.#splitBar = this.addChild(new Node(null, {hoverable: true, color: termutils.COLORS.SPLITBAR}));
        this.#splitBar.setAttribute('text', options.title || "");
        this.#splitBar.setAttribute('color', termutils.COLORS.SPLITBAR);
        this.#splitBar.setAttribute('align', "center");
        
        // this.markDirty();
    }


    addChild(node) {
        if (this.getChildren().length < 3) {
            node = super.addChild(node);
            if (node !== this.#splitBar && this.getChildren().length > 1) {
                // splitBar will be the 1st, don't set splitBar to paneA/paneB 
                if (this.#paneA === null) {
                    this.#paneA = node;
                    // node.setAttribute("color", termutils.COLORS.BACKGROUND);
                } else if (this.#paneB === null) {
                    this.#paneB = node;
                    // node.setAttribute("color", termutils.COLORS.BACKGROUND);
                }
            }
        }
        return node;
    }

    optionSize() {
        let size = this.#options.size;
        const ref = this.#options.orientation === "vertical" ? this.rect.width : this.rect.height;
        
        if (Math.abs(size) > 0 && Math.abs(size) < 1) {
            const { width, height } = this.rect;
            const ref = this.#options.orientation === "vertical" ? width : height;
            size = Math.max(1, Math.round(size * ref));
        }

        if (!this.#isDragging) {
            if (this.#isAnchored == -1) {
                return ref;
            } else if (this.#isAnchored == 1) {
                return 0;
            }
        }

        const aSize = Math.abs(size);
        
        if (size < 0) {
            size = (this.#options.otherSide? (ref - aSize-1) : aSize);// + size;
        }

        const refSize = this.#options.otherSide? (ref - size) : size;
        
        const reservedSize = ref-refSize;

        if (this.#options.otherSide) {
            if (this.#options.max !== 0 && reservedSize > this.#options.max) {
                size = ref - this.#options.max;
            }
            if (this.#options.min !== 0 && reservedSize < this.#options.min) {
                size = ref - this.#options.min;
            }
        } else {
            if (this.#options.max !== 0 && reservedSize > this.#options.max) {
                size = this.#options.max;
            }
            if (this.#options.min !== 0 && reservedSize < this.#options.min) {
                size = this.#options.min;
            }
        }
        
        if (this.#options.snap != 0 && (reservedSize <= this.#options.snap || reservedSize <= this.#options.min))  {
            size = this.#options.otherSide? (ref - 1) : 0;    
        }

        this.#options.size = size;
        
        if (this.#isDragging) {
            if (size == 0) 
                this.#isAnchored = 1;
            else if (size >= ref-1) 
                this.#isAnchored = -1;
            else 
                this.#isAnchored = 0;
        }

        return size;
    }

    updateRegions() {
        let { width, height, sceneX, sceneY } = this.rect;
        if (!this.#paneA && !this.#paneB) {
            this.#splitBar.setDisplay(false);
            return;
        } else if (this.#paneA && !this.#paneB) {
            // only 1 pane is included, fill the SplitView container
            this.#splitBar.setDisplay(false);
            this.#paneA.setRect(0, 0, height, width);
            return;
        }

        this.#splitBar.setDisplay(true);
        

        let splitPos = this.optionSize();
        // Handle negative size
        if (splitPos < 0) {
            splitPos = this.#options.orientation === "vertical" ? width + splitPos : height + splitPos;
        }
        // Clamp splitPos to ensure non-zero panes
        splitPos = Math.max(0, Math.min(splitPos, (this.#options.orientation === "vertical" ? width : height) - 1));
        if (this.#options.orientation === "vertical") {
            this.#splitBar.setRect(0, splitPos, height+1, 1, sceneY, sceneX+splitPos);
            this.#paneA.setRect(0, 0, height, splitPos, sceneY, sceneX);
            this.#paneB.setRect(0, splitPos + 1, height, Math.max(0, width - splitPos - 1), sceneY, sceneX+splitPos+1);
        } else {
            this.#splitBar.setRect(splitPos, 0, 1, width, sceneY+splitPos, sceneX);
            this.#paneA.setRect(0, 0, splitPos, width, sceneY, sceneX);
            this.#paneB.setRect(splitPos + 1, 0, Math.max(0, height - splitPos - 1), width, sceneY+splitPos+1, sceneX);
        }
    }

    setPosition(value) {
        if (!isNaN(value)) {
            this.#options.size = value;
            this.layout(this.rect);
        }
    }

    layout(rect) { 
        this.rect = rect;
        this.updateRegions();
        if (this.#paneA instanceof Layout) {
            this.#paneA.layout(this.#paneA.rect);
        }
        if (this.paneB instanceof Layout) {
            this.paneB.layout(this.#paneB.rect);
        }
        this.markDirty();
    }

    render(put = false) {
        this.getStage().sceneFillRect(this.#splitBar.rect, this.getAttribute("color"));
        for (let child of this.getChildren()) {
            if (child !== this.#splitBar) {
                child.layout(child.rect);
                child.render(put || this.dirty);
            } else {
                child.render(put || this.dirty);
            }
        }
        this.dirty = false;
    }

    handleEvent(event) {
        let handledEvent = false;
        if (event.type === "MouseEvent" && event.button === 'left') {
            let {relX, relY, action } = event;
            switch (action) {
                case "mousedown":
                    if (this.#options.orientation === "vertical") {
            
                        if (relX >= this.#splitBar.rect.x && 
                            relX < this.#splitBar.rect.x + this.#splitBar.rect.width &&
                            relY >= this.#splitBar.rect.y &&
                            relY < this.#splitBar.rect.y + this.#splitBar.rect.height) {
                            this.#isDragging = true;
                            handledEvent = true;
                        }
                    } else {
                        if (relY >= this.#splitBar.rect.y &&
                            relY < this.#splitBar.rect.y + this.#splitBar.rect.height &&
                            relX >= this.splitBar.rect.x &&
                            relX < this.#splitBar.rect.x + this.#splitBar.rect.width) {
                            this.#isDragging = true;
                            handledEvent = true;
                        }
                    }
                    break;

                case "mousemove":
                    if (this.#isDragging) {
                        let clampedX = Math.max(this.rect.x, Math.min(relX, this.rect.x + this.rect.width - 1));
                        let clampedY = Math.max(this.rect.y, Math.min(relY, this.rect.y + this.rect.height - 1));

                        if (this.#options.orientation === "vertical") {
                            this.#options.size = clampedX - this.rect.x;
                        } else {
                            this.#options.size = clampedY - this.rect.y;
                        }
                        if (this.#options.size !== this.prevSize) {
                            // reduces the number of updates
                            this.updateRegions();
                            this.layout();
                            this.render(true);
                        }
                        handledEvent = true;
                        this.prevSize = this.#options.size;
                    }
                    break;

                case "mouseup":
                    this.#isDragging = false;
                    this.render(true);
                    break;
            }
        }
        return handledEvent;
    }
}

module.exports = SplitView;