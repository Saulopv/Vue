'use strict'

var inlogg = new Vue({
    el: '#urls',
    data: {
        url1: '/item',
        url2: '/',
        url3: 'driver',
        url4: 'dispatcher'
    },
    methods: {
        goToEvents: function (url) {
            location.href=url
        }
    }
});