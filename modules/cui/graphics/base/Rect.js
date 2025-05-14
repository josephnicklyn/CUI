class Rect {
    #rect = {x:0, y:0, width: 0, height:0, sceneX: 0, sceneY: 0};

    constructor(rect) {
        if (rect instanceof Object)
            this.rect = rect;
    }
    get x() { return this.#rect.x; }
    set x(value) { if (!isNaN(value)) this.#rect.x = parseInt(value); }

    get y() { return this.#rect.y; }
    set y(value) { if (!isNaN(value)) this.#rect.y = parseInt(value); }

    get width() { return this.#rect.width; }
    set width(value) { if (!isNaN(value)) this.#rect.width = parseInt(value); }

    get height() { return this.#rect.height; }
    set height(value) { if (!isNaN(value)) this.#rect.height = parseInt(value); }

    get left() { return this.x; }
    get top() { return this.y; }
    get right() { return this.x + this.width; }
    get bottom() { return this.y + this.height; }

    get sceneLeft() { return this.sceneX; }
    get sceneTop() { return this.sceneY; }
    get sceneRight() { return this.sceneX + this.width-1; }
    get sceneBottom() { return this.sceneY + this.height-1; }

    get sceneX() { return this.#rect.sceneX; }
    set sceneX(value) { if (!isNaN(value)) this.#rect.sceneX = parseInt(value); }

    get sceneY() { return this.#rect.sceneY; }
    set sceneY(value) { if (!isNaN(value)) this.#rect.sceneY = parseInt(value); }


    setRect(y, x, height, width, sceneY=0, sceneX=0) {
        this.x = x;
        this.y = y;
        this.height = height;
        this.width = width;
        this.sceneX = sceneX;
        this.sceneY = sceneY
    }

    get rect() {
        return {x:this.x, y:this.y, height:this.height, width:this.width, sceneX:this.sceneX, sceneY:this.sceneY};
    }

    set rect(r) {
        if (r instanceof Object) {
            if (r.x !== undefined) this.x = r.x;
            if (r.y !== undefined) this.y = r.y;
            if (r.width !== undefined) this.width = r.width;
            if (r.height !== undefined) this.height = r.height;
            if (r.sceneX !== undefined) this.sceneX = r.sceneX;
            if (r.sceneY !== undefined) this.sceneY = r.sceneY;
        }
    }

    pointInRect(y, x) {
        return x >= this.left && x < this.right && y >= this.top && y < this.bottom;
    }

    pointInSceneRect(y, x) {
        return x >= this.sceneLeft && x < this.sceneRight && y >= this.sceneTop && y < this.sceneBottom;
    }


    intersects(otherRect) {
        if (otherRect instanceof Rect) {
            return (
                this.x < otherRect.x + otherRect.width &&
                this.x + this.width > otherRect.x &&
                this.y < otherRect.y + otherRect.height &&
                this.y + this.height > otherRect.y
            );
        } else {
            return false;
        }
    }

    toString() {
        return `Rect = {x:${this.x}, y:${this.y}, width:${this.width}, height:${this.height}, sceneX:${this.sceneX}, sceneY:${this.sceneY}}`;
    }

}

module.exports = Rect;
