const TermStyle = require('./termstyle');
const utils = require("./termutils");
const util = require('util');

/**
 * TermBuffer manages a 2D terminal rendering buffer, handling text, styles, and regions.
 * It supports primary and secondary buffers, with coordinate transformations and ANSI output.
 */
class TermBuffer {
  #BUFFER = null;
  #rect = null;
  #defaultStyle = null;
  constructor(height = 25, width = 80, y = 0, x = 0, style = utils.COLORS.BACKGROUND) {

    if (TermBuffer.instance) {
        return TermBuffer.instance;
    }
    TermBuffer.instance = this;

    this.#rect = { height, width, y, x };

    if (!style) 
      style = utils.COLORS.BACKGROUND;

    this.#defaultStyle = style;
    this.#BUFFER = this.createBuffer();
  }

  /**
   * Converts buffer coordinates to 1-based terminal coordinates.
   * @param y - Buffer y-coordinate.
   * @param x - Buffer x-coordinate.
   * @returns Terminal coordinates { y, x }.
   */
  toTerminalCoords(y, x) {
    let absY = y + this.#rect.y;
    let absX = x + this.#rect.x;
    return { y: absY + 1, x: absX + 1 }; // 1-based terminal coordinates
  }
  
  resizeBuffer(height=25, width=80, y=0, x=0, doRender=true) {
    // console.clear();
    
    this.#rect.x = x;
    this.#rect.y = y;
    
    if (this.#rect.width !== width || this.#rect.height !== height) {
      this.#rect.height = height;
      this.#rect.width = width;
      this.#BUFFER = this.createBuffer();
    }
    if (doRender) this.render();
  }

  createBuffer() {
    const defaultStyle = TermStyle.fromObject(this.#defaultStyle);
    const row = () =>
      Array(this.#rect.width)
        .fill()
        .map(() => ({ char: ' ', style: defaultStyle }));
    return Array(this.#rect.height)
      .fill()
      .map(row);
  }

  clear() {
    this.#BUFFER = this.createBuffer();
  }

  getChar(y, x) {
    if (this.isValidCoord(y, x)) {
      return this.#BUFFER[y][x];
    }
    return { char: ' ', style: TermStyle.fromObject(this.#defaultStyle) };
  }


  #clipRegion = null;
  setClip(clipRegion) {
    this.#clipRegion = clipRegion;
  }

  removeClip() {
    this.#clipRegion = null;
  }

  isValidCoord(y, x) {
    if (this.#clipRegion != null) {
      
      return (y >= this.#clipRegion.sceneY && y < (this.#clipRegion.sceneY + this.#clipRegion.height))
              && (x >= this.#clipRegion.sceneX && x < (this.#clipRegion.sceneX + this.#clipRegion.width));
        
    }
    return y >= 0 && y < this.#rect.height && x >= 0 && x < this.#rect.width;
    
  }

    /**
     * Renders a region of the buffer to the terminal.
     * @param by - Starting y-coordinate (default: 0).
     * @param bx - Starting x-coordinate (default: 0).
     * @param bh - Height of the region (default: buffer height).
     * @param bw - Width of the region (default: buffer width).
     * @param overrideStyle - Optional style to override cell styles.
     */
  renderRegion(by = 0, bx = 0, bh = this.#rect.height, bw = this.#rect.width, overrideStyle = null) {
    let prevStyle = null;
    const bbuff = [];
    for (let y = 0; y < bh; y++) {
      if (y + by >= this.#rect.height) break;
      if (y + by < 0) continue;
  
      let output = '';
      for (let x = 0; x < bw; x++) {
        if (x + bx >= this.#rect.width) break;
        if (x + bx < 0) continue;
        const { char, style } = this.#BUFFER[y + by][x + bx];
        const effectiveStyle = TermStyle.fromObject(overrideStyle ?? style);
        if (!prevStyle || !effectiveStyle.equals(prevStyle)) {
          output += effectiveStyle.toANSI();
          prevStyle = effectiveStyle;
        }
        output += char;
      }
  
      const { y: termY, x: termX } = this.toTerminalCoords(y + by, bx);
      bbuff.push(`\x1b[${termY};${termX}H${output}`);
      prevStyle = null;
    }
  
    bbuff.push('\x1b[0m');
    process.stdout.write(bbuff.join(''));
  }
  
  renderRect(src_rect, style=null) {
    this.renderRegion(
      src_rect.y, src_rect.x, src_rect.height, src_rect.width, style
    )
  }

  sceneRenderRect(src_rect, style=null) {
    this.renderRegion(
      src_rect.sceneY, src_rect.sceneX, src_rect.height, src_rect.width, style
    )
  }

  render() {
    this.renderRegion();
  }

  renderOverlayRegion(buff) {
    let { region, x, y } = buff;
    let prevStyle = null;
    let bbuff = [];
    for (let row = 0; row < region.length; row++) {
      const { y: termY, x: termX } = this.toTerminalCoords(row + y - this.#rect.y, x - this.#rect.x);
      let output = `\x1b[${termY};${termX}H`;
      for (let col = 0; col < region[row].length; col++) {
        let { char, style } = region[row][col];
        style = this.toANSIStyle(style);
        if (style !== prevStyle) {
          output += style;
          prevStyle = style;
        }
        output += char;
      }
      bbuff.push(output);
      prevStyle = null;
    }
    bbuff.push('\x1b[0m');
    process.stdout.write(bbuff.join(""));
  }

  restoreOriginalRegion(buff) {
    let { x, y, h, w } = buff;
    this.renderRegion(y - this.#rect.y, x - this.#rect.x, h, w);
  }

  restoreRegion({ region, x, y, h, w }, render = false) {
    
    for (let row = 0; row < region.length; row++) {
      for (let col = 0; col < region[row].length; col++) {
        const { char, style } = region[row][col];
        this.setChar(y + row, x + col, char, style);
      }
    }
    if (render) {
      this.renderRegion(y, x, h, w);
    }
  }

  copyRegion(y, x, h, w, hStyle = null, rel=false) {
    const region = [];
    for (let row = 0; row < h; row++) {
      const line = [];
      for (let col = 0; col < w; col++) {
        const cellY = y + row;
        const cellX = x + col;
        if (this.isValidCoord(cellY, cellX)) {
          let { char, style } = this.#BUFFER[cellY][cellX];
          if (hStyle !== null) style = hStyle;
            line.push({ char, style });
        } else {
          //line.push({ char: ' ', style: hStyle ?? this.#defaultStyle });
        }
      }
      region.push(line);
    }
    
    return { y, x, h, w, region };
  }
  
  sceneCopyRegion(sceneRect) {
    return this.copyRegion(
      sceneRect.sceneY,
      sceneRect.sceneX,
      sceneRect.height,
      sceneRect.width
    );
  }

  dimRgbStyles(style, rf = -40, gf = -40, bf = -40) {
    const clamp = (v) => Math.max(0, Math.min(255, v));
  
    const parseRgb = (str) => str.split(";").map(s => parseInt(s, 10));
    const toRgbString = (rgb) => rgb.map(clamp).join(";");
  
    if (!style || !style.fg || !style.bg) {
      return TermStyle.default();
    }
  
    let [fr, fg, fb] = parseRgb(style.fg);
    let [br, bg, bb] = parseRgb(style.bg);
  
    const dimmedFg = [fr + rf, fg + gf, fb + bf];
    const dimmedBg = [br + rf, bg + gf, bb + bf];
  
    return new TermStyle(
      toRgbString(dimmedFg),
      toRgbString(dimmedBg),
      style.mode
    );
  }
  

  copyShadow(rect, rf = -40, gf = -40, bf = -40, dimMore = 20) {
      const region = this.copyRegion(0, 0, this.height, this.width);
      const t = rect.sceneY, l = rect.sceneX;
      const r = l + rect.width, b = t + rect.height;

      for (let row = 0; row < this.height; row++) {
          for (let col = 0; col < this.width; col++) {
              if (!this.isValidCoord(row, col)) continue;

              let { style } = this.#BUFFER[row][col];

              const isEdge = (
                  (row === b && col > l && col <= r) ||
                  (col === r && row > t && row < b)
              );

              this.#BUFFER[row][col].style = this.dimRgbStyles(
                  style,
                  isEdge ? rf - dimMore : rf,
                  isEdge ? gf - dimMore : gf,
                  isEdge ? bf - dimMore : bf
              );
          }
      }

      return region;
  }

  pushRegion(src) {
    for (let y = 0; y < src.rect.height; y++) {
      for (let x = 0; x < src.rect.width; x++) {
        const { char, style } = src.buffer[y][x];
        const targetY = y + src.rect.y - this.#rect.y;
        const targetX = x + src.rect.x - this.#rect.x;
        this.setChar(targetY, targetX, char, style);
      }
    }
  }

  /**
   * Sets a character at the specified coordinates with an optional style.
   * @param y - Buffer y-coordinate.
   * @param x - Buffer x-coordinate.
   * @param char - Character to set.
   * @param style - Optional style (falls back to defaultStyle).
   * @returns True if the coordinate is valid, false otherwise.
   */
  setChar(y, x, char, style = null) {
    if (this.isValidCoord(y, x)) {
      const finalStyle = TermStyle.fromObject(style ?? this.#defaultStyle, this.#BUFFER[y][x]?.style || null);
      this.#BUFFER[y][x] = { char, style: finalStyle };
      return true;
    }
    return false;
  }
  /**
   * Sets a ansi color style at the specified coordinates.
   * @param y - Buffer y-coordinate.
   * @param x - Buffer x-coordinate.
   * @param style - Optional style (falls back to defaultStyle).
   * @returns True if the coordinate is valid, false otherwise.
   */
  setStyle(y, x, style = null) {
    if (this.isValidCoord(y, x)) {
      const finalStyle = TermStyle.fromObject(style ?? this.#defaultStyle, this.#BUFFER[y][x].style);
      this.#BUFFER[y][x].style = finalStyle;
      return true;
    }
    return false;
  }

  clearRect(rect, style, box = -1) {
    let { x, y, width, height } = rect;
    this.drawBox(y, x, height, width, box, style, true);
  }

  drawBox(y, x, h, w, box = 0, style = null, fillStyle = null) {
    
    if (box >= 0 && box < utils.BOX_CHARS.length) {
      if (w > 0 && h > 1) {
        const bx = utils.BOX_CHARS[box];
        h = h < 1 ? this.#rect.height - y : h;
        w = w < 1 ? this.#rect.width - x : w;

        this.setChar(y, x, bx[4], style); // Top-left
        this.setChar(y, x + w - 1, bx[5], style); // Top-right
        this.setChar(y + h - 1, x, bx[6], style); // Bottom-left
        this.setChar(y + h - 1, x + w - 1, bx[7], style); // Bottom-right

        for (let i = 1; i < w - 1; i++) {
          this.setChar(y, x + i, bx[2], style); // Top
          this.setChar(y + h - 1, x + i, bx[3], style); // Bottom
        }
        for (let i = 1; i < h - 1; i++) {
          this.setChar(y + i, x, bx[0], style); // Left
          this.setChar(y + i, x + w - 1, bx[1], style); // Right
        }
      }
      if (fillStyle) {
        this.fillRect(y + 1, x + 1, h - 2, w - 2, fillStyle);
      }
    } else {
      this.fillRect(y, x, h, w, fillStyle);
    }
  }

  drawFrame(box = 0, y = 0, style=null) {
    this.drawBox(y, 0, this.#rect.height - y, this.#rect.width, box, style);
  }

  drawBreak(y, x, width, box = 0, style=null, bookends = false) {
    const bx = utils.BOX_CHARS[box];
    if (bookends) {
      this.setChar(y, x, bx[8], style); // Left junction
      this.setChar(y, x + width - 1, bx[9], style); // Right junction
    }
    for (let i = 1; i < width - 1; i++) {
      this.setChar(y, x + i, bx[10], style); // Horizontal
    }
  }

  fillRect(y, x, h, w, style = null, char = ' ') {
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        this.setChar(y + i, x + j, char, style);
      }
    }
  }

  sceneFillRect(sceneRect, style = null, char = ' ') {
    let {width, height, sceneX, sceneY} = sceneRect;
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        this.setChar(i + sceneY, j + sceneX, char, style);
      }
    }
  }

  sceneHighlightRect(sceneRect, style) {
    let {width, height, sceneX, sceneY} = sceneRect;
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        this.setStyle(i + sceneY, j + sceneX, style);
      }
    }
  }

  sceneDrawFrame(box = 0, sceneRect, style=null, fillStyle=null, offsetForScrollBar=true) {
    this.drawBox(
      sceneRect.sceneY,
      sceneRect.sceneX,
      sceneRect.height,
      sceneRect.width - (offsetForScrollBar?1:0),
      box, style, fillStyle);
  }


  drawBar(y, x, w, char = ' ', style = null) {
    for (let j = 0; j < w; j++) {
      this.setChar(y, x + j, char, style);
    }
  }

  hLine(y, style = null, char = ' ') {
    if (y < 0) y = this.#rect.height + y;
    this.drawBar(y, 0, this.#rect.width, char, style);
  }

  vLine(x, style = null, char = ' ') {
    for(let y = 0; y < this.height; y++) {
      this.setChar(y, x, char, style);
    }
  }

  sceneVLine(y, x, height, style = null, char = ' ', capTop='', capBottom='') {
    let start = capTop?1:0;
    for(let i = start; i < height-start; i++) {
      this.setChar(y+i, x, char, style);
    }
    
    if (capTop) this.setChar(y, x, capTop, style);
    if (capBottom) this.setChar(y+height-1, x, capBottom, style);
    
  }

  sceneHLine(y, x, width, style = null, char = ' ', capLeft='', capRight='') {
    let start = capLeft?1:0;
    for(let i = start; i < width-start; i++) {
      this.setChar(y, x+i, char, style);
    }
    if (capLeft) this.setChar(y, x, capLeft, style);
    if (capRight) this.setChar(y, x+width-1, capRight, style);
  }

  drawAlignedText(text, y, x, width = null, align = 'left', style = null, keepOffEdge = 0) {
    if (x + width > this.#rect.width - keepOffEdge+1) {
      width = this.#rect.width - x - keepOffEdge+1;
    }
    const line = utils.padString(text, width, align);
    this.drawText(line, y, x, style);
  }

  sceneDrawAlignedText(text, sceneRect, align = 'left', style = null, keepOffEdge = 0) {
    let {width, height, sceneX, sceneY} = sceneRect;

    if (sceneX + width > this.#rect.width - keepOffEdge+1) {
      width = this.#rect.width - sceneX - keepOffEdge+1;
    }
    let lines = text.split("\n");
    let y = 0;
    for(let line of lines) {
      let val = utils.padString(line, width, align);
    
      this.drawText(val, sceneY+(y++), sceneX, style);
    }
  }

  sceneDrawText(text, sceneRect, style = null, renderRegion = false, bumpX = 0, bumpY = 0) {
    this.drawText(text, sceneRect.sceneY + bumpY, sceneRect.sceneX + bumpX, style, renderRegion, sceneRect.width - (bumpX*2));
  }

  sceneDrawMText(rows, sceneRect, style = null, renderRegion = false, offsetX = 0) {
    if (rows instanceof Array) {
      let y = sceneRect.sceneY;
      for(let row of rows) {
        this.drawText(row, y++, sceneRect.sceneX+offsetX, style, renderRegion, sceneRect.width);
      }
    }
  }

  sceneDrawEText(text, sceneRect, style = null, renderRegion = false) {
    this.drawText(text, sceneRect.sceneY, sceneRect.sceneX, style, renderRegion);
    let rem = sceneRect.width - text.length;
    if (rem > 0) {
      let x = sceneRect.sceneX + text.length;
      for(;rem>0; rem--) {
        this.setChar(sceneRect.sceneY, x, " ", style);
        x++;
      }
      
    }
  }
  peskyTabs(str) {
      return str.replaceAll("\t", "    ");
  }

  drawText(text, y, x, style = null, renderRegion = false, maxWidth = -1) {
    text = this.peskyTabs(text);
    let len = maxWidth >= 0?Math.min(maxWidth, text.length):text.length;
    for (let j = 0; j < len; j++) {
      this.setChar(y, x + j, text[j], style);
    }
    if (renderRegion) {
      this.renderRegion(y, x, 1, text.length);
    }
  }

  drawTitleBar(text) {
    this.drawBar(0, 0, this.#rect.width, ' ', utils.COLORS.APPBAR);
    this.drawText(text, 0, 2, utils.COLORS.APPBAR);
  }

  log(output) {
    const y = this.#rect.height - 2;
    const x = 2;
    const w = this.#rect.width - 4;
    this.drawAlignedText(String(output), y, x, w, 'center');
    this.renderRegion(y, x, 1, w, utils.COLORS.BACKGROUND2);
  }

  get left() { return this.#rect.x; }
  get top() { return this.#rect.y; }
  get bottom() { return this.#rect.y + this.#rect.height; }
  get right() { return this.#rect.x + this.#rect.width; }
  get width() { return this.#rect.width; }
  get height() { return this.#rect.height; }
  get x() { return this.#rect.x; }
  get y() { return this.#rect.y; }

  get rect() {
    return {...this.#rect};
  }

  pointInBuffer(dy, dx) {
    let {x, y} = this.toTerminalCoords(dy, dx);
    return x >= this.left && x < this.right && y >= this.top && y < this.bottom;
  }

  getRelativePos(y, x) {
    // Adjust for 1-based terminal coordinates by subtracting 1
    let relY = y - 1;
    let relX = x - 1;
  
    // Subtract the buffer's rect origin to get zero-based coordinates
    relY -= this.#rect.y;
    relX -= this.#rect.x;
  
    return { y: relY, x: relX };
  }

  relativePoint(event) {
    if (event && event.x && event.y) {
      let {x, y} = event;
      let r = this.getRelativePos(y, x);
      event.relX = r.x;
      event.relY = r.y;
    }
  }

  sceneGetRelativePos(rect, row, col, adj = true) {
    let y = rect.sceneY + row + this.rect.y + (adj?rect.y:0);
    let x = rect.sceneX + col + this.rect.x + (adj?rect.x:0);

    return {x, y}
  }

  static
  getPrimaryBuffer() {
    return TermBuffer.instance;
  }

  debugRect(rect, label) {
    if (typeof(label) !== 'string') {
      label = JSON.stringify(label);
    }
    this.drawText(`${label}: (${rect.x},${rect.y},${rect.width}x${rect.height})     `, rect.y, rect.x, utils.COLORS.HOVER);
    this.renderRect(rect);
  }

  debugSimple(rect, label="", msg="") {
    if (label instanceof Object) {
      label = JSON.stringify(label);
    } 
    if (msg instanceof Object) {
      msg = JSON.stringify(msg);
    }

    this.sceneDrawText(`${label}: ${msg}     `, rect, utils.COLORS.RED_YELLOW);
    this.renderRect(rect);
  }
  #bt = 0;
  log(ty, tx, ...parts) {
    let y = !isNaN(ty)?Math.floor(ty):0;
    let x = !isNaN(tx)?Math.floor(tx):0;
    
    for(let part of parts) {
        let text = util.inspect(part, { depth: null, styles: false });
        let lines = text.split("\n");
        for(let line of lines) {
            this.drawAlignedText(line, y++, x, this.width-1);
        }
    }
    if (y < this.#bt) {
        for(let i = y; i < this.#bt; i++) {
            this.drawBar(i, x, this.width-1, ' ')
        }
    }
    this.#bt = y;
    this.renderRegion(ty, tx, this.height-2, this.width);
  }

}

module.exports = TermBuffer;
