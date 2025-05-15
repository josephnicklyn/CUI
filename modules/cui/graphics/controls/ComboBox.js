const TextInput = require("../controls/TextInput");
const Button = require("../controls/Button");
const DropDown = require("../controls/DropDown");
const ListBox = require("../controls/ListBox");
const Layout = require("../base/Layout");
const termutils = require("../base/termutils");

class ComboBox extends Layout {
    #listBox = null;
    #txtValue = null;
    #btnGo = null;
    #dropDown = null;

    constructor(options = {readonly:true}) {
        super({flow:"column"});
        this.setAttribute('color', termutils.COLORS.editor.fill);
        this.#txtValue = this.addChild(new TextInput(options));
        this.#btnGo   = this.addChild(new Button({text:"▶"}));
        
        this.#btnGo.setOnActionListener(this.selectMe.bind(this));
        this.#txtValue.setOnActionListener(this.selectMe.bind(this));
        
        this.#listBox = new ListBox({...options, framed: false}, this.getStage());
        this.#listBox.addItems("One", "Two", "Three", "Four", "Five", "Six");
        this.#dropDown =  new DropDown(this, this.#listBox);
        this.#dropDown.setOnActionListener(this.onSelectItem.bind(this))
        this.#listBox.setOnActionListener(this.onSelectItem.bind(this));

    }

    getList() {
        return this.#listBox;
    }
    
    selectMe() {
        this.#listBox.setDisplay(true);
        const value = this.#txtValue.value.trim();
        const list = this.#listBox;
        this.#btnGo.setText('▼');
        this.#dropDown.show({...this.rect, height: 6});
        list.setDisplay(true);
        this.render(true);
        
    }

    layout() {
        super.layout();
        this.#txtValue.setRect(
            0, 0, 
            1,
            this.width - 4,
            this.sceneTop, this.sceneLeft+1
        )
        this.#btnGo.setRect(
            0, 0, 
            1,
            3,
            this.sceneTop, this.sceneRight - 2
        )
        
    }

    render(now = false) {
        super.render(now);
        this.#txtValue.render(now);
        this.#btnGo.render(now);
        this.getStage().sceneRenderRect(this.rect);
    }

    update() {
        this.#listBox.setDisplay(false);
        this.#btnGo.setText('▶');
        this.render(true);
    }
    
    onSelectItem(action, details) {
        if (details === 'enter' || details === true) {
            this.#listBox.setDisplay(false);
            this.#dropDown.release();
            this.#txtValue.value = action?.text;
        }
    }
}

module.exports = ComboBox;