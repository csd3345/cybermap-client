// import "p5";
import globals from "../globals";

export default class Landmark {

    constructor(lat, lng, size, color = globals.colors[0]) {
        this.lat = lat;
        this.lng = lng;
        this.size = size;
        this.color = color;
        // this.v = -180; // degrees
        this.v = -360; // degrees
        this.z = 0; //
    }

    preshow() {
        const temp = globals.mappa.latLngToPixel(this.lat, this.lng);
        this.x = temp.x;
        this.y = temp.y;
        //globals.sketch.noFill();
        //globals.sketch.stroke(this.color);
        globals.sketch.fill(this.color);
        //globals.sketch.strokeWeight(2);
        globals.sketch.circle(this.x, this.y, 3);
    }

    show() {
        this.preshow();
        const temp = globals.mappa.latLngToPixel(this.lat, this.lng);
        this.x = temp.x;
        this.y = temp.y;
        globals.sketch.noFill();
        globals.sketch.stroke(this.color);
        globals.sketch.strokeWeight(1);
        // globals.sketch.strokeWeight(globals.sketch.map(this.z, 0, 6, 0.6, 3));
        this.z += 0.01;

        // USE THIS WORKS
        //globals.sketch.ellipse(this.x, this.y, 5 * globals.sketch.sin(this.v), 5 * globals.sketch.sin(this.v));
        //globals.sketch.ellipse(this.x, this.y, 15 * globals.sketch.sin(this.v), 15 * globals.sketch.sin(this.v));
        //this.v += 4;

        //test
        globals.sketch.ellipse(this.x, this.y, 15 * globals.sketch.sin(this.v), 15 * globals.sketch.sin(this.v));
        this.v += globals.sketch.PI / 2;

    }

}
