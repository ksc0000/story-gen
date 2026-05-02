"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeUndefinedDeep = removeUndefinedDeep;
function removeUndefinedDeep(value) {
    if (Array.isArray(value)) {
        return value
            .map((item) => removeUndefinedDeep(item))
            .filter((item) => item !== undefined);
    }
    if (value && typeof value === "object") {
        const cleaned = Object.fromEntries(Object.entries(value)
            .filter(([, entry]) => entry !== undefined)
            .map(([key, entry]) => [key, removeUndefinedDeep(entry)]));
        return cleaned;
    }
    return value;
}
//# sourceMappingURL=firestore-sanitize.js.map