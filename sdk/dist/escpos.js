"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscPosBuilder = void 0;
class EscPosBuilder {
    constructor() {
        this.buffer = [];
    }
    text(value, align = 'left', bold = false) {
        // Alignment
        if (align === 'center') {
            this.buffer.push(0x1B, 0x61, 0x01);
        }
        else if (align === 'right') {
            this.buffer.push(0x1B, 0x61, 0x02);
        }
        else {
            this.buffer.push(0x1B, 0x61, 0x00);
        }
        // Bold
        if (bold) {
            this.buffer.push(0x1B, 0x45, 0x01);
        }
        else {
            this.buffer.push(0x1B, 0x45, 0x00);
        }
        // Text encoding (simple ascii for now)
        for (let i = 0; i < value.length; i++) {
            this.buffer.push(value.charCodeAt(i));
        }
        // Line feed
        this.buffer.push(0x0A);
        return this;
    }
    separator(width = 48) {
        this.text('-'.repeat(width));
        return this;
    }
    feed(lines = 1) {
        this.buffer.push(0x1B, 0x64, lines);
        return this;
    }
    cut() {
        this.buffer.push(0x1D, 0x56, 0x41, 0x00);
        return this;
    }
    drawer() {
        this.buffer.push(0x1B, 0x70, 0x00, 0x19, 0xFA);
        return this;
    }
    build() {
        // Reset formatting at the end
        this.buffer.push(0x1B, 0x40);
        return new Uint8Array(this.buffer);
    }
}
exports.EscPosBuilder = EscPosBuilder;
