/*jslint es5:true, indent: 2 */
/*global Vue, io */
/* exported vm */
'use strict';
var socket = io();

var vm = new Vue({
  el: '#page',
  data: {
    url:"https://b.kisscc0.com/20180817/iiw/kisscc0-web-button-computer-icons-information-symbol-info-button-5b7686dabb3597.7612857815344944267668.png",
    express: null,
    orderId: null,
    map: null,
    fromMarker: null,
    destMarker: null,
    baseMarker: null,
    driverMarkers: {},
    goodsInfo: {
      amount: null,
      size: null,
      weight: null,
      fragile: null,
      driverInstructions: null,
    },
    dinfo: [
      {name: ''},
      {email: ''},
    ],
  },
  created: function () {
    socket.on('initialize', function (data) {
      // add marker for home base in the map

      if(data.order != undefined) {
        if (data.order.amount != undefined) this.goodsInfo.amount = data.order.amount;
        if (data.order.size != undefined) this.goodsInfo.size = data.order.size;
        if (data.order.weight != undefined) this.goodsInfo.weight = data.order.weight;
        if (data.order.fragile != undefined) this.goodsInfo.fragile = data.order.fragile;
        if (data.order.fragile != undefined) this.express = data.order.fragile == "Ja";
        if (data.order.driverInstructions != undefined) this.goodsInfo.driverInstructions = data.order.driverInstructions;

      };
      this.baseMarker = L.marker(data.base, {icon: this.baseIcon}).addTo(this.map);
      this.baseMarker.bindPopup("This is the dispatch and routing center");
    }.bind(this));
    socket.on('orderId', function (orderId) {
      this.orderId = orderId;
    }.bind(this));
    // These icons are not reactive
    this.fromIcon = L.icon({
      iconUrl: "img/box.png",
      iconSize: [42,30],
      iconAnchor: [21,34]
    });
    this.baseIcon = L.icon({
      iconUrl: "img/base.png",
      iconSize: [40,40],
      iconAnchor: [20,20]
    });
  },
  mounted: function () {
    // set up the map
    this.map = L.map('my-map').setView([59.8415,17.648], 13);

    // create the tile layer with correct attribution
    var osmUrl='http://{s}.tile.osm.org/{z}/{x}/{y}.png';
    var osmAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
    L.tileLayer(osmUrl, {
        attribution: osmAttrib,
        maxZoom: 18
    }).addTo(this.map);
    this.map.on('click', this.handleClick);

    var searchDestControl = L.esri.Geocoding.geosearch({allowMultipleResults: false, zoomToResult: false, placeholder: "Destination"}).addTo(this.map);
    var searchFromControl = L.esri.Geocoding.geosearch({allowMultipleResults: false, zoomToResult: false, placeholder: "From"});
    // listen for the results event and add the result to the map
    searchDestControl.on("results", function(data) {
        this.destMarker = L.marker(data.latlng, {draggable: true}).addTo(this.map);
        this.destMarker.on("drag", this.moveMarker);
        searchFromControl.addTo(this.map);
    }.bind(this));

    // listen for the results event and add the result to the map
    searchFromControl.on("results", function(data) {
        this.fromMarker = L.marker(data.latlng, {icon: this.fromIcon, draggable: true}).addTo(this.map);
        this.fromMarker.on("drag", this.moveMarker);
        this.connectMarkers = L.polyline([this.fromMarker.getLatLng(), this.destMarker.getLatLng()], {color: 'blue'}).addTo(this.map);
    }.bind(this));
  },
  methods: {
    togglePopup: function(){
      var popup = document.getElementById("myPopup");
      popup.classList.toggle("show");
      console.log("poppedup")

    },
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
    placeOrder: function() {
      this.togglePopup();
      //return;
      socket.emit("placeOrder", { fromLatLong: [this.fromMarker.getLatLng().lat, this.fromMarker.getLatLng().lng],
        destLatLong: [this.destMarker.getLatLng().lat, this.destMarker.getLatLng().lng],
        expressOrAlreadyProcessed: this.express ? true : false,
        orderDetails: { pieces: this.goodsInfo.amount, size: this.goodsInfo.size, weight: this.goodsInfo.weight,  driverInstructions: this.goodsInfo.driverInstructions }
      });
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
