
const FileExplorer = require("../views/FileExplorer");
const termutils = require("../base/termutils");
const Dialog = require("./Dialog");
const TextInput = require("../controls/TextInput");
const Layout = require("../base/Layout");
class FileDialog extends Dialog {
    constructor(options={title:"File Dialog..."}) {
        super(options, new FileExplorer({
            padding: 0, 
            border: 4, 
            color: termutils.COLORS.dialog.fill, 
            path:options.path,
            childColor:termutils.COLORS.control.fill
        }));

            this.secondaryContent = new Layout({prefSize: 4, border: 1, color: termutils.COLORS.WINDOW_BACKGROUND});
            this.secondaryContent.isFocusable = true;
            this.textInput = this.secondaryContent.addChild(new TextInput({}));
            this.pathInput = this.secondaryContent.addChild(new TextInput());
            this.secondaryContent.handleEvent = this.onHandleEvent.bind(this);
            this.secondaryContent.layout = this.onLayout.bind(this);
            this.secondaryContent.onFocus = this.onFocus.bind(this);
            this.secondaryContent.onBlur = this.onBlur.bind(this);
            this.selectedFile = "";
            this.pathInput.value = this.primaryContent.getPath();
            this.pathInput.setAttribute('color', termutils.COLORS.editor.muted)
            
            this.setOnActionListener(() => {
                this.submit();
            });

            this.primaryContent.setOnActionListener((data, details) => {
                const { options } = data;
                
                if (options.type === 'file') {
                    const filePath = options.path;
                    this.selectedFile = filePath;
                    this.textInput.value = filePath.split("/").pop(); // extract filename
                    this.primaryContent.setDisplay(false);
                    if (details === 'enter' || details === true) {
                        this.validate({path: filePath, name: this.textInput.value});
                    }
                } else if (options.type === 'directory') {
                    this.pathInput.value = options.path;
                }
            });
        }

        ready() {
            this.setFocus(this.textInput, this.secondaryContent);
            this.textInput.setCursorPos(0);
            this.textInput.updateCursorPosition();
            this.textInput.render(true);
        }
      
        submit() {
            let filePath = (this.pathInput.value + "/" + this.textInput.value).replace(/\/+/g, "/");
            

            this.primaryContent.setDisplay(false);
            this.validate({path: filePath, name: this.textInput.value});
        }

        validate({path, name}) {
            if (!path || !name) {
                this.showError("Missing file path or name.");
                return;
            }
            // Optional: validate file name
            if (/[<>:" |?*]/.test(name)) {
                this.showError("Invalid characters in file name.");
                return;
            }
            this.release({
                path,
                name
            });
        }

        onFocus() {
            this.textInput.setAttribute('color', termutils.COLORS.control.focus);
            this.textInput.updateCursorPosition();
            
        }

        onBlur() {
            termutils.QCODES.CURSOR_HIDE();
        }

        onLayout(rect) {
            let width = this.secondaryContent.width - 2
            this.textInput.setRect(
                0, 0, 1, width,
                this.secondaryContent.sceneTop + 2, this.secondaryContent.sceneLeft + 1
            )
            this.pathInput.setRect(
                1, 0, 1, width,
                this.secondaryContent.sceneTop + 1, this.secondaryContent.sceneLeft + 1
            )
        }

        onHandleEvent(event) {
            switch (event.type) {
                case "MouseEvent":
                    return this.onMouseEvent(event);
                case "KeyEvent":
                    return this.onKeyEvent(event);
            }
        }

        onMouseEvent(event) {
            if (event.button === 'left' && event.action === 'mousedown') {
                this.setFocus(this.secondaryContent);
                let child = this.textInput;
                if (child.pointInNode(event.relY, event.relX)) {
                    const cx = Math.max(0, event.relX - this.textInput.sceneLeft - 1);
                    this.textInput.setCursorPos(cx, 0);
                    child.render(true);
                    this.onFocus();
                    return;
                }
            }
        }

        onKeyEvent(event) {
            if (event.name === 'enter') {
                this.submit();
                return;
            }
            this.textInput.handleKeyEvent(event);
        }
}

module.exports = FileDialog;