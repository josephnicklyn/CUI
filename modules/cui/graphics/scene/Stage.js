const TermBuffer = require("../base/TermBuffer");
const termutils = require("../base/termutils")
const DebugInfoView = require("../views/DebugInfoView");
const {openFile} = require("../views/EditView");
const Node = require("../base/Node")
const Toast = require("../controls/Toast");
const FILE_MANAGER = require("../../FileManager");

const FileDialog = require("./FileDialog");
const InputDialog = require("./InputDialog");

class Stage extends TermBuffer {
    #root = null
    #ids = {};
    #names = {};
    #focusedLayout = null;
    #debugMode = false;
    #debugView = null;
    
    constructor(root, ids = {}, names = {}) {
        super();
        if (!termutils.isPrototypeByName(root, "Layout")) {
            throw "Root must be a layout"
        }        
        this.#root = root;
        this.#ids = ids || {};
        this.#names = names || {};

        this.#debugView = new DebugInfoView();
        this.getRoot().addChild(this.#debugView); // Assuming add() adds to root layout
        this.#debugView.setDisplay(false);
        
        FILE_MANAGER.onChange((message) => {
            if (message.type !== 'initialized') {
                this.showError(message);
                return true;
            }
        });
    }


    showError(message) {
        let toast = new Toast({}, this);
        let msg = JSON.stringify(message, null, 3).replaceAll('"', "");
        toast.toastMessage(msg, 5, "left", 2);
    }
    #modalDialog = null;

    #dialogTypes = {
        "file": FileDialog,
        "input": InputDialog
    };

    isModalDialogActive() {
        return this.#modalDialog !== null;
    }
    
    setModalDialog(dialog) {
        this.#modalDialog = dialog;
    }

    clearModalDialog() {
        this.#modalDialog = null;
    }

    isModalDialogActive() {
        return this.#modalDialog !== null;
    }

    async requestDialog(type, options = {}, requester, callback, size={}) {
        if (this.isModalDialogActive()) {
            if (callback) callback({ cancelled: true, reason: 'dialog-active' });
            return null;
        }
        const prevFocus = this.#focusedLayout;
        
        const DialogClass = this.#dialogTypes[type];
        if (!DialogClass) {
            this.showError({ cancelled: true, reason: 'dialog-type-invalid' });
            callback?.("");
            return null;
        }
    
        const dialog = new DialogClass(options);
        this.setModalDialog(dialog);
    
        const result = await dialog.show(size);
        this.clearModalDialog();
    
        this.getRoot().render(true);
        
        this.#focusedLayout = prevFocus;

        if (!result.cancelled && callback) {
            callback(result);
        }
        return result;
    }
    

    toggleDebug() {
        this.#debugMode = !this.#debugMode;
        this.#debugView.setDisplay(!this.#debugView.getDisplay());
        this.getRoot().layoutAndRender();
    }

    updateDebugInfo(event) {
        if (!this.#debugMode) return;
        let af = this.activeFocus();
        this.#debugView.setLines([
            `Captured: ${this.#capturedLayout?.constructor.name || 'None'}`,
            `Mouse: ${event.relX}x${event.relY}`, // assuming you store it
            `Focus: ${af?.constructor.name || 'None'}`,
            `isShowing: ${af?af.isShowing() : 'false'}`
        ]);
    }

    sendDebugMessage(...items) {
        let v = []
        items.forEach((it) => {
            v.push(JSON.stringify(it).replaceAll('"', ""));
        });

        if (!this.#debugMode) return;
        this.#debugView.setLines(v);
    }

    setFocus(layout) {
        if (this.focusedLayout !== layout) {
            if (this.#focusedLayout) {
                this.#focusedLayout.onBlur(); // Notify old layout
            }
            this.#focusedLayout = layout;
            if (layout) {
                layout.onFocus(); // Notify new layout
            }
        }
    }

    activeFocus() {
        if (this.#focusedLayout && this.#focusedLayout.isShowing()) {
            return this.#focusedLayout;
        } else {
            return null;
        }
    }

    updateCursorPosition() {
        if (this.#focusedLayout) {
            this.#focusedLayout.updateCursorPosition();
        }
    }

    hasFocus() {
        return this.#focusedLayout;
    }

    setSize(rows, columns) {
        this.resizeBuffer(rows, columns);
    }

    getRoot() { return this.#root; }

    getNames() { return this.#names; }

    getByName(name) {
        return this.#names[name] || [];
    }

    getIds() { return this.#ids; }

    getById(id) {
        return this.#ids[id];
    }

    layoutAndRender(height, width, y, x) {
        this.resizeBuffer(height, width, y, x);
        this.getRoot().layoutAndRender(height, width);
    }

    handleEvent(event) {
        switch (event.type) {
            case 'InitializeEvent':
                break;
            case 'ResizeEvent':
                this.handleResizeEvent(event);
                break;
            case 'MouseEvent':
                this.handleMouseEvent(event);
                
                break;
            case 'KeyEvent':
                this.handleKeyEvent(event);
                break;
        }
    }


    handleKeyEvent(event) {

        if (event.name === "F12") {
            this.toggleDebug();
            return;
        }

        if (this.#focusedLayout && this.#focusedLayout.isShowing() ) {
            return this.#focusedLayout.handleEvent(event);
        }
        return false; // No focused layout
    
    }

    #capturedLayout = null;
    captureMouse(target) {
        if (target && !((target instanceof Node) && target.isFocusable))
            this.#capturedLayout = target;
    }
    
    releaseMouse() {
        this.#capturedLayout = null;
    }

    handleMouseEvent(event) {
        this.relativePoint(event);
        this.#ids.INFOBAR.setPanelText(1, `${event.relY} x ${event.relX}`, true);
        this.updateDebugInfo(event);

        if (this.#capturedLayout) {
            if (this.#capturedLayout.handleEvent(event)) {
                return;
            }
            this.releaseMouse();
        }

        let nd = this.getRoot().getLayoutUnder(event);
        if (nd) {
            nd.handleEvent(event);
            if (event.action === "mousedown") {
                const target = event.hoverTarget;
                const captured = target?.onActivate?.();
                if (captured === false || !target) {
                    this.captureMouse(nd);
                }
            }
          
        }

        this.updateCursorPosition();
    }

    handleResizeEvent(event) {
        let {rows, columns} = process.stdout;
        let w = columns-42;
        let h = rows-6;
        let x = 40;// Math.floor(columns/2-w/2);
        let y = Math.max(1, Math.floor(rows/2-h/2));    
        this.layoutAndRender(h, w, y, x);    
    }
    
    dispatchAction(action) {
        this.sendDebugMessage(action);
        if (action instanceof Object) {
            if (action.type === 'OPEN_FILE') {
                let path = action.attributes.path;
                this.#ids.TABVIEW.addChild(openFile(path));
            } else if (action.type === 'OPEN') {
                this.showFileDialog((data) => {
                    let path = data.path;
                    this.#ids.TABVIEW.addChild(openFile(path));
                }, {title: "Open File ...", path: this.filePath});

            } else if (this.activeFocus()) {
                if (['SAVE', 'SAVE_AS'].includes(action.type)) {
                    this.activeFocus().actionListener(action.type);
                } else if (action.type === 'CLOSE') {
                    this.#ids.TABVIEW.removeChild(this.activeFocus());
                }

            }
        }
    }

    update(removed) {
        if (removed === this.#focusedLayout) {
            this.#focusedLayout = null;
        }
        if (removed === this.#capturedLayout) {
            this.#capturedLayout = null;

        }
        this.getRoot().update();

    }

    showFileDialog(callback, options={}) {
        return this.requestDialog("file", options, this, callback).then(result => {
            return result;
        });
    }

}

module.exports = Stage;