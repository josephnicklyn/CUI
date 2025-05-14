const Layout = require("../base/Layout");
const termutils = require("../base/termutils");
const terminal =  require("../base/terminal");

class DropDown extends Layout   {
    #backBuffer = null;
    #isActive = false;
    #content = null;
    constructor(owner, content, options={}) {
        super(options);
        this.owner = owner;
        if (content instanceof Layout) {
            this.#content = content;
        } else {
            this.#content = new Layout({color: termutils.COLORS.GREEN})
        }
    }

    show( rect) {
        let height = rect.height;
        let x = rect.sceneX;
        let y = rect.sceneY + height;
        let width = rect.width;
        if (y + height > this.getStage().height) {
            y = rect.sceneY - height;
        }
        if (!this.#isActive) {
            if (!this.#backBuffer) {
                this.#backBuffer = this.getStage().copyRegion(y, x, height, width);
                this.setRect(y, x, height, width, y, x);
            }
            this.eventBinder = this.handleEvent.bind(this);
            terminal.setTempHandler(this.eventBinder);
            this.#isActive = true;
            this.render(true);
        }
    }
    
    render(now = false) {
        if (this.#isActive && this.#backBuffer) {
            this.#content.setRect(0, 0, this.height-2, this.width-2, this.sceneTop + 1, this.sceneLeft + 1)
            this.getStage().sceneDrawFrame(
                4, this.rect, 
                termutils.COLORS.BORDER,
                null, 
                false
            );
            this.#content.render(now);
            this.getStage().sceneRenderRect(this.rect);
        }
    }

    isActive() {
        return this.#isActive;
    }

    release() {
        this.#isActive = false;
        if (this.#backBuffer) {
            this.getStage().restoreRegion(this.#backBuffer, true);
            this.#backBuffer = null;
        }
        this.owner.update();

        this.#content.setDisplay(false);    
        terminal.releaseHandler(this.eventBinder);
    }

    handleEvent(event) {

        if (event.type === 'KeyEvent' && event.name === 'escape') {
            this.release();
            return true;
        }
        
        switch (event.type) {
            case 'MouseEvent': return this.handleMouseEvent(event);
            case 'KeyEvent':   return this.handleKeyEvent(event);
        }
    }

    handleMouseEvent(event) {
        this.getStage().relativePoint(event);

        if (event.action === "mousedown") {
            if (!this.pointInRect(event.relY, event.relX)) {
                this.release();
                return true;
            }
        }
        if (this.#content.isShowing())
            return this.#content.handleEvent?.(event) ?? false;
    }

    handleKeyEvent(event) {
        return this.#content.handleEvent?.(event) ?? false;
        
    }


}


module.exports = DropDown;