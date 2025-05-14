const Layout = require("../base/Layout");
const Node = require("../base/Node");
const termutils = require("../base/termutils");
const terminal = require("../base/terminal");
const Button = require("../controls/Button");
const Toast = require("../controls/Toast");

class Dialog extends Layout {
    #primaryContent = null;
    #focusedLayout = null;
    #resolve = null;
    #buttons = [];
    #secondaryContent = null;
    #eventTargetContent = null;
    constructor(options={title: "Dialog"}, primaryContent = null) {
        super();
        this.setAttributes({'color': termutils.COLORS.dialog.fill, border:4});
        if (primaryContent !== 'wait') {
            this.#primaryContent = this.addChild(primaryContent instanceof Layout ? primaryContent : new Layout({border: 4}));
        }
        this.titleBar = this.addChild(new Node({ text: ` ${options.title || "Title Bar"} `, color: termutils.COLORS.dialog.title }));
        this.okButton = this.addChild(new Button({ text: "OK"}, false));
        this.cancelButton = this.addChild(new Button({ text: "Cancel"}, false));
        this.#buttons = [this.okButton, this.cancelButton];
    }

    get primaryContent() {
        return this.#primaryContent;
    }

    set primaryContent(layout) {
        if (layout instanceof Layout) {
            if (this.#primaryContent !== null)
                this.removeChild(this.#primaryContent);
            this.#primaryContent = this.addChild(layout);
        }
    }

    set secondaryContent(node) {
        if (node instanceof Layout && this.#secondaryContent == null) {
            this.addChild(node);
            this.#secondaryContent = node;
        }
        return node;
    }

    get secondaryContent() {
        return this.#secondaryContent;
    }
    
    /** Call to display the dialog and get result via Promise */
    show({ height = 0.66, width = 0.5 } = {}) {
        this.center({height, width});
        return new Promise(resolve => {
            this.#resolve = resolve;
            this.eventBinder = this.handleEvent.bind(this);
            terminal.setTempHandler(this.eventBinder);
            this.getStage().render(true);
            this.#primaryContent.focusFirstField?.();
        });
    }

    release(result = { cancelled: true }) {
        if (this.#backBuffer) {
            this.getStage().restoreRegion(this.#backBuffer, true);
            this.#backBuffer = null;
        }
        
        if (this.#resolve) {
            this.#resolve(result);
            this.#resolve = null;
        }
        this.setDisplay(false);
        terminal.releaseHandler(this.eventBinder);
    }

    get resolve() {
        return this.#resolve;
    }
    set resolve(fn) {
        this.#resolve = fn;
    }
    

    /** Call to resolve the dialog and release handler */
    close(result) {
        terminal.releaseHandler(this.eventBinder); // Restore prior input handler
        this.#resolve?.(result);   // Deliver result to awaiting show()
    }

    #backBuffer = null;
    /** Layout & render root layout */
    layoutAndRender(height, width, y = 0, x = 0) {
        termutils.QCODES.CURSOR_HIDE();
        this.setRect(0, 0, height, width, y, x)
        if (!this.#backBuffer) {
            this.#backBuffer = this.getStage().copyShadow(this.rect, -120, -115, -110, 40);
        }
        
        this.titleBar.setRect(0, 0, 1, this.rect.width, this.sceneTop, this.sceneLeft);
        let btnX = this.sceneRight - 11;
        let btnY = this.sceneBottom - 1;
        this.cancelButton.setRect(
            0, 0,
            1,
            10,
            btnY, btnX
        )

        this.okButton.setRect(
            0, 0,
            1,
            10,
            btnY, (btnX-=11)
        )
        this.okButton.layout(this.okButton.rect);
        
        let pHeight = this.height - 5;
        
        let prefSize = 1;

        if (this.#secondaryContent) {
            prefSize = this.#secondaryContent.getAttribute('prefSize');
            pHeight-=(1+prefSize);
        }
        this.#primaryContent.setRect(
            0, 0,
            pHeight, this.width - 4,
            this.sceneTop + 2,
            this.sceneLeft+2
        );
        this.#primaryContent.layout(this.#primaryContent.rect);
        
        if (this.#secondaryContent) {
            this.#secondaryContent.setRect(
                0, 0, 
                prefSize, this.width - 4,
                this.sceneTop + pHeight + 3,
                this.sceneLeft+2
            )
            this.#secondaryContent.layout(this.#secondaryContent.rect);        
        }

        this.render();
        this.setFocus(this.#primaryContent);
        this.ready();
        termutils.QCODES.CURSOR_HIDE();
        
    }

    layout() {
        // pass
    }

    ready() {}

    render(now) {
        super.render(false);
        let ud = null;
        for(let child of this.getChildren()) {
            child.render();
        }
        this.getStage().sceneRenderRect(this.rect);
       
    }

    /** Expose root layout if direct child manip needed */
    getRoot() {
        return this.#primaryContent;
    }

    /** Focus handling */
    setFocus(layout, spec=null) {
        if (this.#focusedLayout !== layout) {
            this.#focusedLayout?.onBlur();
            this.#focusedLayout = layout;
            this.#focusedLayout?.onFocus();
        }
        if (spec instanceof Layout && (spec === this.#primaryContent || spec === this.#secondaryContent)) {
            this.#eventTargetContent = spec;
        }
    }

    activeFocus() {
        return (this.#focusedLayout?.isShowing()) ? this.#focusedLayout : null;
    }

    updateCursorPosition() {
        this.#focusedLayout?.updateCursorPosition();
    }

    hasFocus() {
        return !!this.#focusedLayout;
    }


    /** Event delegation entry */
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

    
    getButtons() {
        return this.#buttons;
    }

    hoverButton(event) {
      
        let hovering = null;
        if (event.button === 'left' || event.action === 'mousemove') {
            let eventTarget = this.clickTest(event.relY, event.relX);
            if (eventTarget) {
                let hovered = eventTarget.child;
                if (this.#buttons.includes(hovered)) {
                    for (let btn of this.#buttons) {
                        if (btn === hovered) {
                            btn.hoverIn();
                            if (event.button === 'left')
                                hovering = btn === this.okButton?"submit":"cancel";
                        } else { 
                            btn.hoverOut();
                        }
                    }
                    return hovering;
                }
            }
        }
    
        return hovering;
    }

    handleKeyEvent(event) {
        if (!this.#eventTargetContent)
            this.#eventTargetContent = this.#primaryContent;
        
        if (event.name === 'tab') {
            const next = (this.#eventTargetContent === this.#primaryContent && this.#secondaryContent)
                ? this.#secondaryContent
                : this.#primaryContent;
        
            this.#eventTargetContent = next;
            this.setFocus(next);
            this.updateCursorPosition();
        }
        return this.#eventTargetContent.handleEvent(event);
    }
    

    handleMouseEvent(event) {
        this.getStage().relativePoint(event);
        let eventTarget = this.clickTest(event.relY, event.relX);
            
        if (event.button === 'none' || event.action === 'mousemove') {
            this.hoverButton(eventTarget?.child?event:false);
        }
        if (eventTarget) {
        
            let child = eventTarget.child;
            
            if (child == this.#primaryContent || child === this.#secondaryContent) {
                if (event.button === 'left' && event.action === 'mousedown') {
                    this.#eventTargetContent = child;
                    this.setFocus(this.#eventTargetContent);
                } 
                child.handleEvent(event);
            } else if ( (eventTarget.child == this.okButton || eventTarget.child == this.cancelButton) 
                    && event.action == 'mousedown') {
                        if (child === this.okButton) {
                            if (this.hasActionListener()) {
                                this.sendAction();
                            } else {
                                return this.release();
                            }
                        } else if (child === this.cancelButton) {
                            return this.release();
                        }    
            }
        }

        this.updateCursorPosition();
    }

    
    /** Called if a layout is removed during dialog lifetime */
    update(removed) {
        if (removed === this.#focusedLayout) this.#focusedLayout = null;
        this.#primaryContent.update();
    }

    /** Centers the root layout relative to the terminal */
    center({height = 10, width = 40 } = {}) {
        let termCols = this.getStage().width;
        let termRows = this.getStage().height;

        if (width !== parseInt(width)) {
            width = Math.floor(termCols * width);
        }

        if (height !== parseInt(height)) {
            height = Math.floor(termRows * height);
        }

        if (width < 8) width = 8;
        if (height < 1) height = 1;

        width = Math.min(width, termCols-2);
        height = Math.min(height, termRows-2);
        

        // Default to root's existing dimensions if not provided
        if (!width || !height) {
            const bounds = this.#primaryContent.rect;
            width = width || bounds.width || 40;
            height = height || bounds.height || 10;
        }

        const y = Math.floor((termRows - height) *0.4);
        const x = Math.floor((termCols - width) / 2);
        this.layoutAndRender(height, width, y, x);
    }

    showError(message) {
        let toast = new Toast({}, this.getStage());
        let msg = JSON.stringify(message, null, 4).replaceAll('"', "");
        toast.toastMessage(msg, 5, "left", 2);
    }


}

module.exports = Dialog;
