//region Imports
import {library as fontawesome_library, dom as fontawesome_dom} from '@fortawesome/fontawesome-svg-core';
import {faCog, faCircle, faInfoCircle, faChartArea} from '@fortawesome/free-solid-svg-icons';
import globals from "./globals";
import Map from "./ui/map";

import "bootstrap/js/dist/tab"
import "bootstrap/js/dist/modal"
import "bootstrap/js/dist/collapse"


/* Import CSS */
import 'bootstrap/dist/css/bootstrap.min.css';
import 'animate.css/animate.min.css';
import '../css/raw.scss';
//endregion

// when page loads
$(function () {

    // add the desired fontawesome-icons to the app
    fontawesome_library.add(faCircle, faCog, faInfoCircle, faChartArea);
    fontawesome_dom.watch();

    $("html").niceScroll({cursorwidth: '10px', autohidemode: false, zindex: 999 });


    // noinspection JSPotentiallyInvalidConstructorUsage
    new p5((sketch) => {

        sketch.setup = () => {


            // sketch.disableFriendlyErrors = true;
            sketch.angleMode(sketch.DEGREES);
            globals.sketch = sketch;
            globals.map = new Map();


            window.addEventListener("resize", () => {
                console.log("resize fired");
                // setTimeout(() => {
                //     const windowWidth = window.innerWidth * window.devicePixelRatio;
                //     const windowHeight = window.innerHeight * window.devicePixelRatio;
                //     const screenWidth = window.screen.width;
                //     const screenHeight = window.screen.height;
                //     console.log(windowWidth/screenWidth);
                //     console.log(windowHeight/screenHeight);
                //     if (((windowWidth/screenWidth)>=0.95) && ((windowHeight/screenHeight)>=0.95)) {
                //         console.log("Fullscreen");
                //         globals.map.landscape.reset_zoom(true);
                //     }
                // }, 1000);
            })

        };

        sketch.draw = () => {
            if (globals.map.control_flags.loaded) {
                sketch.clear();
                globals.map.attacks_system.destroyTheEarth();
                globals.map.attacks_system.showLandmarks();
            }
        };

        sketch.windowResized = () => {

            if (!globals.resized_fired){

                global.resized_fired = true;

                globals.map.attacks_system.blockIncoming();

                globals.map.dimensions.width = window.innerWidth;
                globals.map.dimensions.height = window.innerHeight;
                sketch.resizeCanvas(globals.map.dimensions.width, globals.map.dimensions.height);

                let mapCanvas = document.getElementsByClassName('mapboxgl-canvas')[0];
                mapCanvas.style.width = "100%";
                mapCanvas.style.height = "100%";

                let mapContainer = document.getElementsByClassName("mapboxgl-map")[0];
                mapContainer.style.width = window.innerWidth + "px";
                mapContainer.style.height = window.innerHeight + "px";


                globals.map.mapboxMap.resize();
                globals.map.mapboxMap.fitBounds(globals.map.initial.worldBounds);

                //sketch.redraw();

                setTimeout(() => {
                    globals.map.landscape.reset_zoom(true);
                    globals.map.attacks_system.unblockIncoming();
                    globals.resized_fired = false; // reset it
                }, 100);

                // map.leafletMap.fitWorld();

            }
        };

        sketch.preload = () => {};

    });

});
