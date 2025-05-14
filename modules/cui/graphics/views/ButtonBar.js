const Layout = require("../base/Layout");

class ButtonBar extends Layout {
    constructor(options) {
        super(options);
        this.scrollLeft = 0;
        this.scrollWidth = 0;
    }

    layout(rect) {
        this.layoutChildren();
    }

    getSelectedIndex() {
        for (let i = 0; i < this.getChildren().length; i++) {
            if (this.getChildren()[i].getAttribute('selected')) {
                return i;
            }
        }
        return 0;
    }

    clampInViewWithDelta(delta) {
        let currentIndex = this.getSelectedIndex();;
        
        if (currentIndex === -1) {
            currentIndex = 0;
        } else {
            currentIndex = currentIndex + delta;
        }

        return this.clampView(currentIndex);
    }

    clampView(currentIndex) {
        const children = this.getChildren();
        // Clamp to valid range
        if (currentIndex < 0 || currentIndex >= children.length) return;
    
        // Adjust scrollLeft to keep target in view
        if (currentIndex < this.scrollLeft) {
            // Moving left
            this.scrollLeft = currentIndex;
        } else {
            // Moving right: ensure total width of visible buttons fits in layout
            let totalWidth = 0;
            for (let i = this.scrollLeft; i <= currentIndex; i++) {
                totalWidth += children[i].width;
            }
            if (totalWidth > this.rect.width-4) {
                this.scrollLeft+=2;
            }
        }
        return currentIndex;
    }

    layoutChildren() {
        let padding = this.getAttribute("padding", 0);
        let x = padding;
        let bumpX = this.getBump();
        let count = 0;

        for (let child of this.getChildren()) {
            let text = ` ${child.getAttribute("text", "??")} `;
            let textWidth = text.length;
            child.setRect(
                1 + padding, x,
                1, textWidth,
                this.rect.sceneY + padding,
                this.rect.sceneX + x - bumpX
            );
            x += textWidth;
            count++;
        }

        this.scrollWidth = Math.max(0, count - 1);
    }

    getBump() {
        let v = 0;
        for (let i = 0; i < this.scrollLeft; i++) {
            if (i >= this.getChildren().length) break;
            v += this.getChildren()[i].width;
        }
        return v;
    }

    render(now = false) {
        if (!this.getStage() || !this.isShowing() || (this.getParent() && !this.getParent().isShowing())) 
            return;

        if (!this.fromScroll) {
            // Adjust view if selection changed without scroll
            this.clampView(this.getSelectedIndex());
        }
    
        this.layoutChildren();
    
        this.getStage().setClip({width:this.rect.width, height:this.rect.height, sceneX:this.rect.sceneX, sceneY: this.rect.sceneY});
        
        this.getStage().sceneFillRect(this.rect, this.getAttribute('color'), this.getAttribute('char'));
    
        for (let i = this.scrollLeft; i < this.getChildren().length; i++) {
            const child = this.getChildren()[i];
            const text = ` ${child.getAttribute("text", "??")} `;
            this.getStage().sceneDrawText(
                text,
                child.rect,
                child.getAttribute('selected') ? child.getAttribute('hColor') : child.getAttribute('color'),
                false
            );
        }
    
        if (now) {
            this.getStage().sceneRenderRect(this.rect);
        }
    
        this.fromScroll = false;
        this.getStage().removeClip();
    }

    handleMouseEvent(event) {
        if (event.button === 'scroll') {
            this.scrollLeft += event.delta;
            this.scrollLeft = Math.max(0, Math.min(this.scrollLeft, this.getChildren().length - 1));
            this.fromScroll = true;
            this.render(true);
            return true;
        }
        return false;
    }

    handleEvent(event) {
        if (event.type === 'MouseEvent') return this.handleMouseEvent(event);
        return false;
    }
}

module.exports = ButtonBar;
