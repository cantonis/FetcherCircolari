// import jsdom, node-fetch
const jsdom = require("jsdom");
const fetch = require("node-fetch");

/**
 * Classe che rappresenta una circolare
 */
class Circolare {
    constructor(titolo, link) {
        this.titolo = titolo;
        this.link = link;
    }
    log() {
        console.log("Titolo: " + this.titolo + "\nLink: " + this.link);
    }
}

/**
 * Funzione che fa il fetch del sito delle circolari e restituisce la circolare
 * più recente
 * @returns {Circolare} La circolare più recente
 */
async function getCircolare() {
    // fetch dell'html delle circolari
    let url = 'https://www.alessandrinimainardi.edu.it/categoria/circolari';
    let response = await fetch(url);
    let html = await response.text();

    // Conversione in DOM e recupero dati
    let dom = new jsdom.JSDOM(html);
    let a = dom.window.document.querySelector(".views-field.views-field-title")
        .children[0].children[0];
    return new Circolare(a.textContent, a.href);
}

/**
 * La funzione che esegue il programma, caricando la circolare di partenza e
 * verificando se ne è presente una nuova con un infinte loop
 */
async function run() {
    let vecchia = await getCircolare();
    let nuova;

    console.log("\nCircolare di partenza:");
    vecchia.log();
    console.log();

    while (true) {
        nuova = await getCircolare();
        if (nuova.titolo != vecchia.titolo) {
            console.log("=====================\nNuova circolare!\n=====================");
            nuova.log();
            console.log();
            vecchia = nuova;
        }
    }
}

run();