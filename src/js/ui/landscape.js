//region Imports
import {pointInPolygon} from 'geojson-utils';
import {select, selectAll, event, geoTransform, geoPath, json as d3json} from "d3";
import centroid from "@turf/centroid";
import distance from "@turf/distance";
import {point} from "@turf/helpers";
import globals from "../globals";
//endregion

import {each} from "async";
import _ from "lodash";

import PerfectScrollbar from 'perfect-scrollbar';
import ordinal from "ordinal";

import sizeof from "object-sizeof";

const sorter = (property) =>
    (a, b) => a.datum.properties[property].total === b.datum.properties[property].total
        ? 0
        : a.datum.properties[property].total > b.datum.properties[property].total
            ? -1
            : 1


export default class Landscape {
    selected_country = null;
    map_zoomed = false;
    header = new _Header();
    enable_shadows = false; // enabling it will impact performance

    low_severity_tracker = new _SeverityTracker("low", 700);
    medium_severity_tracker = new _SeverityTracker("medium", 1600);
    high_severity_tracker = new _SeverityTracker("high", Infinity);

    stats = new _CountryStats();

    refresh_stats() {
        if (this.zoom_controller.zoomed) {
            //update before animation to avoid delays
            this.stats.reset();
            this.stats.change_flag(this.zoom_controller.active_country.datum.properties.iso_a2);
            this.stats.change_header(this.header.current);

            this.stats.change_rank(
                this.get_country_rank(this.zoom_controller.active_country.object, "incoming"),
                "incoming"
            );

            this.stats.change_rank(
                this.get_country_rank(this.zoom_controller.active_country.object, "outgoing"),
                "outgoing"
            );


            const found_country = this.is_country_impacted(this.zoom_controller.active_country.object);
            this.stats.update_incoming(found_country, "attacks", "stats-incoming");

            const launched_country = this.is_country_launced(this.zoom_controller.active_country.object);
            this.stats.update_incoming(launched_country, "outgoing_attacks", "stats-outgoing");
            this.ps.update();
        }
    }


    constructor() {
        this.svg = select("#wrapper").append("svg");                 // Overlay svg on the map
        this.g = this.svg.append("g");                                      // Create a group for the svg

        this.projection = geoTransform({point: this.projectPoint});
        this.pathGenerator = geoPath().projection(this.projection);

        this.svg.on('click', () => {
            if (!select(event.target).classed('selected')) {
                this.reset_zoom();
            }
        });

        this.prepareShadowEffect();
        this.init_countries();

        this.ps = new PerfectScrollbar('#card-body', {
            wheelSpeed: 0.5,
            wheelPropagation: true,
            //minScrollbarLength: 20
            suppressScrollX: true,
        });

        this.incoming_rankings = [];
        this.outgoing_rankings = [];

        this.countries_launched = [];
        this.zoom_controller = new _ZoomController();


    }

    init_countries() {
        // d3json(this.countries_geojson_path).then((data) => {
        // TODO: decide which dynamic import to use for better load times
        /**
         * Unfortunately we cannot use a variable in dynamic import due to a bug in webpack.
         * https://github.com/webpack/webpack/issues/8377
         *
         * DO NOT DELETE THE FOLLOWING COMMENTS -> these are webpack's magic comments.
         * For more information:
         * */
        import(
            /* webpackChunkName: "countries-geojson" */
            "../../assets/custom.geojson"
            ).then((data) => {
                this.countries = this.g
                    .selectAll('path')
                    .data(data.features)
                    .enter()
                    .append('path')
                    .attr('class', 'country')
                    .on("click", (datum) => {
                        this.toggle_select_country(datum);
                    })
                    .on("mouseover", (datum) => {
                        this.header.update(datum.properties.name);
                        select(event.target).style("cursor", () => {
                            return this.map_zoomed ? "pointer" : "pointer";
                        });
                    })
                    .on("mouseout", () => {
                        this.header.keep_alive
                            ? this.header.refresh()
                            : this.header.reset();
                    })
                    .on("attack-launched", (datum) => {
                        const attack = event.detail.attack;
                        const coordinates = attack.src_coords;

                        // mapbox uses [lng,lat] but turf uses [lat, lng] that's why the reverse of the array
                        const p = point([coordinates[1], coordinates[0]]);

                        // only care for attacks that landed on the Landscape, not water
                        if (pointInPolygon(p.geometry, datum.geometry)) {

                            const launched_country = this.is_country_launced(event.target);
                            if (launched_country) {
                                launched_country.attack_launched(attack.type);
                            } else {
                                let new_country = new _LauncherCountry(event.target, datum);
                                new_country.attack_launched(attack.type);
                                this.countries_launched.push(new_country);
                                this.outgoing_rankings.push(new_country);

                            }
                            this.update_rankings();
                            this.refresh_stats();

                            //this.rankings.push(new_country);
                            //this.update_rankings();

                        }

                    })
                    .on("attack-landed", (datum) => {
                        // gather data sent from dispatcher
                        const attack = event.detail.attack;
                        const coordinates = attack.dst_coords;

                        // mapbox uses [lng,lat] but turf uses [lat, lng] that's why the reverse of the array
                        const p = point([coordinates[1], coordinates[0]]);

                        // only care for attacks that landed on the Landscape, not water
                        if (pointInPolygon(p.geometry, datum.geometry)) {
                            // update highlighted countries (HTML element level 'SVG<element>')
                            const found_country = this.is_country_impacted(event.target);

                            if (found_country) {
                                // country is already attacked
                                let tracker_index = this.low_severity_tracker.includes(found_country) ?
                                    1 : (this.medium_severity_tracker.includes(found_country) ? 2 : 3)
                                let responsible_tracker = this.map_trackers(tracker_index);

                                found_country.attack_landed(attack.type);
                                if (
                                    found_country.current_severity === "low" &&
                                    found_country.total_attacks() >= this.low_severity_tracker.ceil
                                ) {
                                    _.remove(this.low_severity_tracker, function (country) {
                                            return country === found_country;
                                        }
                                    );
                                    found_country.upgrade_severity("medium");
                                    this.medium_severity_tracker.push(found_country);
                                    responsible_tracker = this.medium_severity_tracker;
                                } else if (
                                    found_country.current_severity === "medium" &&
                                    found_country.total_attacks() >= this.medium_severity_tracker.ceil
                                ) {
                                    _.remove(this.medium_severity_tracker, function (country) {
                                            return country === found_country;
                                        }
                                    );
                                    found_country.upgrade_severity("high");
                                    this.high_severity_tracker.push(found_country);
                                    responsible_tracker = this.high_severity_tracker;
                                }
                                // else if (found_country.current_severity === "high") {
                                //     responsible_tracker = this.high_severity_tracker;
                                // }

                                // highlight the country only if the map is zoomed-out and the tracker allows highlights
                                if (!this.map_zoomed && responsible_tracker.isActive) {
                                    found_country.highlight();
                                }
                            } else {
                                let new_country = new _ImpactedCountry(event.target, datum);
                                new_country.attack_landed(attack.type);
                                this.low_severity_tracker.push(new_country);

                                //every new country is added to the rankings (no matter what SeverityTracker it belongs)
                                this.incoming_rankings.push(new_country);

                                if (!this.map_zoomed && this.low_severity_tracker.isActive) {
                                    new_country.highlight();
                                }
                            }

                            this.update_rankings();
                            this.refresh_stats();
                        }
                    })
                    .attr("d", this.pathGenerator)
                    .style("filter", () => {
                        return this.enable_shadows ? "url(#drop-shadow)" : null;
                    })
                ;

                globals.map.mapboxMap.on("move", () => this.countries.attr("d", this.pathGenerator));
                globals.map.mapboxMap.on("resize", () => this.countries.attr("d", this.pathGenerator));
            }
        );

        // });
    }

    toggle_select_country(datum) {
        // get the current state of the clicked country
        let isSelected = select(event.target).classed('selected');

        if (!isSelected) {
            /*
            * Check if flyTo will be animated from another country (this.selected_country exists)
            * and adjust animations settings accordingly
            */
            if (this.zoom_controller.zoomed) {
                // unselect previous selected country
                this.zoom_controller.unselect_active_country();
                this.zoom_controller.update_active_country(datum, event.target);
                this.zoom_controller.from_country();
            } else {
                this.zoom_controller.update_active_country(datum, event.target);
                this.zoom_controller.from_space();
                // reveal country's information of attacks (only if not already visible)
                let card = $("#country-stats");
                card.css("visibility", "visible");
                card.addClass("animated fadeIn").one("animationend", () => {
                    card.removeClass("animated fadeIn");
                });
            }

            this.zoom_controller.select_active_country();
            this.zoom_controller.perform_zoom();
            globals.map.mapboxMap.once('moveend', () => {
                // hack to determine when flyTo ends
                globals.attacks_system.unblockIncoming();
            });


            this.header.keep_alive = true;
            this.header.update(datum.properties.name, true);
            this.svg.style("cursor", "zoom-out");

            // unhighlight all countries for as long a country is selected
            this.unhighlightAll();

            this.refresh_stats();

        } else {
            this.reset_zoom();
        }
    }


    reset_zoom(force = false) {
        const current_center = globals.map.mapboxMap.getCenter();
        const current_zoom = globals.map.mapboxMap.getZoom();

        // only take effect when the map is not in its initial state (or forced)
        if (this.zoom_controller.zoomed || force) {

            if (!force) {
                let card = $("#country-stats");
                card.css("visibility", "hidden");
                card.addClass("animated fadeOut fast").one("animationend", () => {
                    card.removeClass("animated fadeOut fast");
                });
            }


            this.zoom_controller.unselect_active_country();
            this.zoom_controller.zoomed = false;
            this.zoom_controller.active_country = null;

            this.header.keep_alive = false;
            this.header.reset();
            this.svg.style("cursor", ""); // reset pointer

            globals.map.mapboxMap.fitBounds(globals.map.initial.worldBounds, {
                // center: globals.map.initial.center,
                speed: 0.87,
                // curve: 1.42,
            });
            // hack to determine when flyTo ends
            globals.map.mapboxMap.once('moveend', () => {
                // attacks_system.unblockIncoming();
                // sketch.loop();
                this.highlightOnlyToggled();
                globals.map.attacks_system.max_attacks = 100;
                $("#country-stats").css("visibility", "hidden");
            });

            //reset stats positions
            let target = $('#country-stats').get(0);
            /*translate the element */
            target.style.webkitTransform = target.style.transform = 'translate(' + 0 + 'px, ' + 0 + 'px)';

            /* update the position attributes */
            target.setAttribute('data-x', 0);
            target.setAttribute('data-y', 0);

        }
    }


    unhighlightAll() {
        this.low_severity_tracker.unhighlightAll();
        this.medium_severity_tracker.unhighlightAll();
        this.high_severity_tracker.unhighlightAll();
    }

    highlightAll() {
        this.low_severity_tracker.highlightAll();
        this.medium_severity_tracker.highlightAll();
        this.high_severity_tracker.highlightAll();

        // const styles = [
        //     'low',
        //     'medium',
        //     'high'
        // ];
        //
        // // previous_highlighted_countries.addClass("highlight");
        // selectAll(this.highlighted_countries)
        //     .classed("highlight", true)
        //     .attr("class", function (datum) {
        //
        //
        //         // before setting a new class, remove all previous ones
        //         styles.forEach((style) => {
        //             if (select(this).classed(style)) {
        //                 select(this).classed(style, false);
        //             }
        //         });
        //
        //
        //         return select(this).attr("class") + " " + styles[
        //             Math.floor(
        //                 globals.sketch.map(datum.properties.attacks.total, 1, 3, 0, 2, true)
        //             )];
        //     })
    }

    highlightOnlyToggled() {
        this.low_severity_tracker.clicked ? this.low_severity_tracker.highlightAll() : null;
        this.medium_severity_tracker.clicked ? this.medium_severity_tracker.highlightAll() : null;
        this.high_severity_tracker.clicked ? this.high_severity_tracker.highlightAll() : null;
    }

    highlight(which_severity) {
        if (!this.map_zoomed) {
            if (which_severity === "low") {
                this.low_severity_tracker.highlightAll();
                this.low_severity_tracker.clicked = true;
            } else if (which_severity === "medium") {
                this.medium_severity_tracker.highlightAll();
                this.medium_severity_tracker.clicked = true;
            } else if (which_severity === "high") {
                this.high_severity_tracker.highlightAll();
                this.high_severity_tracker.clicked = true;
            }
        }
    }

    unhighlight(which_severity) {
        if (which_severity === "low") {
            this.low_severity_tracker.unhighlightAll();
            this.low_severity_tracker.clicked = false;
        } else if (which_severity === "medium") {
            this.medium_severity_tracker.unhighlightAll();
            this.medium_severity_tracker.clicked = false;
        } else if (which_severity === "high") {
            this.high_severity_tracker.unhighlightAll();
            this.high_severity_tracker.clicked = false;
        }

    }

    visibilities() {
        return {
            "low": !this.map_zoomed ? this.low_severity_tracker.isActive : null,
            "medium": !this.map_zoomed ? this.medium_severity_tracker.isActive : null,
            "high": !this.map_zoomed ? this.high_severity_tracker.isActive : null
        }
    }

    projectPoint(lon, lat) {
        let point = globals.map.mapboxMap.project(new mapboxgl.LngLat(lon, lat));
        this.stream.point(point.x, point.y);  // only for Mapbox
    }

    prepareShadowEffect() {
        let defs = this.svg.append("defs"); // filters go in defs element
        // height=130% so that the shadow is not clipped
        let filter = defs.append("filter")
            .attr("id", "drop-shadow")
            .attr("height", "130%");

        function shadow_1() {
            filter.append("feGaussianBlur")
                .attr("in", "offsetBlur")
                .attr("stdDeviation", 5)
                .attr("result", "blur");
            filter.append("feOffset")
                .attr("in", "SourceAlpha")
                .attr("dx", 3)
                .attr("dy", 5)
                .attr("result", "offsetBlur");

            let feMerge = filter.append("feMerge");
            feMerge.append("feMergeNode")
                .attr("in", "offsetBlur")
            feMerge.append("feMergeNode")
                .attr("in", "SourceGraphic");
        }

        function shadow_2() {
            let feDropShadow = filter.append("feDropShadow");
            feDropShadow.attr("dx", "0.2").attr("dy", "0.4")
                .attr("stdDeviation", "0.2");
        }

        shadow_1();
        // shadow_2();
    }

    map_trackers(index) {
        if (index === 1) return this.low_severity_tracker;
        else if (index === 2) return this.medium_severity_tracker;
        else if (index === 3) return this.high_severity_tracker;
        else throw new Error(`We have only 3 trackers at the moment.Invalid mapping index ${index}`);
    }

    is_country_impacted(country_html_element) {
        return this.low_severity_tracker.find(element => element.html_element === country_html_element) ||
            this.medium_severity_tracker.find(element => element.html_element === country_html_element) ||
            this.high_severity_tracker.find(element => element.html_element === country_html_element);
    }

    is_country_launced(country_html_element) {
        return this.countries_launched.find(element => element.html_element === country_html_element);
    }

    update_rankings() {

        // first sort the arrays ( NO NEED AFTER ALL)
        //this.low_severity_tracker.sort(sorter());
        //this.medium_severity_tracker.sort(sorter());
        //this.high_severity_tracker.sort(sorter());

        //console.log("Low severity tracker " + this.low_severity_tracker.pprint());
        //console.log("Medium severity tracker " + this.medium_severity_tracker.pprint());
        //console.log("High severity tracker " + this.high_severity_tracker.pprint());

        this.incoming_rankings.sort(sorter("attacks"));
        this.outgoing_rankings.sort(sorter("outgoing_attacks"));
    }

    get_country_rank(country_html_element, direction) {
        let array = [];
        if (direction === "incoming") {
            array = this.incoming_rankings;
        } else {
            array = this.outgoing_rankings;
        }

        let rank = array.findIndex(element => element.html_element === country_html_element);
        if (rank === -1) return rank;
        return rank + 1; // to avoid ranking 0
    }

    destructor() {
        $("#wrapper svg").remove();
    }

}


class _ActiveCountry {

    constructor(datum, object) {
        this.datum = datum;
        this.object = object;
        this.center = centroid(this.datum);
    }


}

class _ZoomController {


    constructor() {
        this.zoomed = false;
        this.active_country = null;

        // zoom settings
        this.zoom = null;
        this.speed = null;
        this.curve = null;
    }

    update_active_country(datum, object) {
        this.active_country = new _ActiveCountry(datum, object);
    }

    determine_zoom_level() {
        let resolution = window.screen.width * window.devicePixelRatio * window.screen.height * window.devicePixelRatio;
        this.zoom = globals.sketch.map(resolution, 786_432, 3_686_400, 2.0, 3.2, true);

    }

    from_country() {
        const current_distance = distance(
            this.previous_country.center,
            this.active_country.center,
            {
                units: "kilometres"
            }
        );
        const max_distance = 12756; // in kilometres
        const min_distance = 100; //       --

        // zoom settings
        this.determine_zoom_level();
        this.speed = globals.sketch.map(current_distance, min_distance, max_distance, 0.1, 0.5, true);
        this.curve = globals.sketch.map(current_distance, min_distance, max_distance, 0.9, 1.14, true);

    }

    from_space() {
        // zoom settings
        this.determine_zoom_level();
        this.speed = 0.9;
        this.curve = 0.6;
    }

    perform_zoom() {
        // perform the map animation to selected country
        globals.map.mapboxMap.flyTo({
            center: this.active_country.center.geometry.coordinates,
            zoom: this.zoom,
            speed: this.speed,
            curve: this.curve,
        });
        this.zoomed = true;
    }

    unselect_active_country() {
        if (this.active_country) {
            select(this.active_country.object).classed("selected", false);
            this.previous_country = this.active_country;
        }
    }

    select_active_country() {
        if (this.active_country)
            select(this.active_country.object).classed("selected", true);
    }


}


class _Header {
    _initial = ""; // read-only
    _current = "Cyber Threat Map";
    _keep_alive = false;

    //region Methods
    update(name, force = false) {
        // update current value only if necessary or forced
        if (!this.keep_alive || force)
            this.current = name;
        // display updated header's name
        $("#selected-country-name").text(name);
    }

    refresh() {
        $("#selected-country-name").text(this.current);
    }

    reset() {
        $("#selected-country-name").text(this.initial);
    }

    //endregion

    //region Getters && Setters
    get initial() {
        return this._initial;
    }

    get keep_alive() {
        return this._keep_alive;
    }

    set keep_alive(value) {
        this._keep_alive = value;
    }

    get current() {
        return this._current;
    }

    set current(value) {
        this._current = value;
    }

    //endregion


}

class _SeverityTracker extends Array {

    constructor(severity, ceil, ...items) {
        super(...items);
        this.severity = severity;
        this.ceil = ceil;
        this.isActive = true;
        this.clicked = true;
    }

    push(...items) {
        items.forEach((item) => {
            //console.log(`[TRACKER][${this.severity.toLowerCase()}-severity]: added ${item}`);
            item.upgrade_severity(this.severity);
        });
        return super.push(...items);
    }

    highlightAll() {
        each(this, country => {
            country.highlight();
        });
        this.isActive = true;
    }

    unhighlightAll() {
        each(this, country => {
            country.unhighlight();
        });
        this.isActive = false;
    }


    pprint() {
        let to_string = "[";


        for (const element of this) {
            to_string += " " + element;
        }
        to_string += "]";
        return to_string;

    }

    toString() {

    }

}

class _ImpactedCountry {

    constructor(html_element, datum) {
        this.html_element = html_element;
        this.datum = datum;
        this.datum.properties.attacks = {
            total: 0
        };
        // initial severity value for impacted countries is always low
        this.current_severity = "";
    }

    highlight() {
        select(this.html_element)
            .classed("highlight", true)
            .classed(this.current_severity, true);
    }

    unhighlight() {
        select(this.html_element)
            .classed("highlight", false)
            .classed(this.current_severity, false);
    }

    upgrade_severity(severity) {
        // disable previous one
        select(this.html_element).classed(this.current_severity, false)
        this.current_severity = severity;
    }

    attack_landed(attack_type) {
        this.datum.properties.attacks.total += 1;
        if (this.datum.properties.attacks.hasOwnProperty(attack_type)) {
            this.datum.properties.attacks[attack_type] += 1;
        } else {
            this.datum.properties.attacks[attack_type] = 1;
        }
    }

    total_attacks() {
        return this.datum.properties.attacks.total;
    }

    get name() {
        this.datum.properties.name
    }

    toString() {
        return this.datum.properties.name + ": " + this.total_attacks();
    }

}

class _LauncherCountry {

    constructor(html_element, datum) {
        this.html_element = html_element;
        this.datum = datum;
        this.datum.properties.outgoing_attacks = {
            total: 0
        };
    }

    attack_launched(attack_type) {
        this.datum.properties.outgoing_attacks.total += 1;
        if (this.datum.properties.outgoing_attacks.hasOwnProperty(attack_type)) {
            this.datum.properties.outgoing_attacks[attack_type] += 1;
        } else {
            this.datum.properties.outgoing_attacks[attack_type] = 1;
        }
    }

    total_attacks() {
        return this.datum.properties.outgoing_attacks.total;
    }

}

class _CountryStats {

    constructor() {
        this.header_element = $("#country-stats-name");

        this.incoming_rank_element = $("#country-stats-ranking-incoming");
        this.outgoing_rank_element = $("#country-stats-ranking-outgoing");


        this.incoming_element = $("#stats-incoming");
        this.outgoing_element = $("#stats-outgoing");

        this.flag_img_element = $("#country-flag");
        this.flag_size = 32;

        this.active_country = null;

    }

    reset() {
        this.incoming_element.empty();
        this.outgoing_element.empty();
    }

    change_flag(iso_a2_code) {
        this.flag_img_element.attr(
            "src", "https://www.countryflags.io/"
            + iso_a2_code +
            "/shiny/"
            + this.flag_size +
            ".png"
        );
    }

    change_header(country_name) {
        this.header_element.text(country_name);
    }

    change_rank(ordinal_num, direction) {
        let element;

        if (direction === "incoming") {
            element = this.incoming_rank_element;
        } else if (direction === "outgoing") {
            element = this.outgoing_rank_element;
        }

        if (ordinal_num === -1) {
            element.text(`NO ${direction.toUpperCase()} RANKING`);
        } else {
            element.text(ordinal(ordinal_num) + ` MOST ${direction.toUpperCase()} ATTACKS`);
        }

    }

    update_incoming(found_country, property, element_id) {
        $(`#${element_id} h3`).text(
            found_country ? found_country.total_attacks() + " Total attacks"
                : ` No ${element_id === "stats-incoming" ? 'incoming' : 'outgoing'} attacks yet.`
        );

        if (found_country) {

            let sortable = [];
            for (const attack_type in found_country.datum.properties[property]) {
                sortable.push([attack_type, found_country.datum.properties[property][attack_type]]);
            }

            sortable.sort(function (a, b) {
                return b[1] - a[1];
            });

            for (const attack of sortable) {

                if (attack[0] === "total") {
                    attack[0] = "TOTAL";
                }

                let $main_div = $("<div>", {"class": "d-flex"});

                let $div1 = $("<div>", {"class": "mr-auto"});
                $div1.html(
                    "<div class='" + attack[0] + "'>" + attack[0] + "</div>"
                );

                let $div2 = $("<div>", {"class": ""});
                $div2.html(
                    `<div class='${attack[0]}-total-attacks'>` + attack[1] + "</div>"
                );

                $main_div.append($div1).append($div2);

                $(`#${element_id}`).append($main_div);

            }
        }

    }

}
