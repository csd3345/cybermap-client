//region Imports
/* [section] Third-party modules */
import _ from "lodash";
import "datatables.net"; // TODO: test this instead
import {select} from "d3";
import tippy, {animateFill} from "tippy.js";
import {change as visibility_change, hidden} from "visibilityjs";
import Mappa from "mappa-mundi";
import bootbox from "bootbox";
import JsTabs from 'js-tabs';
import "jquery.nicescroll";

// import mapboxgl from "mapbox-gl";
// import("mapbox-gl-leaflet");

/* [section] CSS from Third-party modules */
import 'tippy.js/dist/tippy.css'; // tippy css
import 'tippy.js/dist/backdrop.css'; // - - -
import 'tippy.js/animations/scale.css'; // animations for tippy css
import 'tippy.js/animations/shift-away.css'; // - - -

import "loaders.css/loaders.min.css";


// import 'leaflet/dist/leaflet.css'; // leaflet css
// import 'mapbox-gl/dist/mapbox-gl.css'; // mapbox-gl css

/* [section] Custom modules */
import globals from "../globals";
import Attack from "../objects/attack";
import AttacksSystem from "../objects/attackSystem";
import Landscape from "./landscape";

//endregion

import logo_image from '../../img/logo-cybermap-transparent.png';
import made_with_python from '../../img/made-with-python.svg';

import interact from "interactjs";

import 'chartjs-plugin-streaming';

/*
known ports
AUTH
DNS
DoS
EMAIL
FTP
HTTP
HTTPS
ICMP
RDP
SFTP
SMB
SNMP
SQL
SSH
TELNET
WHOIS

16 total
*/

let previous = 0;

function dragMoveListener(event) {
    let target = event.target;
    /* keep the dragged position in the data-x/data-y attributes */
    let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    /*translate the element */
    target.style.webkitTransform =
        target.style.transform =
            'translate(' + x + 'px, ' + y + 'px)';

    /* update the position attributes */
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
}

export default class Map {
    settings = {
        mapbox_access_token: "pk.eyJ1IjoiajNkaSIsImEiOiJjazZjY3BrOHAwOW5iM2hvbWR2emlwYjRoIn0.PnJXfKMlMhFyhcilMzozUg",
        world_bounds_options: [],
    };

    constructor() {
        this.provider = "MapboxGL";
        this.initial = {
            center: {
                lng: 21.0,
                lat: 28.0
            },
            worldBounds: [
                [-158.0, -57.4], // Southwest coordinates
                [178.0, 78.5], // Northeast coordinates
            ],
            zoom: 0.96
        };
        this.dimensions = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        this.control_flags = {
            loaded: false,
            zoomed: false
        };

        this.canvas = globals.sketch.createCanvas(this.dimensions.width, this.dimensions.height).parent("map");

        this.mappa = new Mappa(
            this.provider,
            this.settings.mapbox_access_token
        ).tileMap({
            lng: this.initial.center.lng,
            lat: this.initial.center.lat,
            zoom: this.initial.zoom,
            attributionControl: false,
            style: "mapbox://styles/j3di/ck6u0lyv61cn11io6n8w5feh0",
            // style: `https://api.mapbox.com/styles/v1/{<OUR_USER_NAME_HERE>}/ck6u0lyv61cn11io6n8w5feh0/tiles/256/{z}/{x}/{y}?access_token=${<OUR_ACCESS_TOKEN_HERE>}`,
            // style: `https://api.tiles.mapbox.com/v4/ck6u0lyv61cn11io6n8w5feh0/{z}/{x}/{y}.png?access_token=${<OUR_ACCESS_TOKEN_HERE>}`,
        });

        globals.mappa = this.mappa;

        /* We let Mappa do its thing and then we proceed with the custom layout*/
        this.mappa.overlay(this.canvas, () => {
            console.log("[MAPPA]: overlay of mappa finished");
            this.mapboxMap = this.mappa.map;


            //remove attributions
            $(".mapboxgl-control-container").remove();
            // $('.mapboxgl-ctrl-bottom-left').remove();
            // $('.mapboxgl-ctrl-bottom-right').remove();

            // this.leafletMap.scrollZoom.disable();
            this.mapboxMap.boxZoom.disable();
            this.mapboxMap.dragRotate.disable();
            this.mapboxMap.dragPan.disable();
            this.mapboxMap.keyboard.disable();
            this.mapboxMap.doubleClickZoom.disable();
            this.mapboxMap.touchZoomRotate.disable();

            this.mapboxMap.fitBounds(this.initial.worldBounds);

            this.mapboxMap.on("load", () => {
                console.log("Initial map zoom " + this.mapboxMap.getZoom());
                this.control_flags.loaded = true;
                this.loggingTableVisible = false;

                this.landscape = new Landscape();
                this.initLogger();

                this.initAttacksSystem();

                this.initCogButton();
                this.initLegend();
                this.init_modal();
                this.init_statistics();

            });

        });

    }

    initLogger() {
        //window.alert(window.innerHeight);
        //window.alert(window.innerWidth);

        $("#console-log").html(
            "            <table id=\"events\" class=\"logs compact\">\n" +
            "                <thead>\n" +
            "                <tr>\n" +
            "                    <th>PROTOCOL</th>\n" +
            "                    <th>LOCATION</th>\n" +
            "                </tr>\n" +
            "                </thead>\n" +
            "            </table>"
        );
        this.loggingTable = $('#events').DataTable({
            searching: false,
            ordering: false,
            paging: false,
            info: false,
            language: {
                "emptyTable": "No events received. Waiting for connection with server."
            }
        });


        // Handle logger's animation end
        $(".logs-outer-container").addClass("animated fadeInRight delay-1s")
            .one("animationend", () => {
                $(".logs-outer-container").removeClass("fadeInRight delay-1s");
                setTimeout(() => {
                    this.loggingTableVisible = true;
                }, 2000);

            });


    }

    initAttacksSystem() {
        this.attacks_system = new AttacksSystem();

        globals.attacks_system = this.attacks_system;

        setTimeout(() => {
            this.attacks_system.connectToServer();
        }, 3000);

        visibility_change((e, state) => {
            console.log('Visibility change event', state);
            if (hidden()) {
                this.attacks_system.blockIncoming();
                globals.sketch.clear();
                globals.sketch.noLoop();
            } else {
                this.attacks_system.restartSystem();
                globals.sketch.loop();
                this.attacks_system.unblockIncoming();
            }

        });
    }

    initCogButton() {
        // handle top-left panel for info toggle
        let $div = $("<div>", {"class": "info-overlay hvr-icon-spin animated fadeInLeft delay-1s"});

        $div.on({
            animationend: function () {
                $(this).removeClass("animated fadeInLeft delay-1s").off("animationend");
            },
            click: () => {
                let logs = $(".logs-outer-container");
                let legend = $(".legend");

                let self = this;


                // imidiate call
                (
                    function (anime_in = "fadeInRight", anime_out = "fadeOut") {
                        if (logs.hasClass(anime_in)) {
                            logs.removeClass(anime_in).addClass(anime_out);
                        } else if (logs.hasClass(anime_out)) {
                            logs.removeClass(anime_out).addClass(anime_in);
                        } else {
                            // This is the starting point because the element has not been toggled yet.
                            // We assume that 'anime_out' happens on the first click.
                            logs.addClass(anime_out);
                        }
                    }
                )();

                (
                    function (anime_in = "fadeInRight", anime_out = "fadeOut") {
                        if (legend.hasClass(anime_in)) {
                            legend.removeClass(anime_in).addClass(anime_out);
                        } else if (legend.hasClass(anime_out)) {
                            legend.removeClass(anime_out).addClass(anime_in);
                        } else {
                            // This is the starting point because the element has not been toggled yet.
                            // We assume that 'anime_out' happens on the first click.
                            legend.addClass(anime_out);
                        }
                    }
                )();

            }
        });

        $div.append($("<i>", {"class": "fas fa-cog hvr-icon"}));

        tippy($div.get(0), {
            // default
            placement: 'bottom',
            content: 'Toggle Information Boxes Visibility',
            animateFill: true,
            plugins: [animateFill],
            duration: 800,
            arrow: true
        });
        $("body").append($div);

    }

    initLegend() {
        // handle left panel for information
        const severities = ['low', 'medium', 'high'];

        let elem = document.createElement('div');
        $(elem).addClass("legend d-flex flex-column animated");
        $("body").append(elem);

        _.each(severities, (severity, idx) => {
            let div = document.createElement("div");
            $(div).addClass(`icon-layer animated fadeInLeft delay-${idx + 1}s`)
                .html(`<i class="fas fa-circle ${severity} mr-2 hvr-bounce-in"/>
                       <div class="d-inline-block hvr-grow mb-1">${severity.charAt(0).toUpperCase() + severity.slice(1)} Severity</div>`
                );
            $(elem).append(div);

            tippy(div, {
                // default
                placement: 'right',
                content: `Toggle ${severity.charAt(0).toUpperCase() + severity.slice(1)} Visibility`,
                animateFill: true,
                plugins: [animateFill],
                duration: 800,
                arrow: true,
                hideOnClick: false,
            });


            // click handler for Landscape belonging to each severity accordingly
            $(div).on("click", () => {
                const visibilities = this.landscape.visibilities();
                if (visibilities[severity] === true) {
                    this.landscape.unhighlight(severity);
                    $(div).fadeTo("slow", 0.5);
                } else if (visibilities[severity] === false) {
                    this.landscape.highlight(severity);
                    $(div).fadeTo("slow", 1);
                } else {
                    // if null is returned do nothing
                }
            });

        });
    }

    init_modal() {

        let $div = $("<div>", {"class": "animated modal-button animated fadeInRight delay-1s mt-3"});
        $div.append($("<i>", {"class": "fas fa-info-circle modal-button-icon hvr-grow"}));

        $div.on({
            animationend: function () {
                $(this).removeClass("animated fadeInLeft delay-1s").off("animationend");
            },
            click: () => {

                let markup = `
                    <!-- MADE WITH PYTHON BADGE  -->
                    <div align="center">
                        <a href="https://www.python.org/"> 
<!--                            <img src="http://ForTheBadge.com/images/badges/made-with-python.svg" alt="made-with-python-badge">-->
                            <img src=${made_with_python} alt="made-with-python-badge">
                        </a>
                    </div>
                    <!-- PROJECT LOGO -->
                    <br />
                    <div align="center">
<!--                        <a href="https://gitlab.com/j3di/cyber-threat-map">-->
<!--                                <img src="https://i.ibb.co/1vVcPpj/logo-cybermap-transparent.png" alt="logo-cybermap-transparent" draggable="false">-->
                                <img src=${logo_image} alt="logo-cybermap-transparent" draggable="false">
<!--                          <img src="https://i.ibb.co/7gGQcsB/cybermap-logo-transparent.png" alt="cybermap-logo-transparent">-->
<!--                        </a>-->
                    </div>
                    `;

                let message = `
                      <nav class="js-tabs__nav mb-4"> 
                        <ul class="js-tabs__tabs-container"> 
                          <li class="js-tabs__tab active">About</li> 
                          <li class="js-tabs__tab">Severity Levels</li> 
                          <li class="js-tabs__tab">Attack Types</li> 
                        </ul> 
                        <div class="js-tabs__marker"></div> 
                      </nav> 
                      <ul class="js-tabs__content-container"> 
                        <!-- About                   -->
                        <li class="js-tabs__content active"> 
                          <h3 class="text-center">What is Cybermap</h3>
                          <p> 
                            Cyberattacks, along with spam and malware infections, are increasing in frequency daily.
                            They occur on networks all the time and are typically carried out through weaknesses and exploits in the systems.
                            Malicious hackers may want to prevent systems from being available, choose to destroy data or interfere with the proper operation of ICT infrastructure.
                          </p> 
                          <p> 
                            This project aims to visualize these threats so the user will have a better
                            perspective of cyberattacks in real time. In order to achieve "real-time traffic" with the least
                            possible workload for the browser, each user establishes an one-way HTTP persistent connection to the server, also called "HTTP keep-alive".
                           </p>
                           <p>  
                            The idea of using an "one-way" TCP connection allows us to utilize the Server-Sent Events (SSE) technology 
                            in order to receive automatic updates from the server via a single HTTP connection as opposed to opening a 
                            new connection for every single request/response pair. 
                            (For all the malicious hackers out there, 
                            <a href="https://www.cloudflare.com/learning/ddos/ddos-attack-tools/slowloris/">Slowloris</a> 
                            is not an option here :) )
                          </p>
                          
                          <p>
                            During the connection with the server, Cyber Attacks Map will constantly receive data that are going to
                            be displayed as animated attacks on the screen. Statistics for each country are held in the
                            browser as long as the connection is not refreshed and they can be viewed by clicking the desired
                            country on the map. More detailed analytics based on various types and filters
                            can be viewed by clicking the <i>"chart icon"</i> in the top right corner of the screen. 
                          </p>
                          

                         <div class="modal-footer">
                          <i style="font-size: 12px;">
                            In order to minimize the computational resources required for receiving the attacks, mechanisms
                            that detect whether you are active on the map's tab were implemented to stall the connection so as to
                            spare network and RAM usage.
                            <br><br>
                            In case you experience difficulties
                            whilst connecting to the server, please refresh your browser.
                          </i>
                         </div>
                         <!-- Copyright -->
                         <div class="d-flex justify-content-center">
                            <div class="footer-copyright text-center py-3">© 2020 Copyright: Latsis Ilias - CSD UoC</div>
                         </div>
                          
                          <!-- Copyright -->
                        </li> 
                        
                        <!-- Severity Levels              -->
                        <li class="js-tabs__content"> 
                          <h3 class="text-center mt-3">Severity Levels</h3>
                          <p>
                            To distinguish among the impact cyberattacks have on each country, Cybermap uses three (3) severity
                            levels based on how many <b>INCOMING</b> attacks a country has endured. Outgoing attacks do not
                            affect the severity of each country due to the fact that the IP addresses used to launch an 
                            attack are probably forged.
                          </p>
                          
                          <div class="d-flex justify-content-center my-2">                          
                           <ul class="list-unstyled">
                              <li class="h5">Level</li>
                              <li>Low</li>
                              <li>Medium</li>
                              <li>High</li>
                            </ul>
                            <ul class="list-unstyled ml-2">
                                <li class="h5">Total Attacks</li>
                                <li><span class="badge badge-cyber badge-pill">0 - 500</span></li>
                                <li><span class="badge badge-cyber badge-pill">501 - 1600</span></li>
                                <li><span class="badge badge-cyber badge-pill">1600+</span></li>
                            </ul>
                          </div> 
                          
                          <p>
                            You can toggle visibility of severity levels by clicking the severity icons in the bottom left
                            corner of your screen.
                          </p>
                        </li> 
                        
                        <!-- Attack Types           -->
                        <li class="js-tabs__content">
                            <h3 class="text-center mt-3">Attack Types</h3>
                            <p>
                                Cyber Attacks Map uses several different attack types based on a list of the most
                                common cyberattacks performed on a daily basis. Below is a brief description of <u>some</u>
                                that are used by this project
                            </p>
                            
                            <div class="d-flex flex-column">
                                <!-- AUTH                           -->
                                <div class="p-2">
                                    <h5 class="attack-type-brief blue text-center">AUTH</h5>
                                    <p>
                                        Authentication attack (AUTH) is a serious type of hacking which can result into compromising 
                                        entire IT infrastructure and software system. It can also lead to personal identity theft 
                                        and monetary losses to individuals and hence every corporate firm must take this attack 
                                        seriously and design their systems to defend against it. 
                                    </p>
                                    
                                    <p>
                                        Developing a properly architectured 
                                        authentication system with appropriate set of policies is important for solid
                                        data security.
                                    </p>
                                </div>
                                
                                <!-- DNS                            -->
                                <div class="p-2">
                                    <h5 class="attack-type-brief red text-center">DNS</h5>
                                    <p>
                                        Domain Name System (DNS) it’s the directory of domain names in which a user can gain 
                                        access to internet resources. These domain names are then translated to IP addresses 
                                        so browsers can load these resources.
                                    </p>
                                    <p>
                                        A DNS attack is when hackers or attackers take advantage of vulnerabilities in the 
                                        domain name system. When a user requests an IP address, there is a recursive query to 
                                        identify the IP address. The queries are not in any way encrypted so they can be intercepted. 
                                        There are different ways in which attackers can intercept queries.
                                        Some of the most common types of DNS attacks are DDOS attack, DNS rebinding attack, 
                                        cache poisoning, Distributed Reflection DoS attack, DNS Tunneling, DNS hijacking, 
                                        basic NXDOMAIN attack, Phantom domain attack, Random subdomain attack, TCP SYN Floods, 
                                        and Domain lock-up attack.
                                    </p>
                                </div>
                                
                                <!-- DDoS                           -->
                                <div class="p-2">
                                    <h5 class="attack-type-brief blue text-center">DDoS</h5>
                                    <p>
                                        <p>
                                        A Distributed Denial-of-Service (DDoS) attack is a hostile attempt to interrupt 
                                        normal traffic of a targeted network or server by bombarding the network or its 
                                        surrounding infrastructure with Internet traffic.
                                        </p>
                                        <p>
                                        DDoS attacks achieve effectiveness by making use of several compromised computer systems 
                                        as sources of attack traffic. Most times, attackers deploy bots to bombard the target 
                                        with false traffic. 
                                        A case whereby only one bot is used is referred to as Denial Of Service (DoS) and 
                                        is mostly localised or has minimal effect. DDoS, on the other hand, has a more broad 
                                        effect and will require several deployed bots.
                                        </p>
                                        <p>
                                        Exploited machines can include computers and other networked resources such as the 
                                        Internet of Things (IoT) devices. To better understand how the DDoS attack works, 
                                        imagine a highway clogged up with spoilt cars, thereby preventing regular traffic 
                                        and causing a standstill traffic jam.
                                        </p>
                                        <p>
                                        One of the biggest DDoS attacks was the Dyn DNS attack. Dyn is an Internet Performance Management (IPM) company, 
                                        who is believed to be a pioneer DNS service provider. The Dyn attack occurred on 
                                        the 21st of October 2016. It affected a large portion of the internet in the United States and Europe. 
                                        The source of the attack was the Mirai botnet, consisting of IoT devices such as printers, 
                                        Internet Protocol (IP) cameras, and digital video recorders.
                                        </p>
                                </div>
                                
                                <!-- SQL                           -->
                                <div class="p-2">
                                    <h5 class="attack-type-brief red text-center">SQL</h5>
                                    <p>
                                        <p>
                                        SQL Injection (SQLi) is a type of an injection attack that makes it possible to 
                                        execute malicious SQL statements. These statements control a database server behind 
                                        a web application. Attackers can use SQL Injection vulnerabilities to bypass application 
                                        security measures. They can go around authentication and authorization of a web page or 
                                        web application and retrieve the content of the entire SQL database. 
                                        They can also use SQL Injection to add, modify, and delete records in the database.
                                        </p>
                                        <p>
                                        Attackers can use SQL Injections to find the credentials of other users in the database. 
                                        They can then impersonate these users. 
                                        The impersonated user may be a database administrator with all database privileges.
                                        </p>
                                </div>
                                
                                <!-- RDP                            -->
                                <div class="p-2">
                                    <h5 class="attack-type-brief blue text-center">RDP</h5>
                                    <p>    
                                        Remote Desktop Protocol (RDP) is a proprietary protocol developed by Microsoft which provides 
                                        a user with a graphical interface to connect to another computer over a network connection.
                                        Flaws are also often discovered in RDP, requiring Microsoft to issue security patches. 
                                        One of the most infamous recent examples was the BlueKeep vulnerability that surfaced in 2019.
                                    </p>
                                    <p>
                                        Hackers typically take over accounts with RDP access through brute-force password attacks. 
                                        Such attacks are particularly successful against weak passwords, which are still all 
                                        too commonly used. The top most used passwords analyzed by McAfee for RDP accounts were 
                                        "test," "1," "12345," "password," "Password1," "1234," "P@ssw0rd," "123," and "123456." 
                                        Some RDP systems didn't even have a password.
                                    </p>
                                </div>
                                
                                <!-- PHISHING (EMAIL)                -->
                                <div class="p-2">
                                    <h5 class="attack-type-brief red text-center">PHISHING</h5>
                                    <p>
                                        <p>
                                        Phishing is a type of social engineering attack often used to steal user data, 
                                        including login credentials and credit card numbers. It occurs when an attacker, 
                                        masquerading as a trusted entity, dupes a victim into opening an email, 
                                        instant message, or text message. The recipient is then tricked into clicking a 
                                        malicious link, which can lead to the installation of malware, 
                                        the freezing of the system as part of a ransomware attack or the revealing of 
                                        sensitive information.


                                        </p>
                                        <p>
                                        An attack can have devastating results. For individuals, this includes unauthorized 
                                        purchases, the stealing of funds, or identify theft.
                                        </p>
                                </div>
                                
                            </div>
                            
                            
                        </li>
                      </ul> 
                    `;

                let box = bootbox.dialog({
                    title: markup,
                    message: message,
                    size: 'medium',
                    className: 'animated fadeInUp faster',
                    centerVertical: false,
                    backdrop: true,
                    onEscape: true,
                    onShow: function (e) {
                        /* e is the show.bs.modal event */
                        new JsTabs({
                            elm: '.modal-body',
                            onClickHandlerComplete: () => {
                                $(".bootbox").getNiceScroll().resize();
                            },
                            shouldScrollTabIntoView: false // to prevent accidental scroll out of the modal
                        }).init();
                        $(".bootbox-body").attr('align', 'center');
                        $(".bootbox").css("overflow", "hidden");
                        $(".bootbox-close-button").addClass("hvr-grow");
                    },
                    onShown: function (e) {
                        /* e is the shown.bs.modal event */
                        $('.js-tabs__tab.active').click();
                        $(".bootbox").niceScroll({
                            cursorcolor: "#b700ff",
                            cursorwidth: '8px',
                            cursorborderradius: "16px",
                            autohidemode: "scroll",
                            scrollspeed: 10,
                            mousescrollstep: 5 // is pixel but don't write "px"
                        });
                    }

                }).find('.modal-title').addClass("w-100");
            }
        });

        tippy($div.get(0), {
            // default
            placement: 'left',
            content: 'Show Cybermap\'s information',
            animateFill: true,
            plugins: [animateFill],
            duration: 800,
            arrow: true
        });
        $(".top-right-container").append($div);


        /* target element with the "card" class to be draggable */
        interact('#country-stats')
            .draggable({
                allowFrom: '.card-header',
                ignoreFrom: '.title',
                /* enable inertial throwing */
                inertia: {
                    resistance: 50,
                    minSpeed: 400,
                    endSpeed: 50
                },
                /* keep the element within the area of it's parent */
                restrict: {
                    restriction: '#map',
                    elementRect: {top: 0.25, left: 0.25, bottom: 0.75, right: 0.75},
                    endOnly: true
                },
                /* enable autoScroll */
                autoScroll: false,
                /* call this function on every dragmove event */
                onmove: dragMoveListener
            })
            .resizable({
                // resize from all edges and corners
                edges: {left: true, right: true, bottom: true, top: true},

                listeners: {
                    move(event) {
                        let target = event.target
                        let x = (parseFloat(target.getAttribute('data-x')) || 0)
                        let y = (parseFloat(target.getAttribute('data-y')) || 0)

                        // update the element's style
                        target.style.width = event.rect.width + 'px'
                        target.style.height = event.rect.height + 'px'

                        // translate when resizing from top or left edges
                        x += event.deltaRect.left
                        y += event.deltaRect.top

                        target.style.webkitTransform = target.style.transform =
                            'translate(' + x + 'px,' + y + 'px)'

                        target.setAttribute('data-x', x)
                        target.setAttribute('data-y', y)
                    }
                },
                modifiers: [
                    // keep the edges inside the parent
                    interact.modifiers.restrictEdges({
                        outer: '#map'
                    }),

                    // minimum size
                    interact.modifiers.restrictSize({
                        min: {width: 150, height: 350}
                    })
                ],

                inertia: true
            });
    }

    init_statistics() {

        let $div = $("<div>", {"class": "animated modal-button animated fadeInRight delay-2s mt-3"});
        $div.append($("<i>", {"class": "fas fa-chart-area modal-button-icon hvr-grow"}));

        $div.on({
            animationend: function () {
                $(this).removeClass("animated fadeInLeft delay-2s").off("animationend");
            },
            click: () => {
                let markup = `
                    <!-- MADE WITH PYTHON BADGE  -->
                    <div align="center">
                        <a href="https://www.python.org/"> 
<!--                            <img src="http://ForTheBadge.com/images/badges/made-with-python.svg" alt="made-with-python-badge">-->
                            <img src=${made_with_python} alt="made-with-python-badge">
                        </a>
                    </div>
                    <!-- PROJECT LOGO -->
                    <br />
                    <div align="center">
<!--                        <a href="https://gitlab.com/j3di/cyber-threat-map">-->
<!--                                <img src="https://i.ibb.co/1vVcPpj/logo-cybermap-transparent.png" alt="logo-cybermap-transparent" draggable="false">-->
                                <img src=${logo_image} alt="logo-cybermap-transparent" draggable="false">
<!--                          <img src="https://i.ibb.co/7gGQcsB/cybermap-logo-transparent.png" alt="cybermap-logo-transparent">-->
<!--                        </a>-->
                    </div>
                    `;

                let message = `
                    <h3 class="mt-2 text-center">Cyber Statistics</h3>
                    <p class="text-center">
                        Real Time linear interactive graph to display detected attacks every three (3) seconds
                    </p>                  
                    <div class="d-flex flex-column  my-2">                          
                        <canvas id="myChart"> </canvas>
                        
                        <div class=" mt-3">
                          <div class="row">
                            <div class="col-6">
                              <div>
                                <h2 class="text-center mb-4">MOST INCOMING ATTACKS</h2>
                                <div class="row justify-content-center">
                                    <div class="accordion w-75" id="most_infected">
                                        <div class="loader-inner line-scale-pulse-out text-center mt-4">
                                          <div></div>
                                          <div></div>
                                          <div></div>
                                          <div></div>
                                          <div></div>
                                        </div>
                                    </div>
                                </div>
                                
                              </div>
                            </div>
                            <div class="col-6">
                              <div>
                                <h2 class="text-center mb-4">MOST OUTGOING ATTACKS</h2>
                                <div class="row justify-content-center">
                                    <div class="accordion w-75" id="most_infectious">
                                        <div class="loader-inner line-scale-pulse-out text-center mt-4">
                                          <div></div>
                                          <div></div>
                                          <div></div>
                                          <div></div>
                                          <div></div>
                                        </div>
                                    </div>
                                </div>
                                
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div class=" mt-5">
                          <div class="row">
                            <div class="col">
                              <div>
                                <h2 class="text-center mb-4">MOST OVERALL ATTACKS</h2>
                                <div class="row justify-content-center">
                                    <div class="accordion w-75" id="most_overall">
                                        <div class="loader-inner line-scale-pulse-out text-center mt-4">
                                          <div></div>
                                          <div></div>
                                          <div></div>
                                          <div></div>
                                          <div></div>
                                        </div>   
                                    </div>
                                </div>
                            </div>
                            </div>
                          </div>
                        </div>
                        
                        <div class="d-flex justify-content-center mt-5">
                                <i style="font-size: 12px;">
                                  Data feed is reset every 24 hours at (00:00)
                                </i>
                        </div>
                        
                    </div>
                          
                    `;

                let box = bootbox.dialog({
                    title: markup,
                    message: message,
                    size: 'large',
                    className: 'animated fadeInUp faster',
                    centerVertical: false,
                    backdrop: true,
                    onEscape: true,
                    onShow: function (e) {
                        // $(".bootbox-body").attr('align', 'center');
                        $(".bootbox").css("overflow", "hidden");
                        $(".bootbox-close-button").addClass("hvr-grow");
                    },
                    onShown: (e) => {
                        $(".bootbox").niceScroll({
                            cursorcolor: "#b700ff",
                            cursorwidth: '8px',
                            cursorborderradius: "16px",
                            autohidemode: "scroll",
                            scrollspeed: 10,
                            mousescrollstep: 5 // is pixel but don't write "px"
                        });

                        let ctx = document.getElementById('myChart').getContext('2d');

                        this.chart = new Chart(ctx, {
                            type: 'line',
                            data: {
                                datasets: [
                                    {
                                        data: [],
                                        label: "AUTH",
                                        fill: false,
                                        borderDash: [1, 1],
                                        cubicInterpolationMode: 'monotone',
                                        borderColor: 'rgb(255, 99, 132)',
                                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                    },
                                    {
                                        data: [],
                                        label: "DNS",
                                        fill: false,
                                        borderColor: 'rgb(54, 162, 235)',
                                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                        borderDash: [12, 3, 3],
                                        cubicInterpolationMode: 'monotone',
                                    },
                                    {
                                        data: [],
                                        label: "DoS",
                                        fill: false,
                                        borderColor: 'rgb(255, 99, 132)',
                                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                        borderDash: [10, 10],
                                        cubicInterpolationMode: 'monotone',

                                    },
                                    {
                                        data: [],
                                        label: "EMAIL",
                                        fill: false,
                                        borderColor: 'rgb(54, 162, 235)',
                                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                        borderDash: [20, 5],
                                        cubicInterpolationMode: 'monotone',
                                    },
                                    {
                                        data: [],
                                        label: "FTP",
                                        fill: false,
                                        borderColor: 'rgb(255, 99, 132)',
                                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                        borderDash: [15, 3, 3, 3],
                                        cubicInterpolationMode: 'monotone',
                                    },
                                    {
                                        data: [],
                                        label: "HTTP",
                                        fill: false,
                                        borderColor: 'rgb(54, 162, 235)',
                                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                        borderDash: [20, 3, 3, 3, 3, 3, 3, 3],
                                        cubicInterpolationMode: 'monotone',
                                    },
                                    {
                                        data: [],
                                        label: "HTTPS",
                                        fill: false,
                                        borderColor: 'rgb(255, 99, 132)',
                                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                        borderDash: [18, 3, 3, 3],
                                        cubicInterpolationMode: 'monotone',
                                    },
                                    {
                                        data: [],
                                        label: "ICMP",
                                        fill: false,
                                        borderColor: 'rgb(54, 162, 235)',
                                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                        borderDash: [18, 18, 18],
                                        cubicInterpolationMode: 'monotone',
                                    },
                                    {
                                        data: [],
                                        label: "RDP",
                                        fill: false,
                                        borderColor: 'rgb(54, 162, 235)',
                                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                        borderDash: [10, 10, 4],
                                        cubicInterpolationMode: 'monotone',
                                    },
                                    {
                                        data: [],
                                        label: "SFTP",
                                        fill: false,
                                    },
                                    {
                                        data: [],
                                        label: "SMB",
                                        fill: false,
                                    },
                                    {
                                        data: [],
                                        label: "SNMP",
                                        fill: false,
                                    },
                                    {
                                        data: [],
                                        label: "SQL",
                                        fill: false,
                                        borderColor: 'rgb(255, 99, 132)',
                                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                        borderDash: [32, 4],
                                        cubicInterpolationMode: 'monotone',
                                    },
                                    {
                                        data: [],
                                        label: "SSH",
                                        fill: false,
                                        borderColor: 'rgb(54, 162, 235)',
                                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                        borderDash: [5, 15],
                                        cubicInterpolationMode: 'monotone',
                                    },
                                    {
                                        data: [],
                                        label: "TELNET",
                                        fill: false,
                                    },
                                    {
                                        data: [],
                                        label: "WHOIS",
                                        fill: false,
                                    },
                                ]
                            },
                            options: {
                                scales: {
                                    xAxes: [{
                                        type: 'realtime',
                                        realtime: {
                                            refresh: 1000,
                                            delay: 4000,
                                            duration: 11000,
                                            onRefresh: function (chart) {
                                                // chart.data.datasets.forEach(function (dataset) {
                                                //     dataset.data.push({
                                                //         x: Date.now(),
                                                //         y: getRandomInt(5000, 600_000)
                                                //     });
                                                // });
                                            }
                                        }
                                    }],
                                    yAxes: [{
                                        type: 'linear',
                                        display: true,
                                        scaleLabel: {
                                            display: true,
                                            labelString: 'ATTACKS'
                                        }
                                    }],
                                },
                                tooltips: {
                                    mode: 'nearest',
                                    intersect: false
                                },
                                hover: {
                                    mode: 'nearest',
                                    intersect: false
                                },
                                plugins: {
                                    streaming: {
                                        frameRate: 25
                                    }
                                },
                            }
                        });
                    },
                    onHidden: (e) => {
                        this.chart.destroy();
                        this.chart = null;
                    }

                }).find('.modal-title').addClass("w-100");

                this.attacks_system.infectious_collapsed = false;
                this.attacks_system.infected_collapsed = false;
                this.attacks_system.overall_collapsed = false;


            }
        });

        tippy($div.get(0), {
            // default
            placement: 'bottom',
            content: 'View Cybermap\'s statistics',
            animateFill: true,
            plugins: [animateFill],
            duration: 800,
            arrow: true
        });
        $(".top-right-container").append($div);

    }


    logEvent(event, location) {

        if (this.loggingTableVisible) {
            this.loggingTable.row.add([event, location]).draw();
            globals.events.push(event);

            let logging_table_count = this.loggingTable.column(0).data().length;

            if (logging_table_count > 4) {
                globals.events.shift();
                this.loggingTable.row(0).remove().draw();
            }

            select("#events")
                .select("tbody")
                .selectAll("tr")
                .style("color", function (d) {
                    return $(this).hasClass("odd") ? "#EF984A" : "#68ACE5";
                });

        }

    }

}
