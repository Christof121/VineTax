// ==UserScript==
// @name         Vine Tax
// @namespace    http://tampermonkey.net/
// @version      1.3
// @updateURL    https://raw.githubusercontent.com/Christof121/VineTax/main/taxViewer.user.js
// @downloadURL  https://raw.githubusercontent.com/Christof121/VineTax/main/taxViewer.user.js
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

    var container = document.getElementById("vvp-items-grid");
    var tiles = document.querySelectorAll(".vvp-item-tile");
    var encodedURL;
    var newTiles = [];
    addTax(tiles);

    var popupTaxSpan;
    var taxMessage;
    var multi;
    var lastClickedTile;

    // Überwache ob Produkte hinzugefügt wurden
    const tilesCallback = function(mutationsList, observer) {
        newTiles = [];
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                // Überprüfen, ob neue Kinder hinzugefügt wurden
                const newNodes = mutation.addedNodes;
                for (const newNode of newNodes) {
                    // Überprüfen, ob das hinzugefügte Element ein DIV ist
                    if (newNode.tagName && newNode.tagName.toLowerCase() === 'div') {
                        // Hintergrund rot machen
                        newTiles.push(newNode);
                    }
                }
            }
        }

        // Nachdem neue Elemente hinzugefügt wurden, die Selektion erneut durchführen
        if(newTiles.length > 0){
            addTax(newTiles);
            console.log("Added Tax Button to new Tiles");
        }
    };
    const tilesObserver = new MutationObserver(tilesCallback);

    const tilesConfig = { childList: true};

    tilesObserver.observe(container, tilesConfig);


    // Überprüft ob das Popup hinzugefügt wurde
    const popupCallback = function(mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                // Überprüfen, ob neue Kinder hinzugefügt wurden
                const newNodes = mutation.addedNodes;
                for (const newNode of newNodes) {
                    // Überprüfen, ob das hinzugefügte Element das Popup-Element ist
                    if (newNode.classList && newNode.classList.contains('a-modal-scroller') && newNode.classList.contains('a-declarative')) {
                        // Hier kannst du den Code für das neu hinzugefügte Popup-Element ausführen
                        var popupFooter = document.querySelector(".vvp-modal-footer");
                        popupTaxSpan = document.createElement("span");
                        popupTaxSpan.id = "popupTaxValue";
                        popupFooter.insertBefore(popupTaxSpan, popupFooter.firstChild);
                        fetchTax(lastClickedTile);
                    }
                }
            }
        }
    };

    const popupObserver = new MutationObserver(popupCallback);

    const body = document.body;

    const popupConfig = { childList: true, subtree: true };

    popupObserver.observe(body, popupConfig);


    function addTax(tiles){
        tiles.forEach(function(element){
            var taxElement = document.createElement("span");
            taxElement.style.position = "absolute";
            taxElement.style.transform = "translate(0px,-30px)";
            taxElement.style.width = "fit-content";
            taxElement.id = "VT-VineTax";

            var buttonElement = document.createElement("button");
            buttonElement.textContent = "Get Tax";

            taxElement.appendChild(buttonElement);
            element.querySelector('div').insertBefore(taxElement, element.querySelector('div').querySelector('div').nextSibling)

            // Füge einen Event-Listener hinzu, um auf den Klick auf den Button zu reagieren
            buttonElement.addEventListener('click', async function() {
                fetchTax(element);
            });

            var detailsButton = element.querySelector('input');

            detailsButton.addEventListener('click', async function() {
                var popupFooter = document.querySelector(".vvp-modal-footer");
                lastClickedTile = element;
                if (popupFooter != null && popupTaxSpan != null) {
                    var footerSpan = document.querySelector(".vvp-modal-footer > span");
                    footerSpan.textContent = "Lade Tax";
                    fetchTax(element);
                }
            });

        });
    }

    async function fetchTax(element) {
        if(element.querySelector("#VVtaxValue") == null){

            var recommandationId = element.getAttribute("data-recommendation-id");
            var asinElement = element.querySelector("div > span > span > input");
            var asin = asinElement.getAttribute("data-asin");

            var taxElement = element.querySelector("div > span");
            var buttonElement = element.querySelector("div > span > button");
            var isParentAsin = asinElement.getAttribute("data-is-parent-asin") == "true";

            var url = 'https://www.amazon.de/vine/api/recommendations/'
            var recomURL = url + recommandationId;
            var fetchURL;

            console.log("Fetching Tax For: " + asin);

            // Bei mehreren Asin Liste abfragen und die erste Asin nutzen
            if(isParentAsin){
                fetchURL = recomURL;

                encodedURL = fetchURL.replace(/#/g, '%23');
                //console.log(encodedURL);
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
            //console.log(encodedURL);
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
                taxMessage = multiMsg + "Tax: " + tax + " " + currency;
                taxSpan.textContent = taxMessage;
                taxSpan.id = "VVtaxValue";
                taxElement.appendChild(taxSpan);
                buttonElement.remove();

                //Popup Overlay Value
                var footerSpan = document.querySelector(".vvp-modal-footer > span");
                if(footerSpan != null){
                    footerSpan.textContent = multiMsg + "Tax: " + tax + " " + currency;
                }
                console.log(multiMsg + "Tax: " + tax + " " + currency);
            })
                .catch(error => {
                console.error('Fehler bei der API-Anfrage:', error);

                var taxSpan = document.createElement("span");
                taxSpan.textContent = "Fehler bei der Abfrage";
                taxSpan.id = "VVtaxValue";
                taxElement.appendChild(taxSpan);
                buttonElement.remove();

                var footerSpan = document.querySelector(".vvp-modal-footer > span");
                if(footerSpan != null){
                    footerSpan.textContent = "Fehler bei der Abfrage";
                }
                console.error("Fehler bei der Tax Abfrage " + error);
            });
        }else{
            console.log("Tax bereits abgefragt");
            var footerSpan = document.querySelector(".vvp-modal-footer > span");
            footerSpan.textContent = element.querySelector("#VVtaxValue").textContent;
        }
    }
})();
