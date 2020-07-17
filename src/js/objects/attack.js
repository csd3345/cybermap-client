import globals from "../globals";
import Landmark from "./landmark";



export default class Attack {

    constructor(
        origin,
        destination,
        type = "asteroid",
    ) {
        this.src_coords = origin;
        this.dst_coords = destination;
        this.origin = globals.mappa.latLngToPixel(...origin);
        this.destination = globals.mappa.latLngToPixel(...destination);
        this.type = type;
        this.size = 18;
        this.color = globals.colors[Math.floor(Math.random() * globals.colors.length)];
        this.delta = 0;
        this.landed = false;
        this.trail = [];
        this.launched = false;
        this.distance = globals.sketch.dist(this.origin.x, this.origin.y, this.destination.x, this.destination.y);


        // this.trail_max = Math.floor(sketch.map(this.distance, 100, 15000, 2, 5, true));
        this.trail_max = globals.sketch.map(this.distance, 100, 1000, 5, 2, true);
        //this.landmark = new Landmark(this.dst_coords[0], this.dst_coords[1], this.size, this.color);

        //this.landmark_occupied = globals.attacks_system.landmark_occupied();

        // for later use
        this.original = {
            distance: this.distance
        };
    }

    run() {
        this.update();
        // this.showTrail();
        if (!this.landed) this.display();
    }

    update() {
        let temp_pixel = globals.mappa.latLngToPixel(...this.dst_coords);
        this.destination.x = temp_pixel.x;
        this.destination.y = temp_pixel.y;
        this.position = p5.Vector.lerp(this.origin, this.destination, this.delta);
        this.distance = globals.sketch.dist(this.origin.x, this.origin.y, this.destination.x, this.destination.y);

        if (this.destination.equals(this.position)) this.landed = true;

        this.trail.push(this.position.copy());
        this.trail.length > this.trail_max && (this.trail.splice(0, 1));

        const percent = 100;

        this.slow_speed = () => {

            if (this.delta < 15 / percent) {
                this.delta += globals.sketch.map(this.distance, 100, 20036, 0.00800, 0.01120, true);
                if (this.landmark) this.landmark.preshow();
            } else if (this.delta < 30 / percent) {
                // create the landmark when the attack is on 30%
                //this.landmark = new Landmark(this.dst_coords[0], this.dst_coords[1], this.size, this.color);
                this.delta += globals.sketch.map(this.distance, 100, 20036, 0.01120, 0.01620, true);
                if (this.landmark) this.landmark.preshow();
            } else if (this.delta < 45 / percent) {
                this.delta += globals.sketch.map(this.distance, 100, 20036, 0.01620, 0.01820, true);
                if (this.landmark) this.landmark.preshow();
            } else if (this.delta < 60 / percent) {
                this.delta += globals.sketch.map(this.distance, 100, 20036, 0.01820, 0.02020, true);
                if (this.landmark) this.landmark.preshow();
            } else if (this.delta < 75 / percent) {
                this.delta += globals.sketch.map(this.distance, 100, 20036, 0.02020, 0.02420, true);
                if (this.landmark) this.landmark.preshow();
            } else if (this.delta < 100 / percent) {
                this.delta += globals.sketch.map(this.distance, 100, 20036, 0.01600, 0.01900, true);
                this.landed = true;
                if (this.delta > 1) {
                    this.delta = 1;
                    //this.landmark.show();
                }
            } else {

                setTimeout(() => {
                    this.landed = true;
                }, 100);
            }
        };

        this.fast_speed = () => {
            if (this.delta < 15 / percent) {
                this.delta += sketch.map(this.distance, 100, 20036, 0.00095, 0.00225, true);
            } else if (this.delta < 30 / percent) {
                // create the landmark when the attack is on 30%
                this.landmark = new Landmark(this.dst_coords[0], this.dst_coords[1], this.size, this.color);
                this.delta += sketch.map(this.distance, 100, 20036, 0.00225, 0.00420, true);
            } else if (this.delta < 45 / percent) {
                this.delta += sketch.map(this.distance, 100, 20036, 0.00620, 0.00820, true);
            } else if (this.delta < 60 / percent) {
                this.delta += sketch.map(this.distance, 100, 20036, 0.00920, 0.015, true);
            } else if (this.delta < 85 / percent) {
                this.delta += sketch.map(this.distance, 100, 20036, 0.015, 0.0350, true);
            } else if (this.delta <= 99 / percent) {
                this.delta += sketch.map(this.distance, 100, 20036, 0.006, 0.009, true);
            } else {
                this.delta = 1;
            }
        };

        this.best_speed = () => {

            if (this.delta < 15 / percent) {
                this.delta += globals.sketch.map(this.distance, 100, 20036, 0.01800, 0.02120, true);
                if (this.landmark) this.landmark.preshow();
            } else if (this.delta < 30 / percent) {
                this.delta += globals.sketch.map(this.distance, 100, 20036, 0.02220, 0.02620, true);
                if (this.landmark) this.landmark.preshow();
            } else if (this.delta < 45 / percent) {
                this.delta += globals.sketch.map(this.distance, 100, 20036, 0.02620, 0.02820, true);
                if (this.landmark) this.landmark.preshow();
            } else if (this.delta < 60 / percent) {
                this.delta += globals.sketch.map(this.distance, 100, 20036, 0.02820, 0.03020, true);
                if (this.landmark) this.landmark.preshow();
            } else if (this.delta < 75 / percent) {
                this.delta += globals.sketch.map(this.distance, 100, 20036, 0.03020, 0.03420, true);
                if (this.landmark) this.landmark.preshow();
            } else if (this.delta < 100 / percent) {
                this.delta += globals.sketch.map(this.distance, 100, 20036, 0.02600, 0.02900, true);
                if (this.landmark) this.landmark.preshow();
                if (this.delta > 1 ) this.delta = 1;
            } else {
                /* due to some bugs with the equality of possition and destination vectors this
                *  else statement is necessary to prevent some attacks from not ending.
                */
                this.landed = true;
                // setTimeout(() => {
                //     this.landed = true;
                // }, 50);
            }
        };

        //this.fast_speed();
        //this.slow_speed();
        this.best_speed();

    }

    display() {
        // origin landmark for better visual
        //const temp = globals.mappa.latLngToPixel(...this.src_coords);
        //globals.sketch.noFill();
        //globals.sketch.stroke(this.color);
        //globals.sketch.strokeWeight(2);
        //globals.sketch.ellipse(temp.x, temp.y, 3, 3);


        globals.sketch.push();
        const temp_pixel = globals.mappa.latLngToPixel(...this.dst_coords);
        let angle = globals.sketch.atan2(
            temp_pixel.y - this.position.y,
            temp_pixel.x - this.position.x
        );
        // this.showTrail();
        globals.sketch.translate(this.position.x, this.position.y);
        globals.sketch.strokeWeight(1);
        // globals.sketch.noStroke();
        globals.sketch.fill(globals.sketch.color(this.color));
        globals.sketch.rotate(angle);
        globals.sketch.ellipse(0, 0, this.size, 2);
        globals.sketch.pop();

        globals.sketch.strokeWeight(2);
        globals.sketch.noFill();
        globals.sketch.stroke(this.color);
        globals.sketch.beginShape();
        for (let i = 0; i < this.trail.length; i++) {
            let pos = this.trail[i];
            // globals.sketch.curveVertex(pos.x, pos.y);
            globals.sketch.vertex(pos.x, pos.y);
        }
        globals.sketch.endShape();

        // testing parallel lines
        /*                sketch.strokeWeight(2);
                        sketch.noFill();
                        sketch.stroke(this.color);
                        sketch.beginShape();
                        const to_be = this.original.distance/100;
                        for (let i = 0; i < this.trail.length; i++) {
                            let pos = this.trail[i];

                            let increase = 0;
                            this.temp_pixel = map.latLngToPixel(...this.dst_coords);
                            const pos_dist = sketch.dist(this.position.x, this.position.y, this.temp_pixel.x, this.temp_pixel.y);
                            if (pos_dist  > to_be * 80){
                                increase = sketch.map(pos_dist, to_be * 80, this.original.distance, 5 , 15);
                            } else if (pos_dist  > to_be * 60){
                                increase = sketch.map(pos_dist, to_be * 60, this.original.distance, 16 , 25);
                            } else if (pos_dist  > to_be * 40){
                                increase = sketch.map(pos_dist, to_be * 40, this.original.distance, 16 , 25);
                            } else if (pos_dist  > to_be * 20){
                                increase = sketch.map(pos_dist, to_be * 20, this.original.distance, 8 , 14);
                            }
                            sketch.curveVertex(pos.x, pos.y + increase);
                        }
                        sketch.endShape();*/

    }

    isLanded() {
        return this.landed;
    }

    explode() {
        const meteor_outline = "#ffffff";
        const total = 11;
        // Explossion
        for (let e = total; e > 1; e--) {
            globals.sketch.fill(
                globals.sketch.lerpColor(
                    globals.sketch.color(this.color),
                    globals.sketch.color(meteor_outline),
                    e / total
                )
            );
            globals.sketch.ellipse(this.position.x, this.position.y, this.size + e, this.size + e);
        }
    }

    // region unused
    showTrail() {
        const tail = this.trail.length;
        for (let i = tail - 1; i >= 0; i--) {
            let current_tail = this.trail[i];
            let color = sketch.color(this.color);
            color.setAlpha(sketch.map(i, 0, tail, 10, 70, true));
            sketch.noStroke();
            sketch.fill(color);
            sketch.ellipse(current_tail.x, current_tail.y, this.size, this.size);
        }
    }

    // endregion

    /* region Getters & Setters */
    get origin() {
        return this._origin;
    }

    set origin(value) {
        if (value.hasOwnProperty("x")) {
            this._origin = globals.sketch.createVector(value.x, value.y);
        } else {
            this._origin = globals.sketch.createVector(value[0], value[1]);
        }
    }

    get destination() {
        return this._destination;
    }

    set destination(value) {
        if (value.hasOwnProperty("x")) {
            this._destination = globals.sketch.createVector(value.x, value.y);
        } else if (Array.isArray(value)) {
            this._destination = globals.sketch.createVector(value[0], value[1]);
        }
    }

    get size() {
        return this._size;
    }

    set size(value) {
        // TODO: remove this sketch map to an actual value (in the constructor)
        this._size = globals.sketch.map(value, 1, 100, 3, 25);
    }

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
    }

    /* endregion */

};
