const termutils = require("../base/termutils");
const terminal = require("../base/terminal");
const Layout = require("../base/Layout");

class Toast extends Layout {
    
    #backBuffer = null;
    
    constructor(options) {
        super(options);
        this.setAttribute("color", termutils.COLORS.toast.fill);
        this.setRect(0, 0, 3, 40, 3, 3);            
    }
    
    #waiting = false;
    #timeoutId = null;

    render() {}

    toastMessage(message="Hello World!!!", timeout=5, align = 'center', offsetY = 0) {
        if (this.#waiting)
            return;
        this.eventBinder = this.handleEvent.bind(this);
        terminal.setTempHandler(this.eventBinder);
        
        this.#waiting = true;
        let lines = message.split("\n");
        let prefWidth = 0;
        for(let line of lines) {
            if (line.length > prefWidth) { prefWidth = line.length; }
        }

        prefWidth+=4;

        let h = 2 + lines.length;
        
        let w = Math.max(this.getStage().width/2, prefWidth);
        let x = Math.floor(this.getStage().width/2-w/2)
        
        let y = Math.max(1, Math.floor(this.getStage().height/2-(h)-offsetY));

        this.setRect(0, 0, h, w, y, x);

        if (!this.#backBuffer) {
            this.#backBuffer = this.getStage().sceneCopyRegion(this.rect);
        }
        this.getStage().sceneDrawFrame(6, this.rect, termutils.COLORS.toast.border, this.getAttribute("color"), false);
        let index = 0;
        for(let line of lines) {
            index++;
            this.getStage().sceneDrawAlignedText(
                line, {
                width:(w-4),
                sceneX: this.sceneLeft+2,
                sceneY: this.sceneTop+index
            }, align, this.getAttribute("color"));
            
        }
        termutils.QCODES.CURSOR_HIDE();

        setTimeout(() => {
            if (this.#backBuffer) {
                this.getStage().restoreRegion(this.#backBuffer);
                this.getStage().render(true);
                this.#backBuffer = null;
                this.#waiting = false;
                terminal.releaseHandler(this.eventBinder);
            }
        }, timeout*1000);

        this.getStage().sceneRenderRect(this.rect);
    
        
    }

    handleEvent(event) {
        if (event.name === "escape" || event.name === "return" || event.name === "enter") {
            if (this.#backBuffer) {
                this.getStage().restoreRegion(this.#backBuffer);
                this.getStage().render(true);
                this.#backBuffer = null;
                this.#waiting = false;
                clearTimeout(this.#timeoutId);
                terminal.releaseHandler(this.eventBinder);
            }
        }
    }
}

module.exports = Toast;