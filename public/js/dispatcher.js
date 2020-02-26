/*jslint es5:true, indent: 2 */
/*global Vue, io */
/* exported vm */
'use strict';
var socket = io();

var vm = new Vue({
  el: '#page',
  data: {
    orders: {},
    drivers: {},
    customerMarkers: {},
    driverMarkers: {},
    driversAssigned: [],
    baseMarker: null,
    map: null,
    driverRoute: null
  },

  created: function () {
    socket.on('initialize', function (data) {
      this.orders = data.orders;
      this.drivers = data.drivers;
      // add marker for home base in the map
      this.baseMarker = L.marker(data.base, {icon: this.baseIcon}).addTo(this.map);
      this.baseMarker.bindPopup("This is the dispatch and routing center");
      // add markers in the map for all orders
      for (var orderId in data.orders) {
        this.customerMarkers[orderId] = this.putCustomerMarkers(data.orders[orderId]);
      }
      // add driver markers in the map for all drivers
      for (var driverId in data.drivers) {
        this.driverMarkers[driverId] = this.putDriverMarker(data.drivers[driverId]);
      }
    }.bind(this));

    socket.on('driverAdded', function (driver) {
      this.$set(this.drivers, driver.driverId, driver);
      this.driverMarkers[driver.driverId] = this.putDriverMarker(driver);
    }.bind(this));
    socket.on('driverUpdated', function (driver) {
      this.drivers[driver.driverId] = driver;
    }.bind(this));
    socket.on('driverMoved', function (driver) {
      this.drivers[driver.driverId].latLong = driver.latLong;
      this.driverMarkers[driver.driverId].setLatLng(driver.latLong);
    }.bind(this));
    socket.on('driverQuit', function (driverId) {
      Vue.delete(this.drivers, driverId);
      this.map.removeLayer(this.driverMarkers[driverId]);
      Vue.delete(this.driverMarkers, driverId);
    }.bind(this));

    socket.on('orderPlaced', function (order) {
      this.$set(this.orders, order.orderId, order);
      this.customerMarkers[order.orderId] = this.putCustomerMarkers(order);
    }.bind(this));
    socket.on('driverAssigned', function (order) {
      this.$set(this.orders, order.orderId, order);
    }.bind(this));
    socket.on('orderPickedUp', function (order) {
      this.$set(this.orders, order.orderId, order);
    }.bind(this));
    socket.on('orderDroppedOff', function (orderId) {
      Vue.delete(this.orders, orderId);
      this.map.removeLayer(this.customerMarkers[orderId].from);
      this.map.removeLayer(this.customerMarkers[orderId].dest);
      this.map.removeLayer(this.customerMarkers[orderId].line);
      Vue.delete(this.customerMarkers, orderId);
    }.bind(this));

    // These icons are not reactive
    this.driverIcon = L.icon({
      iconUrl: "img/driver.png",
      iconSize: [36,20],
      iconAnchor: [18,22],
      popupAnchor: [0,-20]
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
    this.map = L.map('my-map', {
      center: [59.8415,17.648],
      zoom: 13,
    });
    // create the tile layer with correct attribution
    var osmUrl='http://{s}.tile.osm.org/{z}/{x}/{y}.png';
    var osmAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
    L.tileLayer(osmUrl, {
        attribution: osmAttrib,
        maxZoom: 18
    }).addTo(this.map);
  },
  methods: {
    showDriver: function(driver) {
      var marker = this.driverMarkers[driver.driverId];
      var popup = marker.getPopup();
      if(popup.isOpen()) {
        this.map.closePopup();
        this.map.removeLayer(this.driverRoute);
        this.driverRoute = null;
      }
      else {
        marker.openPopup();
        this.map.panTo(marker.getLatLng());
        this.showDriverRoute(driver);
      }
    },
    showDriverRoute: function(driver) {
      // TODO
      // Rita ut hela rutten
      // Rita ut express
      // Tillbaka till basen?
      if(this.driverRoute)
        this.map.removeLayer(this.driverRoute);

      var latlngs = [driver.latLong];
      for (let key in this.orders) {
        if (this.orders[key].driverId && this.orders[key].driverId == driver.driverId) {
          latlngs.push(this.orders[key].fromLatLong);
          if(this.orders[key].expressOrAlreadyProcessed) {
            latlngs.push(this.orders[key].destLatLong);
          }
        }
      }
      latlngs.push(this.baseMarker.getLatLng());
      this.driverRoute = L.polyline(latlngs, {color: 'red'});
      this.map.addLayer(this.driverRoute);
    },
    showOrder: function(order) {
      var marker = this.customerMarkers[order.orderId].from;
      var popup = marker.getPopup();
      if(popup.isOpen())
        this.map.closePopup();
      else {
        marker.openPopup();
        this.map.panTo(marker.getLatLng());
      }
    },
    showAddDriver: function() {
      var x = document.getElementById("add-driver");
      if (x.style.display === "none") {
        x.style.display = "block";
        document.getElementById("add-button").style.borderBottom = "none";
        document.getElementById("add-button").style.borderBottomRightRadius = "0px";
        document.getElementById("add-button").style.borderBottomLeftRadius = "0px";
      } else {
        x.style.display = "none";
        document.getElementById("add-button").style.borderBottom = "1px solid black";
        document.getElementById("addedName").value = "";
        document.getElementById("add-button").style.borderRadius = "25px";
      }
    },
    showRemoveDriver: function() {
      var x = document.getElementById("remove-driver");
      if (x.style.display === "none") {
        x.style.display = "block";
        document.getElementById("remove-button").style.borderBottom = "none";
        document.getElementById("remove-button").style.borderBottomRightRadius = "0px";
        document.getElementById("remove-button").style.borderBottomLeftRadius = "0px";

      } else {
        x.style.display = "none";
        document.getElementById("remove-button").style.borderBottom = "1px solid black";
        document.getElementById("removedName").value = "";
        document.getElementById("remove-button").style.borderRadius = "25px";
      }
    },
    getNext: function () {
      var lastOrder = Object.keys(this.drivers).reduce(function (last, next) {
        return Math.max(last, next);
      }, 100);
      return lastOrder + 1;
    },
    addDriver: function () {
      var name = document.getElementById("addedName").value;
      if(name.length == 0)
      {
        alert("Skriv ett namn!");
        return;
      }
      socket.emit("addDriver", {driverId: this.getNext(),
                                driverName: name,
                                latLong:{"lat": 59.84091407485801,
                                         "lng": 17.64924108548685 },
                                maxCapacity: 30,
                                usedCapacity: 0});
      this.showAddDriver();
    },
    removeDriver: function () {
      // TODO: This should perhaps only be possible when the driver is not assigned to any orders
      var id = document.getElementById("removedName").value;
      if(id.length == 0) {
        alert("Saknar ett ID");
        return;
      }
      socket.emit("driverQuit", id);
      this.showRemoveDriver();
    },
    createOrderPopup: function (orderId, items) {
      var popup = document.createElement('div');
      popup.appendChild(document.createTextNode('Order ' + orderId));
      var list = document.createElement('ul');
      for (var i in items) {
        var listItem = document.createElement('li');
        var listItemText = document.createTextNode(i + ": " + items[i]);
        listItem.appendChild(listItemText);
         popup.appendChild(listItem);
      }
      return popup;
    },
    createDriverPopup: function (driver) {
      var popup = document.createElement('div');
      popup.appendChild(document.createTextNode('Förare: ' + driver.driverName));
      var list = document.createElement('ul');
      var remainingSpace = driver.maxCapacity-driver.usedCapacity;

      var space = document.createElement('li');
      var spaceText = document.createTextNode("Utrymme : " + remainingSpace);
      space.appendChild(spaceText);
      popup.appendChild(space);

      var sum = 0;
      for (let key in this.orders) {
        if (this.orders[key].driverId && this.orders[key].driverId == driver.driverId) {
          sum += 1;
        }
      }
      var orders = document.createElement('li');
      var ordersText = document.createTextNode("Varor : " + sum);
      orders.appendChild(ordersText);
      popup.appendChild(orders);
      return popup;
    },
    getPolylinePoints: function(order) {
      if (order.expressOrAlreadyProcessed) {
        return [order.fromLatLong, order.destLatLong];
      } else {
        return [order.fromLatLong, this.baseMarker.getLatLng(), order.destLatLong];
      }
    },
    putDriverMarker: function (driver) {
      var marker = L.marker(driver.latLong, {icon: this.driverIcon}).addTo(this.map);
      marker.bindPopup(this.createDriverPopup(driver));
      marker.driverId = driver.driverId;

      return marker;
    },
    putCustomerMarkers: function (order) {
      var fromMarker = L.marker(order.fromLatLong, {icon: this.fromIcon}).addTo(this.map);
      fromMarker.bindPopup(this.createOrderPopup(order.orderId, order.orderDetails));
      fromMarker.orderId = order.orderId;
      var destMarker = L.marker(order.destLatLong).addTo(this.map);
      destMarker.bindPopup(this.createOrderPopup(order.orderId, order.orderDetails));
      destMarker.orderId = order.orderId;
      var connectMarkers = L.polyline(this.getPolylinePoints(order), {color: 'blue'}).addTo(this.map);
      return {from: fromMarker, dest: destMarker, line: connectMarkers};
    },
    addAssignedDriver: function (order) {
      this.driversAssigned.push(order);
      console.log(this.driversAssigned);
    },
    assignDrivers: function () {
      //TODO update popup
      for(var key in this.driversAssigned) {
        socket.emit("driverAssigned", this.driversAssigned[key]);
        location.reload();
      }
    },
    cancelAssign: function () {
      this.driversAssigned = [];
      location.reload();
    }
  }
});
