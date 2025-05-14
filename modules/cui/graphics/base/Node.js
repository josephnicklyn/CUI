const Rect = require("./Rect");
const termutils = require("./termutils");
const TermBuffer = require("./TermBuffer")
class Node extends Rect {
    
    #attributes = {};
    #showing = true;
    #display = true;
    #parentStage = null;
    #parent = null;

    constructor(options={}, ignore=[]) {
        super();
        this.setAttribute("color", termutils.COLORS.BACKGROUND)
        this.setAttribute("char", ' ');
        if (options instanceof Object)
            for(let key of Object.keys(options)) {
                if (ignore.includes(key))
                    continue;
                if (key === 'rect') {
                    this.rect = options[key];
                    continue;
                }
                this.setAttribute(key, options[key]);
            }
    }

    getText() {
        return this.getAttribute("text", "");
    }

    setText(value) {
        this.setAttribute('text', new String(value));
    }

    getParent() {
        return this.#parent;
    }
    
    setParent(node) {
        if (node instanceof Node && node != this) {
            this.#parent = node;
        }
    }

    
    getAttributes() {
        return this.#attributes;
    }

    setAttributes(attrs={}) {
        for(let key of Object.keys(attrs)) {
            this.setAttribute(key, attrs[key]);
        }
    }

    setAttribute(name, value) {
        this.#attributes[name] = value;
    }

    getAttribute(name, defaultValue) {
        let attr = this.#attributes[name];
        if (!attr) 
            attr = defaultValue;
        return attr;
    }

    hasAttribute(name) {
        return this.#attributes[name] !== undefined;
    }

    removeAttribute(name) {
        delete this.#attributes[name];
    }

    
    isShowing(checkParent=false) {
        return this.#showing && this.#display;
    }


    show() { this.#showing = true; }

    hide() { this.#showing = false; }

    getDisplay() { return this.#display; }
    setDisplay(value=true) {
        this.#display = value;//(value===true)?true:false;
        // if (this.getParent()) {
        //     this.getParent().markDirty();
        // }

    }

    getStage() {
        return TermBuffer.instance; 
    }
    
    render(now=false) {
        
        if (!this.getStage()) 
            return;

        if (this.getText()) {
            this.getStage().sceneDrawAlignedText(
                this.getText(), 
                this.rect, 
                this.getAttribute('align', "left"),
                this.getAttribute('color'));
        }
        
        if (now) {
            this.getStage().renderRect(this.rect);
        }  
    }

    explore(indent = 0) {
        let r = [" ".repeat(indent*4)+ `${this.constructor.name}:`];
        let attrs = [" ".repeat((indent+1)*4)+`${this.toString()}`];
        attrs.push(" ".repeat((indent+1)*4)+"Attr = {");
       
        for(let key of Object.keys(this.getAttributes())) {
            let value = this.getAttribute(key, "");
            if (typeof value === 'string') {
                value = value.replace("\x1b", "")
            }
            attrs.push(" ".repeat((indent+2)*4) + JSON.stringify({key, value}).replaceAll('"', ""));
        }
        attrs.push(" ".repeat((indent+1)*4)+"}");
        r.push(attrs.join("\n"));
        return r.join("\n");
    }

    pointInNode(y, x) {
        return (
            y>=this.sceneTop && y<=this.sceneBottom &&
            x>=this.sceneLeft && x<=this.sceneRight
        )
    }

    updateCursorPosition() {}
    setCursorPos() {}


    handleEvent(event) {
        return false;
    }

    getMinSize(p) {
        if (p < 0) p = 0;
        let v = this.getAttribute('padding', 0);
        return (p+(v*2));
    }

    #onActionListener = null;
    hasActionListener() {
        return this.#onActionListener !== null;
    }

    sendAction(action, details) {
        if (this.#onActionListener instanceof Function) {
            this.#onActionListener(action, details);
        }
    }

    setOnActionListener(listener) {
        if (listener instanceof Function) {
            this.#onActionListener = listener;
        }
    }

    onFocus() { }

    onBlur() { }

    hoverIn() {}

    hoverOut() {}

}

module.exports = Node;