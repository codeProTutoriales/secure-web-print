export declare class EscPosBuilder {
    private buffer;
    text(value: string, align?: 'left' | 'center' | 'right', bold?: boolean): this;
    separator(width?: number): this;
    feed(lines?: number): this;
    cut(): this;
    drawer(): this;
    build(): Uint8Array;
}
