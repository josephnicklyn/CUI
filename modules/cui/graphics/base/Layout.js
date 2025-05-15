const Node = require("./Node");
const termutils = require("./termutils");

class Layout extends Node {
    #children = [];
    #dirty = true;
    #scroll = { scrollTop: 0, scrollLeft: 0, scrollHeight: 0, scrollWidth: 0, yOffset: 0 };
    #focusable = false;

    constructor(options = {}, ignore = []) {
        super(options, ignore);
        if (!options.color)
            this.setAttribute('color', termutils.COLORS.BACKGROUND);
    }
    
    isDirty() {
        return this.#dirty;
    }
    
    get isFocusable() {
        return this.#focusable;
    }

    set isFocusable(value) {
        this.#focusable = (value===true)?true:false;
    }

    requestFocus() {
        if (this.isFocusable && this !== this.hasFocus()) {
            this.getStage().setFocus(this);
        }
    }

    hasFocus() {
        return this.getStage().hasFocus() === this;
    }

    
    get stickyTop() { return this.#scroll.yOffset;}
    set stickyTop(value) { 
        if (isNaN(value))
            return;
        if (value < 0) value = 0;

        this.#scroll.yOffset = value;
    }

    get scrollTop() { return this.#scroll.scrollTop; }

    set scrollTop(value) {
        value = parseInt(value);
        if (value < 0) value = 0;
        if (value >= this.scrollHeight) value = this.scrollHeight;
        if (this.#scroll.scrollTop !== value && this.getAttribute("scrollable", false)) {
            this.#scroll.scrollTop = Math.floor(value);
            this.markDirty();
            this.layout(this.rect);
        }
    }

    get scrollLeft() { return this.#scroll.scrollLeft; }

    requestLayout() {
        let p = this.getParent();
        while (p) {
            if (p instanceof Layout) {
                p.layout(p.rect);
                p.render(true);
                break;
            }
            p = p.getParent();
        }
    }
    
    set scrollLeft(value) {
        value = parseInt(value);
        if (value < 0) value = 0;
        if (value >= this.scrollWidth) value = this.scrollWidth;
        if (this.#scroll.scrollLeft !== value) {
            this.#scroll.scrollLeft = Math.floor(value);
            this.markDirty();
            this.layout(this.rect);
        }
    }

    get scrollHeight() { return this.#scroll.scrollHeight; }

    set scrollHeight(value) {
        value = parseInt(value);
        if (value < 0) value = 0;
        this.#scroll.scrollHeight = value;
    }

    set scrollWidth(value) {
        value = parseInt(value);
        if (value < 0) value = 0;
        this.#scroll.scrollWidth = value;
    }

    get scrollWidth() { return this.#scroll.scrollWidth; }


    markDirty(forinit = false) {
        if (!forinit && this.getParent()) this.getParent().markDirty();
        this.#dirty = true;
    }

    getChildren() {
        return this.#children;
    }

    getChild(index) {
        return this.#children[index];
    }

    addChild(node, inFront = false) {
        if (!(node instanceof Node)) {
            throw "'Node' must be of type Node.";
        }
        if (node !== this && !this.#children.includes(node)) {
            
            if (inFront)
                this.#children.unshift(node);
            else
                this.#children.push(node);
            node.setParent(this);
        }

        return node;
    }

    removeChild(it) {
        let index = -1;
        if (typeof(it) === 'number') {
            index = it;
        } else {
            index = this.#children.indexOf(it);
        }
        if (index >= 0 && index < this.#children.length) {
            this.#children.splice(index, 1);
            this.markAllDirty();
        }
    }

    removeAllAfter(index) {
        if (index > 0)
            this.#children.splice(index);
        else 
            this.#children = [];
        this.markAllDirty();
    }

    removeAllChildren() {
        this.#children = [];
    }

    hasChildren() {
        return this.#children.length != 0;
    }

    clearChildren() {
        this.#children = [];
    }

    markAllDirty() {
        this.markDirty(true);
        for (let child of this.getChildren()) {
            if (child instanceof Layout) {
                child.markAllDirty();
            }
        }
    }

    layoutAndRender() {
        if (!this.getStage()) return;
        let rect = this.getStage().rect;
        this.setRect(rect.y, rect.x, rect.height, rect.width, rect.sceneY, rect.sceneX);
        this.layout(this.rect);
        this.render(true);
    }

    update() {
        this.markAllDirty();
        this.layout(this.rect);
        this.render(true);
    };

    layout(rect) {
        if (!rect || !this.isShowing()) return;
        this.rect = rect;
        // Allow subclasses to override layout logic
        for (let child of this.getChildren()) {
            if (!child.isShowing()) continue;
            if (child instanceof Layout) {
                // Pass the parent's rect, let child compute its own layout
                child.layout(rect);
            }
        }
        this.markDirty();
    }

    clearMe(drawText=true) {
        this.getStage().sceneFillRect(this.rect, this.getAttribute("color"));
        if (drawText) {
            let text = this.getAttribute("text");
            if (text) {
                let x = this.rect.sceneX + Math.floor(this.rect.width / 2 - text.length / 2);
                let y = this.rect.sceneY + Math.floor(this.rect.height / 2 - 1);
                this.getStage().sceneDrawText(
                    text,
                    {
                        sceneY: y,
                        sceneX: x
                    }
                );
            }
        }
    }

    updateCursorPosition() {
        // termutils.QCODES.CURSOR_HIDE;
    }
    
    render(now = false) {
        if (!this.getStage() || !this.isShowing()) return;
        if (!this.#dirty && !now) return;
        if (!this.getAttribute('border')) {
            this.getStage().sceneFillRect(this.rect, this.getAttribute('color'), this.getAttribute('char'));
        } else {
            this.getStage().sceneDrawFrame(
                this.getAttribute('border'),
                this.rect, 
                this.getAttribute('color'), 
                termutils.COLORS.WINDOW_BACKGROUND, false
            );
        }

        for (let child of this.getChildren()) {
            if (!child.isShowing()) continue;

            if (child instanceof Layout) {
                child.render(now);
            } else {
                child.render(now);
            }
        }
        
        if (now || this.getParent() === null) {
            this.getStage().renderRect(this.rect);
        }
        this.#dirty = false;
    }
    
    setPosition() {}

    useStructure(structure) {}

    toLayoutRect(rect) {
        return {
            x: this.rect.x + rect.x,
            y: this.rect.y + rect.y,
            width: rect.width,
            height: rect.height
        };
    }

    explore(indent = 0) {
        let r = [super.explore(indent)];
        if (this.getAttribute("scrollable")) {
            r.push(" ".repeat(indent * 4) + JSON.stringify(this.#scroll).replaceAll('"', ""));
        }
       
        let ind = indent + 1;
        for (let child of this.getChildren()) {
            r.push(child.explore(ind));
        }
        return r.join("\n");
    }

    getLayoutUnder(event, not = null) {
        for (let child of this.getChildren()) {
            if (!child.isShowing()) continue;
    
            if (child.pointInNode(event.relY, event.relX)) {
                if (child instanceof Node) {
                    if (event.hoverTarget instanceof Node) {
                        if (event.hoverTarget !== child) {
                            event.hoverTarget.hoverOut();
                            termutils.QCODES.CURSOR_HIDE();
                        }
                    }
                    if (child.getAttribute('hoverable')) {
                        child.hoverIn();
                        event.hoverTarget = child;
                    } else {
                        event.hoverTarget = null;
                    }
                }

                if (child instanceof Layout) {
                    const found = child.getLayoutUnder(event, not);
                    if (found) return found;
                } 
            }
        }
    
        return not === this ? null : this;
    }

    drawVScrollbar() {
        if (!this.getStage())
            return;
        if (this.rect.width < 3) return;
        const scrollX = this.rect.width + this.rect.sceneX - 1;
        let scrollY = this.rect.sceneY;
        let scrollH = this.rect.height;

       // if (this.scrollHeight <= this.height/3) {
       //     this.getStage().sceneVLine(scrollY, scrollX, scrollH, termutils.COLORS.scrollbar.fill, '░');
       // } else {
            let scrollB = scrollH + scrollY - 1;
            const rat = Math.abs((this.scrollTop) / (Math.max(this.scrollHeight, 1)));
            let pillY = Math.round(rat * scrollH) + scrollY;
            pillY = Math.min(pillY, scrollB);
            this.getStage().sceneVLine(scrollY, scrollX, scrollH, termutils.COLORS.scrollbar.fill, '▒');
            this.getStage().setChar(pillY, scrollX, "█", termutils.COLORS.scrollbar.pill);
        //}
    }

    drawHScrollbar(prefWidth=12) {
        if (!this.getStage())
            return;
        
        let barWidth = Math.max(3, Math.min(prefWidth, this.rect.width - 5));
        const scrollX = this.rect.sceneX + this.rect.width - (3+barWidth);
        let scrollY = this.rect.height + this.rect.sceneY - 1;
        
        if (this.scrollWidth <= 0) {
            this.getStage().sceneHLine(scrollY, scrollX, barWidth, termutils.COLORS.scrollbar.fill, '░');
            this.getStage().setChar(scrollY, scrollX-1, '┤', termutils.COLORS.BORDER);
            this.getStage().setChar(scrollY, scrollX+(barWidth), '├', termutils.COLORS.BORDER);
        } else {
            const rat = Math.abs((this.scrollLeft) / (Math.max(this.scrollWidth, 1)));
            let pillX = Math.max(0, Math.min(barWidth - 1, Math.round(rat * barWidth))) + scrollX;
            this.getStage().setChar(scrollY, scrollX-1, '┤', termutils.COLORS.BORDER);
            this.getStage().setChar(scrollY, scrollX+(barWidth), '├', termutils.COLORS.BORDER);
            let fillChar = this.hasFocus() ? '▒' : '░';

            this.getStage().sceneHLine(scrollY, scrollX, barWidth, termutils.COLORS.scrollbar.fill, fillChar);

            let thumbWidth = 2;
            let thumbStart = Math.max(scrollX, pillX - Math.floor(thumbWidth / 2));
            for (let i = 0; i < thumbWidth && thumbStart + i < scrollX + barWidth; i++) {
                this.getStage().setChar(scrollY, thumbStart + i, '█', termutils.COLORS.scrollbar.pill);
            }
        }
        
        this.#scroll.hbar = {left: scrollX, width: barWidth};
    }


    forScroll(event) {
        if (event.type !== 'MouseEvent') return false;
        if (event.button !== 'left' || !['mousedown', 'mousemove'].includes(event.action)) {
            return this.handleScrollWheel(event);
        }

        const scrollbar = this.getScrollbarTarget(event);
        if (!scrollbar) return false;

        this.updateScrollPosition(scrollbar, event);
        this.onScroll?.();
        this.render(true);
        return true;
    }

    getScrollbarTarget(event) {
        const isScrollable = this.getAttribute('scrollable', false);
        if (!isScrollable) return null;

        if (event.relX >= this.sceneRight) {
            return { axis: 'vertical', bounds: this.getVerticalScrollbarBounds() };
        }

        if (this.#scroll?.hbar && event.relY >= this.sceneBottom && event.relX > (this.#scroll.hbar.left-3)) {
        
            return { axis: 'horizontal', bounds: this.#scroll.hbar };
        }
        return null;
    }

    getVerticalScrollbarBounds() {
        return {
            left: this.sceneRight,
            top: this.sceneTop,
            width: 1,
            height: this.rect.height
        };
    }

    updateScrollPosition(scrollbar, event) {
        const { axis, bounds } = scrollbar;
        if (axis === 'vertical') {
            const yOffset = event.relY - bounds.top + (this.stickyTop || 0);
            const ratio = Math.min(Math.max(yOffset / bounds.height, 0), 1);
            this.scrollTop = Math.round(ratio * this.scrollHeight);
        } else {
            const xOffset = event.relX - bounds.left;
            if (xOffset >= 0 && xOffset < bounds.width) {
                const ratio = xOffset / bounds.width;
                this.scrollLeft = Math.floor(ratio * this.scrollWidth);
            }
        }
    }

    handleScrollWheel(event) {
        if (event.button !== 'scroll' || !this.getAttribute('scrollable', false)) return false;
        if (!this.pointInNode(event.relX, event.relY)) return false;

        const axis = this.getAttribute('scrollAxis', 'vertical');
        const sensitivity = this.getAttribute('scrollSensitivity', 1);
        const delta = event.delta * sensitivity;

        if (axis === 'vertical') {
            const oldTop = this.scrollTop;
            this.scrollTop = this.clampScroll(this.scrollTop - delta, 0, this.scrollHeight);
            if (this.scrollTop !== oldTop) {
                this.onScroll?.();
                this.render(true);
                return true;
            }
        } else {
            const oldLeft = this.scrollLeft;
            this.scrollLeft = this.clampScroll(this.scrollLeft + delta, 0, this.scrollWidth);
            if (this.scrollLeft !== oldLeft) {
                this.onScroll?.();
                this.render(true);
                return true;
            }
        }
        return false;
    }

    clampScroll(value, min, max) {
        return Math.max(min, Math.min(value, Math.max(max, 0)));
    }

    clickTest(y, x) {
        if (this.pointInNode(y, x)) {
            for (let child of this.getChildren()) {
                if (child.pointInNode(y, x)) {
                    return { child, index: this.getChildren().indexOf(child) };
                }
            }
        }
        return null;
    }

    actionListener(action) {}

    #titleNode = null;
    #title = "";

    setTitleNode(nd) {
        if (nd instanceof Node) {
            this.#titleNode = nd;
        }
    }

    setTitle(value) {
        if (this.#titleNode instanceof Node) {
            this.#titleNode.setText(value);
            if (this.#titleNode.getParent() instanceof Layout) {
                this.#titleNode.getParent().markAllDirty();
                this.#titleNode.getParent().render(true);
            }
        }
    }

    getTitle() {
        return this.#title;
    }

    destroy() {}

    showTimer() {}

    getMenuContext() {
        return {};
    }

    ready() {
        
    }

}

module.exports = Layout;
