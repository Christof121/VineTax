// ==UserScript==
// @name         Vine Tax
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Abfragen der Tax Value
// @author       Christof
// @match        *://www.amazon.de/vine/*
// @match        *://amazon.de/vine/*
// @match        *://www.amazon.de/-/en/vine/*
// @license      MIT
// @connect greasyfork.org
// ==/UserScript==

(async function() {
    'use strict';

    var tiles = document.querySelectorAll(".vvp-item-tile");
    var encodedURL;

    tiles.forEach(function(element){
        var multi;
        var taxElement = document.createElement("span");
        taxElement.style.position = "absolute";
        taxElement.style.transform = "translate(0px,-30px)";
        taxElement.style.width = "fit-content";

        var buttonElement = document.createElement("button");
        buttonElement.textContent = "Get Tax";

        taxElement.appendChild(buttonElement);
        element.querySelector('div').insertBefore(taxElement, element.querySelector('div').querySelector('div').nextSibling)

        // Füge einen Event-Listener hinzu, um auf den Klick auf den Button zu reagieren
        buttonElement.addEventListener('click', async function() {
            if(element.querySelector("#VVtaxValue") == null){

                var recommandationId = element.getAttribute("data-recommendation-id");
                var asinElement = element.querySelector("div > span > span > input");
                var asin = asinElement.getAttribute("data-asin");

                var isParentAsin = asinElement.getAttribute("data-is-parent-asin") == "true";

                var url = 'https://www.amazon.de/vine/api/recommendations/'
                var recomURL = url + recommandationId;
                var fetchURL;

                // Bei mehreren Asin Liste abfragen und die erste Asin nutzen
                if(isParentAsin){
                    fetchURL = recomURL;

                    encodedURL = fetchURL.replace(/#/g, '%23');
                    console.log(encodedURL);
                    await fetch(encodedURL)
                        .then(response => response.json()) // Annahme, dass die API JSON zurückgibt
                        .then(data => {
                        asin = data.result.variations[0].asin;
                        if(data.result.variations.length > 1){
                            multi = true
                        }
                    })
                        .catch(error => {
                        console.error('Fehler bei der API-Anfrage:', error);
                    });
                }
                var fullURL = recomURL + '/item/' + asin;
                fetchURL = fullURL;

                encodedURL = fetchURL.replace(/#/g, '%23');
                console.log(encodedURL);
                fetch(encodedURL)
                    .then(response => response.json()) // Annahme, dass die API JSON zurückgibt
                    .then(data => {
                    var tax = data.result.taxValue;
                    var currency = data.result.taxCurrency;

                    var taxSpan = document.createElement("span");
                    var multiMsg = ""
                    if(multi){
                        multiMsg = "Auswahl | exp. "
                        console.log("Mehrere Varianten | Wert der 1. Auswahl - Asin: " + asin + " Geschätzer Wert: " + tax + " " + currency);
                    }
                    taxSpan.textContent = multiMsg + "Tax: " + tax + " " + currency;
                    taxSpan.id = "VVtaxValue";
                    taxElement.appendChild(taxSpan);
                    buttonElement.remove();
                })
                    .catch(error => {
                    console.error('Fehler bei der API-Anfrage:', error);

                    var taxSpan = document.createElement("span");
                    taxSpan.textContent = "Fehler bei der Abfrage";
                    taxSpan.id = "VVtaxValue";
                    taxElement.appendChild(taxSpan);
                    buttonElement.remove();
                });
            }
        });
    });

})();
