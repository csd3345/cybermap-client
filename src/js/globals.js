/* Globals.js - Global namespace for shared usage in all modules of the map */

/* This file uses a method that mostly maintains backwards and forwards import
 * compatibility with minimal impact on ES Module authoring style.
 * As described here: https://medium.com/@timoxley/named-exports-as-the-default-export-api-670b1b554f65
*/

// import * as myself from './globals.js' // import the file into itself

// this module's own namespace is its default export
// export default myself

// export let globals = {
export default {
    map: null,
    mappa: null,
    sketch: null,
    attacks_system: null,
    events: [],
    attack_types: ["asteroid", "ddos"],
    colors: [
        //"#ffae3c",
        //"#db1dff",
        "rgb(255,0,26)",
        "#5a5abf",
        //"#68ace5",
        //"#adff28"
    ],
    resized_fired: false,
    kaaaa: "#808d16"
};


