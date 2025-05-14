const Layout = require("../base/Layout")
const termutils = require("../base/termutils");
const InputDialog = require("../scene/InputDialog");

class TableView extends Layout {
    #options = {};
    #sortState = { columnIndex: null, state: null };
    #maxIndex = 0;
    #uniqueKeys = [];
    constructor(options) {
        super(options, ['headers', "frameCells"]);
        this.setAttribute('scrollable', true);
        
        let hdrs = options.headers || [];
        let hddef = [];
        this.#options = {
            headers:hddef,
            frameCells: !!options.frameCells
        };
        this.#uniqueKeys = options.unique ?? [];
        hdrs.forEach(item => {
            let [title, size, alignment, minSize] = item.split("|");
            title = title ? title.trim() : "??";
            size = size ? size.trim() : "1fr";
            minSize = parseInt(minSize);
            minSize = isNaN(minSize) ? 2 : Math.max(5, minSize);
            alignment = alignment ? alignment.trim() : "";
            let align = ['center', 'right', 'left'].includes(alignment.toLowerCase()) ? alignment.toLowerCase() : "left";
        
            const headerObj = {
                title,
                size,
                computedWidth: 0,
                align,
                minSize
            };
        
            if (options[title]) {
                headerObj.options = options[title];
            }
        
            hddef.push(headerObj);
        });
        
        
        this.setAttribute('color', termutils.COLORS.editor.fill);
        this.isFocusable = true;
    }

    drawAddRowButton() {
        const y = this.sceneBottom; // last row
        const x = this.sceneLeft + 1;
    
        this.getStage().sceneDrawText(
            "[+]",
            { sceneX: x, sceneY: y },
            termutils.COLORS.table.header
        );
    }

    #data = [];
    useStructure(data) {
        if (Array.isArray(data)) {
            this.#data = data.map((row, index) => {
                if (typeof row === "object" && row !== null) {
                    return { ...row, __index: index };
                } else if (Array.isArray(row)) {
                    return [...row, index]; // or row.__index = index if you wrap
                }
                return row; // fallback
            });
            this.#maxIndex = this.#data.length;
        }
    }

    drawFrame() {

        let headers = this.#options.headers;

        this.getStage().sceneDrawFrame(0, this.rect, termutils.COLORS.BORDER, termutils.COLORS.editor.fill, true);
        this.getStage().sceneHLine(
            this.sceneY+2, this.sceneX, 
            this.width-1, 
            termutils.COLORS.BORDER,
            "─", "├","┤"
        );

        let x = this.rect.sceneX - this.scrollLeft;
        
        headers.forEach((h, i) => {
            let {title, computedWidth} = h;
            let rx = x + computedWidth;
            if (rx > this.scrollLeft && x < this.sceneRight-1) {
                if (i >=1) {
                    this.getStage().sceneVLine(
                        this.sceneY, x, this.height,
                        termutils.COLORS.BORDER,
                        '│', '┬', '┴'
                    );
                    this.getStage().setChar(
                        this.sceneY+2, x, '┼', termutils.COLORS.BORDER
                    );
                }
                let remWidth = (this.sceneRight-2-x);
                let arrow = ''; 
                if (this.#sortState.columnIndex === i) {
                    if (this.#sortState.state === 'asc') arrow = ' △';
                    else if (this.#sortState.state === 'desc') arrow = ' ▽';
                }
                let text = (title.length+1)>=remWidth?
                    termutils.padString(` ${title}${arrow}`, remWidth, "left"):
                    termutils.padString(`${title}${arrow}`, Math.min(computedWidth, remWidth), "center");
                
                this.getStage().setClip(
                    {
                        sceneX:this.rect.sceneX+1,
                        sceneY:this.rect.sceneY+1,
                        width:this.rect.width-3,
                        height:1
                    }
                )
                this.getStage().sceneDrawText(
                    text,
                    { sceneX: x+1, sceneY: this.sceneY + 1 },
                    termutils.COLORS.table.header
                );
                this.getStage().removeClip();
            }
            x+=computedWidth;
        });
    }

    drawRow(r=0, y=0) {
        const headers = this.#options.headers;
        const xStart = this.rect.sceneX - this.scrollLeft;
        y+=this.sceneTop+3;
        if (y > this.sceneBottom-1 || r >= this.#data.length)
            return false
        const row = this.#data[r];
        
        let x = xStart;
    
        this.getStage().setClip(
            {
                sceneX: this.sceneX+1, sceneY: y,
                width:this.width-3,
                height:1
            }
        )
        const focused = r == this.#focusCell.row;
        
        const stripe = 
            focused?termutils.COLORS.table.cell_focus:
            y % 2 === 0
                ? termutils.COLORS.table.altRow
                : termutils.COLORS.table.cell;
            
        headers.forEach((h, i) => {
            
            let cellText = row[i] ?? "";
            const colWidth = h.computedWidth;
            const padWidth = colWidth - 1;
    
            const text = termutils.padString(
                String(` ${cellText} `),
                padWidth,
                h.align || "left"
            );
    
            // Draw text
            this.getStage().sceneDrawText(
                text,
                { sceneX: x + 1, sceneY: y },
                stripe
            );
            x += colWidth;
        });
        this.getStage().removeClip();

        return true;
    }
    

    get visibleRows() {
        let frameCells = this.#options.frameCells;
        let step = frameCells?2:1;
        return Math.floor((this.height - 3)/step)-1;
    }


    layout(rect) {
        this.rect = rect;
        let { width } = rect;
        const headers = this.#options.headers;
        const gap = 0; 
        width-=Math.max(0, headers.length-2);
        
        // Parse column definitions
        const colSpecs = headers.map(h => {
            let size = h.size.trim();
            if (typeof size === 'string') {
                if (size.endsWith('%')) return { type: 'percent', value: parseFloat(size) };
                if (size.endsWith('fr')) return { type: 'fr', value: parseFloat(size) };
                if (size === '?') return { type: 'fr', value: 1 };
                return { type: 'fixed', value: parseInt(size) };
            }
            return { type: 'fixed', value: parseInt(size) || 0 };
        });
    
        const gapSpace = (colSpecs.length - 1) * gap;
    
        let fixedTotal = 0;
        let percentTotal = 0;
        colSpecs.forEach(spec => {
            if (spec.type === 'fixed') fixedTotal += spec.value;
            if (spec.type === 'percent') percentTotal += spec.value;
        });
        
        const percentPixels = Math.floor((percentTotal / 100) * width);
        const remaining = Math.max(0, width - fixedTotal - percentPixels - gapSpace);
    
        const frTotal = colSpecs
            .filter(s => s.type === 'fr')
            .reduce((sum, s) => sum + s.value, 0);
    
        // Final column widths
        const colWidths = colSpecs.map((spec, i) => {
            let computedWidth = 0;
            if (spec.type === 'fixed') {
                computedWidth = spec.value;
            } else if (spec.type === 'percent') {
                computedWidth = Math.floor((spec.value / 100) * width);
            } else if (spec.type === 'fr') {
                computedWidth = Math.floor((spec.value / frTotal) * remaining);
            }
        
            const minWidth = headers[i].minSize ?? (headers[i].title.length + 4);
            computedWidth = Math.max(computedWidth, minWidth);
            computedWidth = Math.min(computedWidth, width); // Clamp max width
            return computedWidth;
        });
        // Apply computed widths to headers
        let totalContentWidth = 0;
        let last = headers.length-1;
        headers.forEach((h, i) => {
            let wd = colWidths[i];
            if (wd < h.minSize) wd = h.minSize;
            if (i === last) {
                h.computedWidth = Math.max(wd, width - totalContentWidth);
            } else {
                h.computedWidth = wd;
            }
            totalContentWidth += h.computedWidth;
        });

        totalContentWidth+=Math.max(0, headers.length-1);
        // Set virtual scroll height (account for header row + data rows)
        this.scrollHeight = (this.#data.length - this.visibleRows + 1);
        this.scrollWidth = totalContentWidth-(this.width);
    }
    
    drawRows() {
        for(let i = 0;; i++) {

            if (!this.drawRow(i+this.scrollTop, i))
                break;
        }
    }

    render(now=false) {
        this.drawFrame();
        this.drawRows();
        this.drawVScrollbar();
        this.drawHScrollbar();
        this.drawAddRowButton();
        if (now) {
            this.getStage().sceneRenderRect(this.rect);
        }
    }

    #focusCell = {row: 0, col: 0};

    async handleKeyEvent(event) {
        let {row, col} = this.#focusCell;
        switch(event.name) {
            case 'right':
                col++;
                break;
            case 'left':
                col--;
                break;
            case 'down':
                row++;
                break;
            case 'up':
                row--;
                break;
            case "pageup":
                row-=this.visibleRows;
                break;
            case "pagedown":
                row+=this.visibleRows;
                break;
                
            case 'enter':
                // this.inputDialog((data) => {
                    
                // });
                await this.openEditDialog(this.#focusCell);
                break;
            case 'tab':
                col++;
                if (col >= this.columnCount) {
                    col = 0;
                    row++;
                }
                break;
            case 'shift+tab':
                col--;
                if (col < 0) {
                    col = this.columnCount - 1;
                    row--;
                }
                break;
        }
        this.setFocusCell(row, col);
    }

    setFocusCell(row, col) {
        this.#focusCell.row = Math.max(0, Math.min(this.#data.length - 1, row));
        this.#focusCell.col = Math.max(0, Math.min(this.#options.headers.length - 1, col));
        this.adjustScrollForFocus();
        this.render(true); // Re-render so focus highlight moves
    }

    adjustScrollForFocus() {
        let focusRow = this.#focusCell.row;
        let visibleRows = this.visibleRows; // already skipping header rows
        let topRow = this.scrollTop;
        
        // FocusRow relative to full data
        if (focusRow < topRow) {
            this.scrollTop = focusRow;
        } else if (focusRow >= topRow + visibleRows) {
            this.scrollTop = focusRow - visibleRows + 1;
        }
    
        this.scrollTop = Math.max(0, this.scrollTop); // Clamp at 0
    }
    
    
    handleEvent(event) {
        switch (event.type) {
            case 'MouseEvent':
                this.handleMouseEvent(event);
                break;
            case 'KeyEvent':
                this.handleKeyEvent(event);
                break;
        }
        
    }

    resetSort() {
        this.#sortState = { column: null, state: null };
        this.#data.sort((a, b) => {
            const ai = a.__index ?? 0;
            const bi = b.__index ?? 0;
            return ai - bi;
        });
        this.scrollTop = 0;
        this.render(true);
    }

    toggleSort(column) {
    
        let { columnIndex, state } = this.#sortState;
        if (column !== columnIndex && state !== null) {
            this.resetSort();
            return;
        }

        let nextState = 'asc';
        if (column === columnIndex) {
            if (state === 'asc') nextState = 'desc';
            else if (state === 'desc') {
                this.resetSort();
                return;
            }
        }
    
        this.#sortState = { columnIndex: column, state: nextState };
        const asc = nextState === 'asc';
    
        this.#data.sort((a, b) => {
            let v1 = a[column];
            let v2 = b[column];
    
            if (typeof v1 === 'string') v1 = v1.toLowerCase();
            if (typeof v2 === 'string') v2 = v2.toLowerCase();
    
            if (v1 < v2) return asc ? -1 : 1;
            if (v1 > v2) return asc ? 1 : -1;
            return 0;
        });
        this.scrollTop = 0;
        this.render(true);
    }

    getCellAt(px, py) {
        
        let x = 0;
        let colIndex = -1;
        let rowIndex = -1;
        let onHeader = -1;
    
        for (let i = 0; i < this.#options.headers.length; i++) {
            let colWidth = this.#options.headers[i].computedWidth;
            if (px >= x && px < x + colWidth) {
                colIndex = i;
                break;
            }
            x += colWidth;
        }
    
        if (py === 1) {
            onHeader = colIndex;
        } else if (py >= 3) {
            rowIndex = Math.min(this.#data.length - 1, py - 3 + this.scrollTop);
        }
    
        return {
            colIndex,
            rowIndex,
            onHeader,
        };
    }

    async handleMouseEvent(event) {
        if (this.forScroll(event)) {
            this.clearMe();
            return;
        }
        if (event.button === 'scroll') {
            let delta = event.delta;
            let oldTop = this.scrollTop;
            this.scrollTop = this.scrollTop - delta;
            if (oldTop !== this.scrollTop) {
                this.update();
            }    
        } else if (event.button === 'left') {
            if (event.dbl === true) {
                await this.openEditDialog(this.#focusCell);
            } else if (event.action === 'mousedown') {
                this.requestFocus();           

                let clickY = event.relY - this.sceneTop; 
                let clickX = event.relX - this.sceneLeft;
                if (clickY === this.height-1 && clickX >= 1 && clickX <= 4) {
                    this.openAddDialog(); // implement this like openEditDialog with blank fields
                    return;
                }
                if (clickY >= this.height-1) 
                    return;
                clickX += this.scrollLeft

                const cell = this.getCellAt(clickX, clickY);
                
                if (cell.onHeader !== -1) {
                    this.toggleSort(cell.onHeader);
                } else if (cell.rowIndex != -1) {
                    this.setFocusCell(cell.rowIndex, 0);
                }
            }
        }
    }

    onFocus() {
        this.render(true);
    }

    isDuplicateRow(newRow) {
        return this.#data.some(row => {
            return this.#uniqueKeys.every((key, colIndex) => {
                const idx = this.#options.headers.findIndex(h => h.title === key);
                return newRow[idx] === row[idx];
            });
        });
    }

    async openAddDialog() {
        let data = [];
        let fields = [];

        const headers = this.#options.headers;
        let w = 0;
        let h = (headers.length*2 + 6)
        headers.forEach((item, col) => {
            let title = item.title;
            let wd = title.length;
            if (wd > w) w = wd;
            let value = '';
            let field = {name: title, label: title, value};
            if (item.options instanceof Array) {
                field.type = 'group';
                field.selection = 'radio';
                field.items = [];
                for(let opt of item.options) {
                    field.items.push({label: opt, checked:(opt === value)});
                }
                h+=(item.options.length-1);
                
            }

            fields.push(field); 
        });
        w = Math.min((w*2)+30, 60);
        let options = {
            title: `Add Row...`,
            fields,
        }

        return this.getStage().requestDialog(
            "input", 
            options, 
            null, 
            null, 
            {width:w, height: h}).then(result => {
                if (!result.cancelled) {
                    headers.forEach((item, col) => {
                        let key = item.title;
                        if (result[key] !== null) { 
                            data.push(result[key]);
                        }
                    });

                    if (this.isDuplicateRow(data)) {
                        this.getStage().showError({message: "Duplicate row!", type: "error" });
                        return;
                    }

                    this.#data.push({ ...data, __index: (++this.#maxIndex) });
                    this.render(true);
                }
            });
    }


    async openEditDialog(cell) {
        let data = this.#data[cell.row];
        let fields = [];

        const headers = this.#options.headers;
        let w = 0;
        let h = (headers.length*2 + 6)
        headers.forEach((item, col) => {
            let title = item.title;
            let wd = title.length;
            if (wd > w) w = wd;
            let value = data[col];
            let field = {name: title, label: title, value};
            if (item.options instanceof Array) {
                field.type = 'group';
                field.selection = 'radio';
                field.items = [];
                for(let opt of item.options) {
                    field.items.push({label: opt, checked:(opt === value)});
                }
                h+=(item.options.length-1);
                
            }

            fields.push(field); 
        });
        w = Math.min((w*2)+30, 60);
        let options = {
            title: `Update Row (${cell.row})`,
            fields,
        }

        return this.getStage().requestDialog(
            "input", 
            options, 
            null, 
            null, 
            {width:w, height: h}).then(result => {
                if (!result.cancelled) {
                    headers.forEach((item, col) => {
                        let key = item.title;
                        if (result[key] !== null) { 
                            data[col] = result[key];
                        }
                    });
                    this.render(true);
                }
            });
    }

}

module.exports = TableView;

