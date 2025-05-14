const Layout = require("../base/Layout")
const Node = require("../base/Node");
const termutils = require("../base/termutils");
class GridView extends Layout {
    #options = {};
    constructor(options) {
        super(options, ['cols', 'gap', 'headers']);
        this.setAttribute('scrollable', true);
        this.#options = {
            gap: options.gap || 0,
            cols: options.cols,
            headers: options.headers
        };
        this.setAttribute('color', termutils.COLORS.EDITOR)
    }

    useStructure(tuples) {
        if (tuples instanceof Array) {
            this.clearChildren();
            for(let tuple of tuples) {
                for(let value of tuple) {
                    let node = this.addChild(new Node({text: value,color: this.getAttribute('color')}))
                }
            }
        }
    }

    layout(rect) {
        this.rect = rect;
        let { x, y, width, height, sceneY, sceneX } = rect;
        x = 2;
        y = 1;
        width-=4;
        const { cols, gap } = this.#options;
        const rowHeight = 1;
        let rowCount = 0;
        // Normalize col specs
        const colSpecs = cols.map(col => {
            if (typeof col === 'number') return { type: 'fixed', value: col };
            if (typeof col === 'string') {
                if (col.endsWith('%')) return { type: 'percent', value: parseFloat(col) };
                if (col.endsWith('fr')) return { type: 'fr', value: parseFloat(col) };
                if (col === '?') return { type: 'fr', value: 1 };
                return { type: 'fixed', value: parseInt(col) };
            }
            return { type: 'fixed', value: parseInt(col) || 0 };
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
        const colWidths = colSpecs.map(spec => {
            if (spec.type === 'fixed') return spec.value;
            if (spec.type === 'percent') return Math.floor((spec.value / 100) * width);
            if (spec.type === 'fr') return Math.floor((spec.value / frTotal) * remaining);
            return 0;
        });
    
        // Position children

        this.getChildren().forEach((child, i) => {
            const col = i % colSpecs.length;
            const row = Math.floor(i / colSpecs.length);
            if (row > rowCount) rowCount = row;
            const cx = x + colWidths.slice(0, col).reduce((a, b) => a + b + gap, 0);
            const cy = y + row * (rowHeight + gap) - this.scrollTop;
            const cwidth = colWidths[col];
            child.setRect(cy, cx, 1, cwidth, cy+sceneY, cx+sceneX);
        });

        this.scrollHeight = (rowCount + 1) * (rowHeight + gap);
    }
    
    
    
    render(now=false) {
        super.render(true)
        this.getStage().sceneDrawFrame(0, this.rect, termutils.COLORS.BORDER);
        
        this.getChildren().forEach((child, i) => {
            if (child.rect.y >= 0 && child.rect.y < this.rect.height-1) {
                child.render(true);
            }
            
        });
        this.drawVScrollbar();
    }
}

module.exports = GridView;