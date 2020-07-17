import _ from "lodash";
import {each, forEachOf} from "async";
import {select, selectAll} from "d3";
import globals from "../globals";
import Attack from "./attack";
import Landmark from "./landmark";
// import remove from "just-remove";

const debug = false;


export default class AttacksSystem {

    constructor() {
        this.attacks = [];
        this.landMarks = [];
        this.blockFlow = false; // flag that handles new attacks flow
        this.socket = null; // the websocket to the server
        this.socketConnected = false; // flag
        this.max_attacks = 100;
    }

    message_parser(message) {
        // required keys
        let found_keys = {
            "protocol": false,
            "src": false,
            "dst": false,
        }

        let data = JSON.parse(
            message.data,
            function (key, value) {
                if (key === "protocol" || key === "type") {
                    found_keys.protocol = true;
                } else if (key === "src") {
                    if (value.latitude !== undefined && value.longitude !== undefined) {
                        found_keys.src = true;
                    } else {
                        throw "Missing src latitude longitude values";
                    }

                } else if (key === "dst") {
                    if (value.latitude !== undefined && value.longitude !== undefined) {
                        found_keys.dst = true;
                    } else {
                        throw "Missing dst latitude longitude values";
                    }
                }
                return value;
            }
        );

        for (const required_key in found_keys) {
            if (required_key === false) {
                throw "Mandatory " + required_key + " is missing from the data";
            }
        }
        return data;
    }

    connectToServer() {

        this.previous_stats = null;

        let source = new EventSource(
            !debug ?
                "/events" :
                "http://dev01-vm.csd.uoc.gr:8080/events"
        );

        source.onmessage = (message) => {
            let data = this.message_parser(message);


            const origin = [data.src.latitude, data.src.longitude];
            const destination = [data.dst.latitude, data.dst.longitude];
            // const attack_type = globals.attack_types[Math.floor(Math.random() * globals.attack_types.length)];
            const attack_type = data.protocol;

            const new_attack = new Attack(origin, destination, attack_type);

            this.addAttack(new_attack);
            if (globals.map.loggingTableVisible) {
                globals.map.logEvent(
                    data.protocol,
                    data.dst.country
                );
            }
        };

        source.addEventListener("stats", (e) => {
            let data = JSON.parse(e.data);
            //console.log(data);
            if (globals.map.chart) {
                forEachOf(data.types, (attack_total, attack_type, callback) => {
                    for (const [key, value] of Object.entries(globals.map.chart.data.datasets)) {
                        if (value.label === attack_type) {
                            // append the new data to the existing chart data
                            globals.map.chart.data.datasets[key].data.push({
                                x: Date.now(),
                                y: (attack_total - (
                                    this.previous_stats ?
                                        this.previous_stats.types[attack_type] : attack_total
                                )) * (Math.random() < 0.5 ? 13 : 14)
                            });
                            break;
                        }
                    }
                    callback();
                }, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
                // update chart datasets keeping the current animation
                globals.map.chart.update({
                    preservation: true
                });

                // don't update if the user has collapsed a country to view stats


                let categories = {
                    overall: {
                        attribute: "countries",
                        elem_id: "most_overall"
                    },
                    infectious: {
                        attribute: "top_outgoing",
                        elem_id: "most_infectious"
                    },
                    infected: {
                        attribute: "top_incoming",
                        elem_id: "most_infected"
                    }
                }

                for (const [name, options] of Object.entries(categories)) {

                    if (this[name + "_collapsed"]) continue;


                    $("#" + options.elem_id).empty();

                    let top_five_counter = 0;
                    for (const [country, obj] of Object.entries(data[options.attribute])) {

                        let collapse_id = '_' + Math.random().toString(36).substr(2, 9);
                        if (country === "TOTAL") continue;

                        top_five_counter++;
                        if (top_five_counter > 5) break;
                        let new_card = $(`
                            <div class="card bg-transparent">
                                <a class="card-header button three" data-toggle="collapse" href="#collapse${collapse_id}" aria-expanded="false">
                                        <div class="row">
                                            <div class="col-9">
                                              <span class="most_rank">${top_five_counter}.</span>
                                              <span class="most_name">${country}</span>
                                            </div>
                                            <div class="col-3 most_total">
                                              ${obj["TOTAL"]}
                                            </div>
                                        </div>
                                </a>
                            
                                <div id="collapse${collapse_id}" class="collapse" data-parent="#${options.elem_id}">
                                  <div class="card-body">
                                        ${name !== "overall" 
                                        ? `<div class="d-flex flex-column mb-3">${Object.entries(obj).map(([k, v], i) => `
                                            ${k !== "TOTAL" 
                                                ? `<div class=" row">
                                                    <div class="col-9 most_attack_type">
                                                        ${k}
                                                    </div>
                                                    <div class="col-3 most_attack_type_total">
                                                      ${v}
                                                    </div>
                                                </div>` 
                                                : ''
                                            }
                                        `).join('')}</div>`
                                        : `<div class="d-flex flex-row mb-3">${Object.entries(obj).map(([k, v], i) => `
                                            ${k !== "TOTAL"
                                                ? `
                                                    <div class="col-6">
                                                        <h4 class="text-center">${k}</h4>
                                                        ${Object.entries(v).map(([key, value], i) => `
                                                            ${key !== "TOTAL"
                                                                ? `<div class=" row">
                                                                                <div class="col-9 most_attack_type">
                                                                                    ${key}
                                                                                </div>
                                                                                <div class="col-3 most_attack_type_total">
                                                                                  ${value}
                                                                                </div>
                                                                            </div>`
                                                                : ''
                                                            }
                                                        `).join('')}
                                                    </div>
                                                   `
                                                : ''
                                            }
                                        `).join('')}</div>`
                                        }
                                    
                                  </div>
                                </div>
                            </div>
                        `);
                        new_card.appendTo("#" + options.elem_id);
                        // .show({duration: "fast", easing: "swing"});
                        $(".bootbox").getNiceScroll().resize();
                    }

                    $(".accordion .card-header").on("click", () => {


                        $(".accordion").one("show.bs.collapse", function () {
                            if ($(this).attr('id') === "most_infectious") {
                                globals.map.attacks_system.infectious_collapsed = true;
                            } else if ($(this).attr('id') === "most_infected") {
                                globals.map.attacks_system.infected_collapsed = true;
                            } else if ($(this).attr('id') === "most_overall") {
                                globals.map.attacks_system.overall_collapsed = true;
                            }
                            $(".bootbox").getNiceScroll().resize();
                        }).one("hidden.bs.collapse", function () {
                            if ($(this).attr('id') === "most_infectious") {
                                globals.map.attacks_system.infectious_collapsed = false;
                            } else if ($(this).attr('id') === "most_infected") {
                                globals.map.attacks_system.infected_collapsed = false;
                            } else if ($(this).attr('id') === "most_overall") {
                                globals.map.attacks_system.overall_collapsed = false;
                            }
                            $(".bootbox").getNiceScroll().resize();
                        });
                    });

                }

            }

            // update previous data
            this.previous_stats = data;

        });

        let reconnect_attempts = 0;
        source.onerror = (e) => {
            switch (e.target.readyState) {

                case EventSource.CONNECTING:
                    reconnect_attempts++;
                    console.log(`
                        Reconnecting
                        try ${reconnect_attempts}
                    ...
                        `);
                    if (reconnect_attempts === 5) {
                        console.log("Max reconnect attempts were issued. Refresh your browser to try again.");
                        source.close()
                    }
                    break;

                case EventSource.CLOSED:
                    console.log('Connection failed, will not reconnect');
                    break;

            }
        };

    }

    createSocket() {
        const wsURL = `
                        ws://${window.location.host}${window.location.pathname}/websocket`;
        this.socket = new WebSocket(wsURL);

        // Show a connected message when the WebSocket is opened.
        this.socket.onopen = function (event) {
            this.socketConnected = true;
            console.log('[Socket open] Connected to Map Server');
        };

        // Show a disconnected message when the WebSocket is closed.
        this.socket.onclose = function (event) {
            this.socketConnected = false;
            if (event.wasClean) {
                console.log("[Socket close] Connection closed cleanly.");
            } else {
                // e.g. server process killed or network down. event.code is usually 1006 in this case
                console.log(`[Socket close] Connection died with code ${event.code} reason ${event.reason}`);
            }
        };

        // Handle any errors that occur.
        this.socket.onerror = function (error) {
            this.socketConnected = false;
            console.log(`[Socket error] Connection Error: ${error.message}`);
        };

        // Handle messages sent by the server.
        this.socket.onmessage = function (event) {
            let payload = JSON.parse(event.data);
            // create new attack from here
            console.log(payload);
        };

    }

    addAttack(attack) {
        // only add attack if incoming flow is allowed
        if (!this.blockFlow) {
            // keep a queue
            if (this.attacks.length < this.max_attacks) {
                this.attacks.push(attack);
            }
        }
    }

    removeAttack(attack) {
        this.attacks = _.remove(this.attacks, function (element) {
            return element !== attack;
        });
    }

    addLandmark(landmark) {

        //if (!this.landmark_occupied(landmark)) {
        this.landMarks.push(landmark);
        //}

    }

    removeLandmark(landedAttack) {
        this.landMarks = _.remove(this.landMarks, function (element) {
            return element !== landedAttack;
        });
    }

    showLandmarks() {
        if (!this.blockFlow) {
            each(this.landMarks, landmark => {
                landmark.show();
            }, function (err) {
                if (err) console.error(err);
            });
        }
    }

    destroyTheEarth() {
        if (!this.blockFlow) {
            /*this.attacks.forEach((attack) => {
                attack.run();
                if (attack.isLanded()) {
                    this.addLandmark(
                        new Landmark(attack.dst_coords[0], attack.dst_coords[1], attack.size)
                    );
                    this.removeAttack(attack);
                    // reveal attacked country
                    selectAll("path")
                        .dispatch("attack-landed", {
                            // detail keyword MUST NOT be changed or this dispatch call won't work
                            detail: {
                                attack: attack
                            }
                        });
                }
            });*/
            //console.log(this.attacks.length);
            // with async for faster render
            each(this.attacks, (attack, callback) => {
                if (attack) {

                    if (!attack.launched) {
                        attack.launched = true;
                        selectAll("path")
                            .dispatch("attack-launched", {
                                // detail keyword MUST NOT be changed or this dispatch call won't work
                                detail: {
                                    attack: attack
                                }
                            });
                    }


                    attack.run();

                    if (attack.isLanded()) {
                        this.removeAttack(attack);
                        // reveal attacked country
                        selectAll("path")
                            .dispatch("attack-landed", {
                                // detail keyword MUST NOT be changed or this dispatch call won't work
                                detail: {
                                    attack: attack
                                }
                            });
                        // const landmark = attack.landmark;
                        const landmark = new Landmark(attack.dst_coords[0], attack.dst_coords[1], attack.size, attack.color);
                        this.addLandmark(landmark);
                        //landmark.show();
                        setTimeout(() => {
                            this.removeLandmark(landmark);
                        }, 1000);


                    }
                }
                callback();
            }, function (err) {
                if (err) console.error(err);
            });

        }

    }

    restartSystem() {
        this.attacks = [];
        this.landMarks = [];
    }

    blockIncoming() {
        this.attacks = [];
        this.blockFlow = true;
    }

    unblockIncoming() {
        this.blockFlow = false;
    }

    // for testing
    random_attack_gen(automatic = false) {
        // America: [40, -100]
        const origin = [globals.sketch.random(-40, 70), globals.sketch.random(-158, 150)];
        const destination = [globals.sketch.random(-40, 70), globals.sketch.random(-158, 150)];
        const attack_type = globals.attack_types[Math.floor(Math.random() * globals.attack_types.length)];

        const new_attack = new Attack(origin, destination, attack_type);

        // add the attack automatically to the system if arg provided
        if (automatic) this.addAttack(new_attack);

        return new_attack;
    }

    landmark_occupied(landmark) {
        return this.landMarks.some(item => {
            return item.lat === landmark.lat && item.lng === landmark.lng
        });
    }

}
