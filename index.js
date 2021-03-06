// import jsdom, node-fetch
const jsdom = require("jsdom");
const fetch = require("node-fetch");

// import discord.js, config dotenv
const Discord = require("discord.js");
const client = new Discord.Client();
require("dotenv").config();

// Uso il paradigma del cluster di processi per impedire l'interruzione dell'esecuzione
const cluster = require('cluster');
const { exit } = require("process");

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
     * @param {Array<string>} listaPDF La lista dei pdf inclusi nella circolare
     */
    constructor(titolo, link, dataPubblicazione, destinatari, listaPDF) {
        this.titolo = titolo;
        this.link = link;
        this.data = dataPubblicazione;
        this.destinatari = destinatari;
        this.listaPDF = listaPDF;
    }
    log() {
        let str = "Titolo: " + this.titolo;
        str += "\nData di pubblicazione: " + this.data;
        str += "\nDestinatari: " + this.destinatari;
        str += "\nLink: " + this.link;

        str += "\nDocumenti allegati: ";
        this.listaPDF.forEach(pdf => {
            str += pdf + "\n                    "
        });

        console.log(str);
    }
}

/**
 * Questa funzione restituisce una stringa contenente la data e l'ora attuale
 * Esempio: "[2/20/2021 12:46:51 AM]"
 * @returns {string} La data e l'ora attuale come stringa
 */
function getDate() {
    let d = new Date();
    d = "[" + d.toLocaleDateString() + " " + d.toLocaleTimeString() + "]";
    return d;
}

/**
 * Questa funzione restituisce l'HTML della pagina web all'URL fornito
 * @param {string} url L'url della pagina da fetchare
 * @returns {string} L'HTML della pagina sotto forma di string
 */
async function getHTML(url) {
    let response, html;

    do {
        try {
            response = await fetch(url);
            html = await response.text();
        } catch (error) {
            console.error(getDate(), "HTML non recuperato.");
        }
    } while (html == undefined);

    return html;
}

/**
 * Funzione che fa il fetch del sito delle circolari e restituisce la circolare
 * più recente
 * @returns {Circolare} La circolare più recente
 */
async function getCircolare() {
    // Recupero l'HTML della pagina e lo converto in DOM
    let html = await getHTML("https://www.alessandrinimainardi.edu.it/categoria/circolari");
    let dom = new jsdom.JSDOM(html);

    // Recupero il blocco della pagina contente l'ultima circolare pubblicata
    let divBlocco = dom.window.document.querySelector(".views-row-first");

    // Recupero l'intestazione e da essa estrapolo il titolo e il link alla pagina della circolare
    let header;
    try {
        header = divBlocco.children[0].children[0].children[0];
    } catch (error) {
        console.error(getDate(), "Errore nel recupero dei dati.");
    }
    let titolo = header.textContent;
    // header.href restituisce un percorso relativo e non assoluto in funzione del dominio
    let link = 'https://www.alessandrinimainardi.edu.it' + header.href;

    // Recupero la data di pubblicazione e i destinatari, formattando la stringa in modo che sia monolinea e corretta
    let dataPubblicazione = divBlocco.children[2].children[1].textContent;
    let destinatari = divBlocco.children[3].children[0].children[0].textContent
        .replace(/\n/g, ", ").replace(/ A/g, " a");

    // Recupero i link dei PDF dalla pagina web della circolare
    let listaPDF = await getPDFLinks(link);

    return new Circolare(titolo, link, dataPubblicazione, destinatari, listaPDF);
}

/**
 * Questa funzione recupera i link ai vari file PDF presenti nella pagina della circolare e li restituisce in un array di stringhe
 * @param {string} url L'url dal quale estrapolare i link
 * @returns {Array<string>} Array di stringhe contenente tutti i link
 */
async function getPDFLinks(url) {
    // Recupero l'HTML della pagina e lo converto in DOM
    let html = await getHTML(url);
    let dom = new jsdom.JSDOM(html);

    // Recupero l'elenco dei PDF di cui estrapolare il link
    let elencoPDF = dom.window.document.querySelectorAll("span.file");
    let listaLink = [];

    // Estrapolo il link di ogni PDF e lo inserisco in un array
    elencoPDF.forEach(pdf => {
        let link = pdf.children[1].href;
        listaLink.push(link);
    });

    return listaLink;
}

/**
 * La funzione che esegue il programma, caricando la circolare di partenza e
 * verificando se ne è presente una nuova con un infinte loop
 */
async function run() {
    const channel = client.channels.cache.get(process.env.CHANNEL_ID);

    let vecchia = await getCircolare();
    let nuova;

    console.log("\nCircolare di partenza:");
    vecchia.log();
    console.log();

    while (true) {
        nuova = await getCircolare();

        if (nuova.titolo != vecchia.titolo) {
            console.log("================\nNuova circolare!\n================");
            nuova.log();
            console.log();
            vecchia = nuova;

            // Discord embed message
            let msg_embed = new Discord.MessageEmbed()
                .setTitle(nuova.titolo)
                .setURL(nuova.link)
                .addFields(
                    { name: "Data di pubblicazione", value: nuova.data },
                    { name: "Destinatari", value: nuova.destinatari }
                )
                .setColor("#ff8c00");

            // Invio il messaggio embed e un messaggio contenente tutti i pdf
            channel.send(msg_embed).then(() =>
                channel.send({ files: nuova.listaPDF })
            );

        }
    }
}

// Se il processo è il master
if (cluster.isMaster) {
    console.log("In avvio...\n");
    cluster.fork();
    cluster.on('exit', function (worker, code, signal) {
        cluster.fork();
    });
}

// Se il processo è il fork
if (cluster.isWorker) {
    process.on("uncaughtException", error => {
        console.error(getDate(), "Errore non gestito:\n\n", error.stack, "\n");
        exit(1);
    });

    client.once("ready", () => {
        console.log("Bot pronto ad eseguire.");
        console.log("ID canale :", process.env.CHANNEL_ID);
        run();
    })

    client.login(process.env.DISCORD_TOKEN);
}