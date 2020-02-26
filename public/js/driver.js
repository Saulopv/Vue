/*jslint es5:true, indent: 2 */
/*global Vue, io */
/* exported vm */
'use strict';
var socket = io();

// ****************************** //
// TESTCODE ONLY, CAN BE REMOVED

var drive1 = {number: 1, adress: "Botvidsgatan 4a", delivered: false, info: "Pickup"}
var drive2 = {number: 1, adress: "Botvidsgatan 4a", delivered: false, info: "Pickup"}
var drive3 = {number: 2, adress: "Hjulgatan 10", delivered: false, info: "Express"}
var drive4 = {number: 2, adress: "Hjulgatan 10", delivered: false, info: "Express"}
var drive5 = {number: 2, adress: "Hjulgatan 10", delivered: false, info: "Express"}
var drive6 = {number: 3, adress: "Torkelsgatan 9", delivered: false, info: "Deliver"}
var drive7 = {number: 4, adress: "Lindgatan 7", delivered: false, info: "Deliver"}
var drive8 = {number: 5, adress: "Oxelgatan 19", delivered: true, info: "Deliver"}
var drive9 = {number: 5, adress: "Oxelgatan 19", delivered: true, info: "Deliver"}


var drive = [drive1, drive2, drive3, drive4, drive5, drive6, drive7, drive8, drive9]
// ******************************* //


var vm = new Vue({
  el: '#page',
  data: {
    map: null,
    driverId: localStorage.getItem("driverId"),
    driverLocation: null,
    maxCapacity: 30,
    usedCapacity: 0,
    orders: {},
    drivers: {},
    driverName: {},
    customerMarkers: {},
    baseMarker: null,

    wares: drive,
    status: false
  },
  created: function () {
    socket.on('initialize', function (data) {
      // add marker for home base in the map
      this.baseMarker = L.marker(data.base, {icon: this.baseIcon}).addTo(this.map);
      this.baseMarker.bindPopup("This is the dispatch and routing center");

      this.orders = data.orders;
      this.drivers = data.drivers;
      this.driverName = this.drivers[this.driverId].driverName;
      for (let key in this.orders) {
        if (this.orders[key].driverId && this.orders[key].driverId == this.driverId) {
          this.customerMarkers[this.orders[key].orderId] = this.putCustomerMarkers(this.orders[key]);
        }
      }
    }.bind(this));
    socket.on('currentQueue', function (data) {
      
    }.bind(this));

    // these icons are not reactive
    this.driverIcon = L.icon({
      iconUrl: "img/driver.png",
      iconSize: [36,20],
      iconAnchor: [18,22]
    });
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
    this.map.on('click', this.setDriverLocation);
  },
  beforeDestroy: function () {
    socket.emit('driverQuit', this.driverId);
  },
  methods: {
    getDriverInfo: function () {
      return  { driverId: this.driverId,
        latLong: this.driverLocation.getLatLng(), 
        maxCapacity: this.maxCapacity,
        usedCapacity: this.usedCapacity,
        driverName: this.driverName
      };
    },
    setDriverLocation: function (event) {
      if (this.driverLocation === null) {
        this.driverLocation = L.marker([event.latlng.lat, event.latlng.lng], {icon: this.driverIcon, draggable: true}).addTo(this.map);
        this.driverLocation.on("drag", this.moveDriver);
        socket.emit("addDriver", this.getDriverInfo());
      }
      else {
        this.driverLocation.setLatLng(event.latlng);
        this.moveDriver(event);
      }
    },
    updateDriver: function () {
      socket.emit("updateDriver", this.getDriverInfo());
    },
    moveDriver: function (event) {
      socket.emit("moveDriver", this.getDriverInfo());
    },
    quit: function () {
      // TODO: This should perhaps only be possible when the driver is not assigned to any orders
      this.map.removeLayer(this.driverLocation);
      this.driverLocation = null;
      socket.emit("driverQuit", this.driverId);
    },
    orderPickedUp: function (order) {
      // Update used capacity
      this.usedCapacity += order.orderDetails.spaceRequired;

      // TODO: Update polyline, remove last segment  
      socket.emit("orderPickedUp", order);
    },
    orderDroppedOff: function (order) {
      // Update used capacity
      this.usedCapacity -= order.orderDetails.spaceRequired;

      Vue.delete(this.orders, order.orderId);
      this.map.removeLayer(this.customerMarkers[order.orderId].from);
      this.map.removeLayer(this.customerMarkers[order.orderId].dest);
      this.map.removeLayer(this.customerMarkers[order.orderId].line);
      Vue.delete(this.customerMarkers[order.orderId]);
      socket.emit("orderDroppedOff", order.orderId);
    },
    // TODO: express and processed need to be separated to properly represent a
    // non-express processed order (i.e. a regular order when going from the distribution
    // terminal to final destination)
    getPolylinePoints: function (order) {
      if (order.expressOrAlreadyProcessed) {
        return [order.fromLatLong, order.destLatLong];
      } else {
        return [order.fromLatLong, this.baseMarker.getLatLng()];
      }
    },
    putCustomerMarkers: function (order) {
      var fromMarker = L.marker(order.fromLatLong, {icon: this.fromIcon}).addTo(this.map);
      fromMarker.orderId = order.orderId;
      var destMarker = L.marker(order.expressOrAlreadyProcessed ? order.destLatLong : this.baseMarker.getLatLng()).addTo(this.map);
      destMarker.orderId = order.orderId;
      var connectMarkers = L.polyline(this.getPolylinePoints(order), {color: 'blue'}).addTo(this.map);
      return {from: fromMarker, dest: destMarker, line: connectMarkers};
    },
      markComplete: function() {
        if(confirmationFunc())
        {
        for (let key in this.orders) {
          if (this.orders[key].driverId && this.orders[key].driverId == this.driverId) {
            //console.log(this.orders[key].orderId);
            if(this.orders[key].checked)
              {
                this.orders[key].delivered = true;
                this.orders[key].checked = false;

                this.usedCapacity -= this.orders[key].orderDetails.spaceRequired;

                Vue.delete(this.orders[key], this.orders[key].orderId);
                this.map.removeLayer(this.customerMarkers[this.orders[key].orderId].from);
                this.map.removeLayer(this.customerMarkers[this.orders[key].orderId].dest);
                this.map.removeLayer(this.customerMarkers[this.orders[key].orderId].line);
                Vue.delete(this.customerMarkers[this.orders[key].orderId]);
                socket.emit("orderDroppedOff", this.orders[key].orderId);
              }
            }
          }
        }
    },
    updateId: function() {
      var id = document.getElementById("Driver").value;
      localStorage.setItem("driverId",id);
      location.reload();
    }
  
  }
});