// import jsdom, node-fetch
const jsdom = require("jsdom");
const fetch = require("node-fetch");

/**
 * Classe che rappresenta una circolare
 */
class Circolare {
    /**
     * 
     * @param {string} titolo  Il titolo della circolare
     * @param {string} link Il link che porta alla circolare
     * @param {string} dataPubblicazione La data di pubblicazione della circolare
     * @param {string} destinatari I destinatari della circolare
     */
    constructor(titolo, link, dataPubblicazione, destinatari) {
        this.titolo = titolo;
        this.link = 'https://www.alessandrinimainardi.edu.it' + link;
        this.data = dataPubblicazione;
        this.destinatari = destinatari;
    }
    log() {
        console.log("Titolo: " + this.titolo + "\nData di pubblicazione: " + this.data
            + "\nDestinatari: " + this.destinatari + "\nLink: " + this.link);
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
    let divBlocco = dom.window.document
        .querySelector(".views-row.views-row-1.views-row-odd.views-row-first");
    let header = divBlocco.children[0].children[0].children[0];
    let titolo = header.textContent;
    let link = header.href;
    let dataPubblicazione = divBlocco.children[2].children[1].textContent;
    let destinatari = divBlocco.children[3].children[0].children[0].textContent
        .replace(/\n/g, ", ").replace(/ A/g, " a");

    return new Circolare(titolo, link, dataPubblicazione, destinatari);
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