var z = require('../../src/es6-dev/zana.js');
z.setup({
    useArrayExtensions: true,
    useFunctionExtensions: true,
    // useGeneratorExtensions: true, // to show that we can use the new Iterable class without generator extensions
    useNumberExtensions: true,
    useObjectExtensions: true,
    defaultLogger: console
});
var log = z.log;
log.setDebugLogging(true);
var from = z.from;
var sw = z.sw;
var it, it2, arr, arr2, arr3, gen;

gen = function*() {
    var count = 0;
    while (++count < 10)
        yield count;
};

// sw.push("using iterable");
// for (var i = 0; i < 1000; i++) {
//     it = from(gen)
//         .where(x => x > 2)
//         .where(x => x % 2 === 0)
//         .orderBy(x => x)
//         .thenBy(x => x)
//         .select(x => x*x)
//         .reverse()
//         .toArray();
// } 
// sw.pop();

// arr = [...from(gen)];
// log(arr);
// arr2 = from(gen).toArray();
// log(arr2);


arr = [
      { id: 1, data: 'Data1', quantity: 2 }
    , { id: 2, data: 'Data2', quantity: 3 }
    , { id: 3, data: 'Data3', quantity: 1 }
    , { id: 4, data: 'Data4', quantity: 5 }
    , { id: 5, data: 'Data5', quantity: 3 }
];
arr2 = [
      { id: 1, type: 'square' }
    , { id: 3, type: 'ellipse' }
    , { id: 3, type: 'circle' }
    , { id: 5, type: 'square' }
    , { id: 7, type: 'triangle' }
    , { id: 9, type: 'triangle' }
];
arr3 = [
      { id: 10, type: 'square',   price: 5.25 }
    , { id: 11, type: 'ellipse',  price: 12.23 }
    , { id: 12, type: 'circle',   price: 9.40 }
    , { id: 12, type: 'triangle', price: 3.87 }
];
// it = from(arr).toArray();
// log(it);
// it = from(arr2).toArray();
// log(it);

it = from(arr)
    .innerJoin(arr2)
    .on((x,y) => x.id === y.id)
    .innerJoin(arr3)
    .on((x,y,z) => y.type === z.type)
    .where((x,y,z) => x.quantity < 3 && y.type != 'square')
    .select((x,y,z) => ({
        id: x.id,
        data: x.data,
        type: y.type,
        quantity: x.quantity,
        price: z.price
    }))
    .toArray();
log(it);

// it = from(arr)
//     .leftJoin(arr2)
//     .on((x, y) => x.id === y.id)
//     .select((x,y) =>  ({
//         id: x.id,
//         data: x.data,
//         type: y.type
//     }))
//     .toArray();
// log(it);

// it = from(arr)
//     .crossJoin(arr2)
//     .select((x,y) =>  ({
//         id: x.id,
//         data: x.data,
//         type: y.type
//     }))
//     .toArray();
// log(it);

it = from(arr)
    .leftJoin(arr2)
    .on((x,y) => x.id === y.id)
    .innerJoin(arr3)
    .on((x,y,z) => y.type === z.type)
    .select((x,y,z) => ({
        id: x.id,
        data: x.data,
        type: y ? y.type : null,
        price: z ? z.price : null
    }))
    .toArray();
log(it);

// it = from(arr)
//     .select(x => ({
//         id: x.id,
//         data: x.data
//     }))
//     .toArray();
// log(it);

// it = from([1,[2],3,4,5])
//     .flatten()
//     .toArray();
// log(it);

// it = from([[[[[[[1,[2]],[3,[4],[5]]]]]]]])
//     .flatten()
//     .toArray();
// log(it);