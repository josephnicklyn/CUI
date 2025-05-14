class TermStyle {
    constructor(fg = null, bg = null, mode = null) {
        this.fg = fg;   // e.g., "255;255;255"
        this.bg = bg;   // e.g., "0;0;0"
        this.mode = mode; // e.g., "1;4" (bold+underline)
    }

    equals(other) {
        return this.fg === other.fg && this.bg === other.bg && this.mode === other.mode;
    }

    toANSI() {
        const parts = [];
        // if (this.mode) 
        parts.push(this.mode || "0");
        if (this.fg) parts.push(`38;2;${this.fg}`);
        if (this.bg) parts.push(`48;2;${this.bg}`);
        return parts.length ? `\x1b[${parts.join(';')}m` : '';
    }

    static fromObject(obj, uval = null) {
        if (!obj) return new TermStyle();
        return new TermStyle(
            obj.fg ?? uval?.fg ?? null,
            obj.bg ?? uval?.bg ?? null,
            obj.mode ?? uval?.mode ?? null
        );
    }

    static default() {
        return new TermStyle("255;255;255", "0;0;0", "1"); // or define a theme default
    }
}

module.exports = TermStyle;
