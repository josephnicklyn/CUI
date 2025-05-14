const Node = require("../base/Node")
const utils = require("../base/termutils")

class BreakNode extends Node {
    constructor(buffer) {
        super(buffer);
    }


    render() {
        let box = this.getAttribute("box", 0);
        this.getStage().drawBreak(this.sceneY, this.sceneX, this.width, box, this.getAttribute("color"));
    }
}

module.exports = BreakNode;
