/*jslint es5:true, indent: 2 */
/*global Vue, io */
/* exported vm */
'use strict';
var socket = io();

var vm = new Vue({
    el: '#item',
    data: {
        url:"https://b.kisscc0.com/20180817/iiw/kisscc0-web-button-computer-icons-information-symbol-info-button-5b7686dabb3597.7612857815344944267668.png",
        express: null,
        orderId: null,
        goodsInfo: {
            amount: null,
            size: null,
            weight: null,
            fragile: null,
            driverInstructions: null,
        },
    },
    created: function () {
        socket.on('initialize', function (data) {
            // add marker for home base in the map
        }.bind(this));
        socket.on('orderId', function (orderId) {
            this.orderId = orderId;
        }.bind(this));
    },
    methods: {
        sendInfo: function() {
            console.log(this.goodsInfo);
            socket.emit("sendInfo",
                {
                    amount: this.goodsInfo.amount,
                    size: this.goodsInfo.size,
                    weight: this.goodsInfo.weight,
                    fragile: this.goodsInfo.fragile,
                    driverInstructions: this.goodsInfo.driverInstructions,
                } );
        },
        getPolylinePoints: function() {
            if (this.express) {
                return [this.fromMarker.getLatLng(), this.destMarker.getLatLng()];
            } else {
                return [this.fromMarker.getLatLng(), this.baseMarker.getLatLng(), this.destMarker.getLatLng()];
            }
        },
        handleClick: function (event) {
            // first click sets pickup location
            if (this.fromMarker === null) {
                this.fromMarker = L.marker(event.latlng, {icon: this.fromIcon, draggable: true}).addTo(this.map);
                this.fromMarker.on("drag", this.moveMarker);
            }
            // second click sets destination
            else if (this.destMarker === null) {
                this.destMarker = L.marker([event.latlng.lat, event.latlng.lng], {draggable: true}).addTo(this.map);
                this.destMarker.on("drag", this.moveMarker);
                this.connectMarkers = L.polyline(this.getPolylinePoints(), {color: 'blue'}).addTo(this.map);
            }
            // subsequent clicks assume moved markers
            else {
                this.moveMarker();
            }
        },
        moveMarker: function (event) {
            this.connectMarkers.setLatLngs(this.getPolylinePoints(), {color: 'blue'});
            /*socket.emit("moveMarker", { orderId: event.target.orderId,
                                      latLong: [event.target.getLatLng().lat, event.target.getLatLng().lng]
                                      });
                                      */
        }
    }
});