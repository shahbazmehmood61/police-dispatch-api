export class Validation {
    // tslint:disable-next-line: no-empty
    constructor() { }

    checkString(value: string): string | null {
        return value ? value : null;
    }
}