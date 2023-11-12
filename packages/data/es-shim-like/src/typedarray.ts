import { defineEsShim } from '@nolyfill/shared';

export default defineEsShim({
    ArrayBuffer,
    DataView,
    Float32Array,
    Float64Array,
    Int8Array,
    Int16Array,
    Int32Array,
    Uint8Array,
    Uint8ClampedArray,
    Uint16Array,
    Uint32Array
}, true);
