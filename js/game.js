/*
 * Webfejlesztés 2. (ELTE-IK)
 * Első beadandó feladat (JavaScript)
 * A sárkányharcos: snake-szerű interaktív webes játék
 * Feladatleírás: http://webprogramozas.inf.elte.hu/webfejl2/gyak/js_sarkany.html
 *
 * Készítette: Keszei Ábel
 * Utolsó módosítás: 2016. 05. 14.
 * Frissítve a második beadandó feladathoz
 *
 * Felhasznált eszközök:
 * - is.js (részben): https://github.com/arasatasaygin/is.js/
 */

// játék indítása rögzített adatokkal
function startCourse(width, height, obj, id) {
    gameModel.initCourse(width, height, obj, id);
    gameModel.startGame();
}

// események beállítása betöltődést követően
window.addEventListener('load', function() {
    if ($("#menu-inputs") != null) {
        // menü vezérlőinek alaphelyzetbe állítása
        $("#menu-inputs").reset();
        $("#menu-button").removeAttribute("disabled");

        // menü űrlap submit eseménye: megadott paraméterek játékmodellbe töltése és játék indítása;
        // a játékmodellnek a kijelölt radio button alapján adjuk át a megfelelő megjelenítés objektumot
        $("#menu-inputs").addEventListener('submit', function (e) {
            e.preventDefault();
            var m = parseInt($("#menu-m").value);
            var n = parseInt($("#menu-n").value);
            var k = parseInt($("#menu-k").value);

            gameModel.init(
                m, n, k, $('input[name="mode"]:checked').id == "mode-1" ? mode1View : mode2View
            );
            gameModel.startGame();
        });

        // szám típusú beviteli mezők eseménye változtatáskor
        [].forEach.call($$('#menu-inputs input[type="number"]'), function (input) {
            input.addEventListener('change', function () {
                var m = parseInt($("#menu-m").value);
                var n = parseInt($("#menu-n").value);

                // pálya szélesség/magasság arány ellenőrzése (ne legyen "nyomott")
                // + IE támogatás, mert az nem nézi meg submitkor, hogy számokat írtunk-e be
                if (n / m <= 0.5) {
                    $("#err").innerHTML = "A pálya túl széles a magasságához képest!";
                    $("#err").style.visibility = "visible";
                    $("#menu-button").disabled = "disabled";
                } else if (m / n < 0.6) {
                    $("#err").innerHTML = "A pálya túl magas a szélességéhez képest!";
                    $("#err").style.visibility = "visible";
                    $("#menu-button").disabled = "disabled";
                } else if (browserDetect.isIE() && (isNaN(m) || isNaN(n) || isNaN($("#menu-k").value))) {
                    $("#err").innerHTML = "&nbsp;";
                    $("#menu-button").disabled = "disabled";
                } else {
                    $("#err").style.visibility = "hidden";
                    $("#menu-button").removeAttribute("disabled");
                }
            });

            // a gépelés is változtatásnak számít
            input.addEventListener('keyup', function () {
                if (!browserDetect.isIE())
                    input.dispatchEvent(new Event('change'));
                else {
                    var event = document.createEvent("Event");
                    event.initEvent("change", false, true);
                    input.dispatchEvent(event);
                }
            });
        });

        // az edge nem szereti a HTML+CSS rajzolást
        // (sok időt igénybe vehet a javítása és amúgy is működik a másik mód)
        if (browserDetect.isEdge()) {
            [].forEach.call($$('#menu-inputs input[type="radio"]'), function (input) {
                input.addEventListener('click', function () {
                    if (input.id == "mode-1") {
                        $("#browser-warn").innerHTML = "Az Edge nem szereti ezt a módot. Válaszd a másikat!";
                        $("#browser-warn").style.visibility = "visible";
                    } else
                        $("#browser-warn").style.visibility = "hidden";
                });
            });
        }
    }
    // globális billentyűparancsok
    document.addEventListener('keydown', function(e) {
        // ne lehessen visszalépni a backspace-szel, de a számbevitelnél működjön
        if (e.keyCode == 8 && (e.target.tagName != "INPUT" || e.target.type != "number"))
            e.preventDefault();
        // lehessen leenterezni a játék végi ablakot
        else if ($("#endgame-window") != null && e.keyCode == 13 && $("#endgame-window").style.display != "none")
            $("#endgame-button").click();
        else if ($("#endgame-window-php") != null && e.keyCode == 13 && $("#endgame-window-php").style.display != "none")
            $("#endgame-button").click();

        // billentyűk átadása a játékmodellnek, ha zajlik a játék
        if (gameModel.inprogress)
            gameModel.handleKeyDown(e.keyCode);
    });
});

// blokk enumeráció
var BLOCK = {
    EMPTY:                  0,  // Üres blokk
    DRAGON_BODY:            1,  // A sárkány teste
    DRAGON_HEAD:            2,  // A sárkány feje
    OBJECT:                 3,  // Tereptárgy
    SCROLL_OF_WISDOM:       4,  // Bölcsesség tekercse
    SCROLL_OF_MIRRORS:      5,  // Tükrök tekercse
    SCROLL_OF_INVERSION:    6,  // Fordítás tekercse
    SCROLL_OF_GREEDINESS:   7,  // Mohóság tekercse
    SCROLL_OF_LAZINESS:     8,  // Lustaság tekercse
    SCROLL_OF_GLUTTONY:     9   // Falánkság tekercse
};
Object.freeze(BLOCK);

// irány enumeráció
var ORIENTATION = {
    NORTH: -90,                 // Észak
    EAST:  0,                   // Kelet
    SOUTH: 90,                  // Dél
    WEST:  180                  // Nyugat
};
Object.freeze(ORIENTATION);

// a játékmodell objektuma (háttérlogika)
var gameModel = {
    grid: [],                           // n×m-es rács a blokkoknak
    view: {},                           // a megjelenítés objektuma (HTML5 canvas vagy HTML+CSS)
    width: 10,                          // blokkok száma soronként
    height: 10,                         // blokkok száma oszloponként
    objects: 2,                         // generálandó tereptárgyak száma
    dragon_blocks: [],                  // sárkány blokkjainak tömbje (0. a fej x,y koordinátája, majd így tovább a farkáig)
    interval: 0,                        // a játék fő időzítési intervalluma (ide kerül a setInterval() visszatérési értéke)
    delay: 250,                         // a fő időzítés gyakorisága
    timeout_reset: 0,                   // fő időzítési intervallumot visszaállító időzítés (Mohóság és Lustaság tekercsekhez)
    inprogress: false,                  // logikai változó, igaz, ha a játék folyamatban van
    orientation: ORIENTATION.EAST,      // sárkány iránya
    nextScrollEffect: BLOCK.EMPTY,      // következő lépésben aktiválandó tekercs (vagyis az aktuális lépésben felvett tekercs)
    activeScrollEffect: BLOCK.EMPTY,    // éppen aktív tekercs (pl. Bölcsesség: még nem nőtt 4-et, Mohóság: még nem telt el 5 mp., stb.)
    timeout_scroll: 0,                  // az éppen aktív tekercset (csak vizuálisan) deaktiváló időzítés
    interval_scroll: 0,                 // a Mohóság és Lustaság tekercsek visszaszámlálásának időzítési intervalluma
    grow: 0,                            // a Bölcsesség és Falánkság tekercsek okozta aktuálisan hátralévő növekedésének száma
    mirrorControl: false,               // logikai változó, igaz, ha az irányítás fordított (Tükrök tekercse)
    scrollTime: 0,                      // a Mohóság és Lustaság tekercsek hátralévő másodpercei (ezt csökkenti az interval_scroll)

    course_id: 0,

    initCourse: function(w, h, o, id) {
        this.course_id = id;
        this.init(w, h, o, mode2View);
    },

    // inicializáció a menü paramétereivel és a használt megjelenítéssel
    init: function(w, h, o, v) {
        this.width = w;
        this.height = h;
        this.objects = o;
        this.view = v;

        // rács feltöltése üres blokkokkal
        this.clearGrid();

        // változók alaphelyzetbe tétele, ahol szükséges
        this.dragon_blocks = [];
        this.orientation = ORIENTATION.EAST;
        this.grow = 0;
        this.mirrorControl = false;
        this.scrollTime = 0;

        // sárkány fejének létrehozása a sárkány blokkjainak tömbjében
        this.dragon_blocks.push({
            x: 0,
            y: Math.ceil((this.height - 1) / 2)
        });
        // sárkány blokkjainak rácsra másolása (ez most csak a fej)
        this.dragonBlocksToGrid();

        // tereptárgyak és tekercsek generálása
        this.randomizeObjects();
        this.randomizeScroll();
    },

    // rács kiürítése
    clearGrid: function() {
        for (var i = 0; i < this.width; i++) {
            this.grid[i] = [];
            for (var j = 0; j < this.height; j++) {
                this.grid[i][j] = BLOCK.EMPTY;
            }
        }
    },

    // sárkány blokkjainak másolása a rácsra
    dragonBlocksToGrid: function() {
        // rácson lévő sárkány blokkok levétele
        for (var i = 0; i < this.width; i++) {
            for (var j = 0; j < this.height; j++) {
                if (this.grid[i][j] <= 2)
                    this.grid[i][j] = BLOCK.EMPTY;
            }
        }
        // sárkány blokkok rácsra másolása (0. index esetén fejet, különben test blokkot rakunk)
        for (var i = 0; i < this.dragon_blocks.length; i++) {
            var block = this.dragon_blocks[i];
            this.grid[block.x][block.y] = (i == 0 ? BLOCK.DRAGON_HEAD : BLOCK.DRAGON_BODY);
        }
    },

    // játék indítása: megfelelő logikai változó átbillentése, megjelenítés inicializálása,
    // fő időzítési intervallum indítása
    startGame: function() {
        this.inprogress = true;
        this.view.init();
        this.interval = setInterval(this.step, this.delay);
    },

    // játék vége: megfelelő logikai változó átbillentése, összes időzítés leállítása,
    // tekercs effektek levétele
    endGame: function() {
        this.inprogress = false;
        clearInterval(this.interval);
        clearInterval(this.interval_scroll);
        clearTimeout(this.timeout_reset);
        clearTimeout(this.timeout_scroll);
        this.activeScrollEffect = BLOCK.EMPTY;
        this.nextScrollEffect = BLOCK.EMPTY;

        if ($("#top10") != null) {
            $("#top10").innerHTML = "";
            ajax({
                method: "POST",
                url: "php/backend.php",
                postdata: urlString({
                    type: "score",
                    course: gameModel.course_id,
                    score: gameModel.dragon_blocks.length - 1
                }),
                success: function(resp) {
                    if (resp.error) {
                        $("#top10").innerHTML = "<i>Hiba történt a szerveren.</i>";
                        return;
                    }

                    var html = '<table><tr><th>Hely</th><th>Név</th><th>Pont</th></tr>';
                    var scores = resp.data;
                    var n = 1;
                    for (var i in scores) {
                        var score = scores[i];

                        html += '<tr><td>' + n + '.</td>';
                        html += '<td>' + score.username + '</td>';
                        html += '<td>' + score.score + '</td></tr>';

                        n++;
                    }
                    html += '</table>';
                    $("#top10").innerHTML = html;
                },
                error: function() {
                    $("#top10").innerHTML = "<i>Hiba történt a szerveren.</i>";
                }
            });
        }
    },

    // egy darab lépés: mozgatja a sárkányt és újrarajzoltatja az egészet a megjelenítéssel
    // (mivel ezt időzítésben használjuk, nem írthatunk "this"-t)
    step: function() {
        gameModel.moveDragon();
        gameModel.view.redraw();
    },

    // tekercs randomizáló
    randomizeScroll: function() {
        var pos = {x: 0, y: 0};

        // addig generálunk véletlen koordinátákat, amíg azok nem jelölnek üres cellát
        do {
            pos.x = randBetween(0, this.width - 1);
            pos.y = randBetween(0, this.height - 1);
        } while (this.grid[pos.x][pos.y] != BLOCK.EMPTY);

        // elhelyezünk véletlenszerűen a generált koordinátákon egy tekercset
        var rand = Math.random();
        if (rand < 0.8)
            this.grid[pos.x][pos.y] = BLOCK.SCROLL_OF_WISDOM;       // 80%
        else if (rand < 0.84)
            this.grid[pos.x][pos.y] = BLOCK.SCROLL_OF_MIRRORS;      // 4%
        else if (rand < 0.88)
            this.grid[pos.x][pos.y] = BLOCK.SCROLL_OF_INVERSION;    // 4%
        else if (rand < 0.92)
            this.grid[pos.x][pos.y] = BLOCK.SCROLL_OF_GREEDINESS;   // 4%
        else if (rand < 0.96)
            this.grid[pos.x][pos.y] = BLOCK.SCROLL_OF_LAZINESS;     // 4%
        else
            this.grid[pos.x][pos.y] = BLOCK.SCROLL_OF_GLUTTONY;     // 4%
    },

    // tereptárgy randomizáló (a tekercsek elhelyezése előtt kell hívni!)
    randomizeObjects: function() {
        // kiszámoljuk a kezdőpozíció 2 sugarú körzetét, hogy oda ne tegyünk tereptárgyat
        var startBox = [];
        var head = this.dragon_blocks[0];
        for (var i = 0; i < this.width; i++) {
            for (var j = 0; j < this.height; j++) {
                if (Math.sqrt(Math.pow(head.x - i, 2) + Math.pow(head.y - j, 2)) <= 2)
                    startBox.push(i + "," + j);
            }
        }

        // a paraméterekben meghatározott számú tereptárgyat elhelyezünk a rácson
        for (var i = 0; i < this.objects; i++) {
            var pos = {x: 0, y: 0};

            // addig generálunk koordinátákat, amíg az általuk jelölt cella nincsen benne
            // a kezdőpozíció 2 sugarú körzetében
            do {
                pos.x = randBetween(0, this.width - 1);
                pos.y = randBetween(0, this.height - 1);
            } while (startBox.indexOf(pos.x + "," + pos.y) != -1);

            // elhelyezünk egy tereptárgyat a rácson
            this.grid[pos.x][pos.y] = BLOCK.OBJECT;
        }
    },

    // sárkány mozgatása
    moveDragon: function() {
        // ha az előző lépésben felvettünk egy tekercset, azt most aktiváljuk,
        // majd lerakunk helyette egy másikat
        if (this.nextScrollEffect != BLOCK.EMPTY) {
            this.activateScroll();
            this.randomizeScroll();
        }

        // készítünk a fej koordinátáiról egy mozgatás előtti másolatot,
        // majd az irány szerint mozgatjuk a fejet
        var prev = clone(this.dragon_blocks[0]);
        var head = this.dragon_blocks[0];
        switch (this.orientation) {
            case ORIENTATION.NORTH:
                head.y -= 1;
                break;
            case ORIENTATION.EAST:
                head.x += 1;
                break;
            case ORIENTATION.SOUTH:
                head.y += 1;
                break;
            case ORIENTATION.WEST:
                head.x -= 1;
                break;
        }

        // ha túlmozogtunk a pálya határain, nekimentünk a falnak, tehát vége a játéknak
        if (head.x < 0 || head.x >= this.width || head.y < 0 || head.y >= this.height) {
            this.endGame();
            return;
        }

        // megnézzük, mire léptünk rá:
        // - ha ez a sárkány teste vagy tereptárgy, vége a játéknak
        // - ha ez egy tekercs, aktiváljuk majd a következő lépésben
        var nextBlock = this.grid[this.dragon_blocks[0].x][this.dragon_blocks[0].y];
        if (nextBlock == BLOCK.DRAGON_BODY || nextBlock == BLOCK.OBJECT) {
            this.endGame();
            return;
        } else if (nextBlock >= BLOCK.SCROLL_OF_WISDOM)
            this.nextScrollEffect = nextBlock;


        // ha még csak feje van a sárkánynak, és növesztő effekt van rajta,
        // a fej előző koordinátáit visszatesszük a sárkány blokkjai közé (így "ottmarad" egy sárkány blokk),
        // majd csökkentjük a grow változót (mert így nőttünk egyet)
        if (this.dragon_blocks.length == 1 && this.grow > 0) {
            this.dragon_blocks.push(prev);
            this.grow--;
        }

        // ha nem csak feje van a sárkánynak, a fej kivételével (azt már léptettük)
        // minden sárkány blokkot az utána következő blokk koordinátáira írunk
        // (az első blokk a fej előző helyére lép, ez ugye már a ciklus előtt a prev-ben van)
        for (var i = 1; i < this.dragon_blocks.length; i++) {
            var tmp = clone(this.dragon_blocks[i]);
            this.dragon_blocks[i] = prev;
            prev = tmp;

            // ha az utolsó blokknál járunk, és növesztő effekt van a sárkányon,
            // az utolsó blokkot visszatesszük (így "ottmarad"), majd csökkentjük a grow változót (mert így nőttünk egyet)
            if (i == this.dragon_blocks.length - 1 && this.grow > 0) {
                this.dragon_blocks.push(tmp);
                this.grow--;
                break;
            }
        }

        // a sárkány blokkjait kiírjuk a rácsra
        this.dragonBlocksToGrid();
    },

    // billentyűlenyomások fogadása, irány változtatása megfelelő nyílbillentyűk lenyomására
    handleKeyDown: function(key) {
        switch (key) {
            case 27:    // escape (kilép a játékból)
                this.endGame();
                this.view.redraw();
                break;
            case 37:    // balra nyíl
                this.orientation = this.mirrorControl ? ORIENTATION.EAST : ORIENTATION.WEST;
                break;
            case 38:    // felfele nyíl
                this.orientation = this.mirrorControl ? ORIENTATION.SOUTH : ORIENTATION.NORTH;
                break;
            case 39:    // jobbra nyíl
                this.orientation = this.mirrorControl ? ORIENTATION.WEST : ORIENTATION.EAST;
                break;
            case 40:    // lefele nyíl
                this.orientation = this.mirrorControl ? ORIENTATION.NORTH : ORIENTATION.SOUTH;
                break;
        }
    },

    // tekercs aktiválása
    activateScroll: function() {
        // esetleges előzőleg aktív tekercsek deaktiválása
        this.grow = 0;
        this.mirrorControl = false;
        clearTimeout(this.timeout_reset);
        clearInterval(this.interval);
        this.interval = setInterval(this.step, this.delay);
        clearInterval(this.interval_scroll);
        clearTimeout(this.timeout_scroll);

        // aktív tekercset deaktiváló időzítés által hívott függvény:
        // alaphelyzetbe teszi az aktív tekercset tároló változót, illetve
        // a Mohóság és a Lustaság tekercsek időzítését
        var resetActiveScroll = function() {
            gameModel.activeScrollEffect = BLOCK.EMPTY;
            clearInterval(gameModel.interval_scroll);
        };

        // tekercs effektek kezelése: hatás + lejárat időzítésének beállítása
        switch (this.nextScrollEffect) {
            case BLOCK.SCROLL_OF_WISDOM:        // 4 blokk növekedés (4 lépésnyi lejárat)
                this.grow = 4;
                this.timeout_scroll = setTimeout(resetActiveScroll, 4 * this.delay);
                break;
            case BLOCK.SCROLL_OF_MIRRORS:       // tükrözött irányítás (nincs lejárat)
                this.mirrorControl = true;
                break;
            case BLOCK.SCROLL_OF_INVERSION:     // megfordítás hívása (1 lépésnyi lejárat, hogy látszódjon)
                this.invertDirection();
                this.timeout_scroll = setTimeout(resetActiveScroll, this.delay);
                break;
            case BLOCK.SCROLL_OF_GREEDINESS:    // fő időzítés gyakoriságának növelése + visszaszámlálás (5s lejárat)
                this.changeIntervalDelay(Math.floor(this.delay / 1.5));
                this.timeout_scroll = setTimeout(resetActiveScroll, 5000);
                this.scrollTime = 5;
                this.interval_scroll = setInterval(function() {
                    gameModel.scrollTime--;
                }, 1000);
                break;
            case BLOCK.SCROLL_OF_LAZINESS:      // fő időzítés gyakoriságának csökkentése + visszaszámlálás (5s lejárat)
                this.changeIntervalDelay(Math.floor(this.delay * 1.5));
                this.timeout_scroll = setTimeout(resetActiveScroll, 5000);
                this.scrollTime = 5;
                this.interval_scroll = setInterval(function() {
                    gameModel.scrollTime--;
                }, 1000);
                break;
            case BLOCK.SCROLL_OF_GLUTTONY:      // 10 blokk növekedés (10 lépésnyi lejárat)
                this.grow = 10;
                this.timeout_scroll = setTimeout(resetActiveScroll, 10 * this.delay);
                break;
        }

        // a "következő" effekt innentől az "aktív" és a "következő" üres (hogy ne aktiváljuk a következő lépésben újra)
        this.activeScrollEffect = this.nextScrollEffect;
        this.nextScrollEffect = BLOCK.EMPTY;
    },

    // fő időzítési intervallum gyakoriságának változtatása (megszünteti, majd újraregisztrálja az új gyakorisággal);
    // 5 másodperc után visszaállítja az eredetit
    changeIntervalDelay: function(d) {
        clearInterval(this.interval);
        this.interval = setInterval(this.step, d);
        this.timeout_reset = setTimeout(function() {
            clearInterval(gameModel.interval);
            gameModel.interval = setInterval(gameModel.step, gameModel.delay);
        }, 5000);
    },

    // sárkány blokkjainak megfordítása
    invertDirection: function() {
        // ha csak feje van a sárkánynak, egyszerűen megfordul
        // különben megfordítjuk a sárkány blokkjainak tömbjét
        if (this.dragon_blocks.length == 1) {
            switch (this.orientation) {
                case ORIENTATION.NORTH:
                    this.orientation = ORIENTATION.SOUTH;
                    break;
                case ORIENTATION.SOUTH:
                    this.orientation = ORIENTATION.NORTH;
                    break;
                case ORIENTATION.EAST:
                    this.orientation = ORIENTATION.WEST;
                    break;
                case ORIENTATION.WEST:
                    this.orientation = ORIENTATION.EAST;
                    break;
            }
        } else {
            // kivesszük az utolsó és az utolsó előtti blokkot
            var last = this.dragon_blocks[this.dragon_blocks.length - 1];
            var lastButOne = this.dragon_blocks[this.dragon_blocks.length - 2];

            // megnézzük, hogy merre áll a sárkány farka, mert ez lesz az új irány
            if (last.x > lastButOne.x)
                this.orientation = ORIENTATION.EAST;
            else if (last.x < lastButOne.x)
                this.orientation = ORIENTATION.WEST;
            else if (last.y > lastButOne.y)
                this.orientation = ORIENTATION.SOUTH;
            else
                this.orientation = ORIENTATION.NORTH;

            // visszafele haladva kimásoljuk a blokkokat, majd ez lesz az új tömbünk
            var db_inverse = [];
            for (var i = this.dragon_blocks.length - 1; i >= 0; i--)
                db_inverse.push(this.dragon_blocks[i]);
            this.dragon_blocks = db_inverse;
        }
    }
};

// a HTML+CSS megjelenítés objektuma
var mode1View = {
    win: {},                // ablak elem
    canv: {},               // pálya elem
    block_size: 0,          // blokkméret képpontban (magasság és szélesség is, mert négyzet)
    block_radius: "",       // lekerekített sarkú négyzetek kerekítési sugara (blokkmérettel arányos)
    shadow_size: "",        // árnyék méret (blokkmérettel arányos)
    score_points: {},       // pont kijelző elem
    effect_icon: {},        // tekercs effekt kijelző elem (ikon)
    effect_text: {},        // tekercs effekt kijelző elem (szöveg)

    // megjelenítés inicializációja
    init: function() {
        // elemek lekérdezése
        this.win = $("#mode1-window");
        this.canv = $("#mode1-canv");
        this.score_points = $("#mode1-score-points");
        this.effect_icon = $("#mode1-effect-icon");
        this.effect_text = $("#mode1-effect-text");

        // elemek alaphelyzetbe tétele
        this.score_points.innerHTML = "0";
        this.effect_icon.innerHTML = "";
        this.effect_text.innerHTML = "";

        // edge-nek segítünk "középre tenni" a pálya elemet
        if (browserDetect.isEdge())
            this.canv.style.top = "80px";

        // pálya elem magasságának lekérdezése (CSS-ben van megadva), ez alapján szélesség számítása arányosan
        var canv_h = currentStyle(this.canv).height;
        var canv_w = gameModel.width / gameModel.height * canv_h.substring(0, canv_h.length - 2);
        this.canv.style.width = canv_w + "px";

        // blokkméret, lekerekítési sugár és árnyékméret számítása az előzőekkel arányosan
        this.block_size = canv_w / gameModel.width;
        this.block_radius = Math.floor(0.16 * this.block_size) + "px";
        this.shadow_size = Math.ceil(0.06 * this.block_size) + "px";

        // pont és tekercs effekt jelző elem eltolása, hogy a pálya elemmel egyvonalban legyenek
        var win_w = currentStyle(this.win).width;
        var edgew = Math.floor((win_w.substring(0, win_w.length - 2) - canv_w) / 2) + "px";
        $("#mode1-score-sign").style.left = edgew;
        $("#mode1-effect-sign").style.right = edgew;

        // kilépés gomb eltolása az előzőekhez hasonlóan, gombesemény létrehozása
        var esc = $("#mode1-esc-btn");
        esc.style.right = edgew;
        esc.addEventListener("click", function() {
            if (!gameModel.inprogress)
                return;

            gameModel.endGame();
            gameModel.view.redraw();
        });

        // menüelemek elrejtése, ablak elem mutatása
        $("#menu").style.display = "none";
        $("#content").style.backgroundColor = "transparent";
        this.win.style.display = "block";

        // kezdeti kirajzolás hívása
        this.redraw();
    },

    // pálya újrarajzolása
    redraw: function() {
        // pálya letakarítása
        this.canv.innerHTML = "";

        // rácson található elemek kirajzolása egyenként
        for (var i = 0; i < gameModel.width; i++) {
            for (var j = 0; j < gameModel.height; j++) {
                var block = gameModel.grid[i][j];

                // üres blokkot nem rakunk le
                if (block == BLOCK.EMPTY)
                    continue;

                // elem kezdeti méretének és eltolásának beállítása
                var div = document.createElement("div");
                div.style.width = this.block_size + "px";
                div.style.height = this.block_size + "px";
                div.style.left = this.block_size * i + "px";
                div.style.top = this.block_size * j + "px";

                // blokktípus-függő tulajdonságok beállítása
                switch (block) {
                    case BLOCK.DRAGON_HEAD:             // A sárkány feje
                        // betűméret és eltolás a négyzet bal szélétől (a szemeknek/nyelvnek, blokkmérettel arányosan)
                        var fontsize = Math.ceil(0.3 * this.block_size);
                        var eye_offset_x = Math.floor(0.7 * this.block_size) + "px";

                        // egyik szem: méret, eltolás és szín beállítása
                        var eye1 = document.createElement("div");
                        eye1.style.fontSize = fontsize + "px";
                        eye1.style.left = eye_offset_x;
                        eye1.style.top = Math.floor((this.block_size - 2 * fontsize) / 3) + "px";
                        eye1.style.height = fontsize + "px";
                        eye1.style.lineHeight = fontsize + "px";
                        eye1.style.color = "#7DAB42";
                        eye1.innerHTML = '\u25CF';

                        // másik szem: méret, eltolás és szín beállítása
                        var eye2 = document.createElement("div");
                        eye2.style.position = "absolute";
                        eye2.style.fontSize = fontsize + "px";
                        eye2.style.left = eye_offset_x;
                        eye2.style.top = 2 * Math.floor((this.block_size - 2 * fontsize) / 3) + fontsize + "px";
                        eye2.style.height = fontsize + "px";
                        eye2.style.lineHeight = fontsize + "px";
                        eye2.style.color = "#7DAB42";
                        eye2.innerHTML = '\u25CF';

                        // nyelv: méret, eltolás és szín beállítása
                        var tongue = document.createElement("div");
                        tongue.style.position = "absolute";
                        tongue.style.fontSize = fontsize + "px";
                        tongue.style.left = this.block_size - Math.ceil(0.04 * this.block_size) + "px";
                        tongue.style.top = Math.floor((this.block_size - fontsize) / 2) + "px";
                        tongue.style.height = fontsize + "px";
                        tongue.style.lineHeight = fontsize + "px";
                        tongue.style.color = "#1A1B0D";
                        tongue.innerHTML = '\u25CF';

                        // árnyék generálása a nyelvnek (forgatástól függ, hogy merre vetül)
                        switch (gameModel.orientation) {
                            case ORIENTATION.NORTH:
                                this.generateShadow(true, true, tongue);
                                break;
                            case ORIENTATION.EAST:
                                this.generateShadow(true, false, tongue);
                                break;
                            case ORIENTATION.SOUTH:
                                this.generateShadow(false, false, tongue);
                                break;
                            case ORIENTATION.WEST:
                                this.generateShadow(false, true, tongue);
                                break;
                        }

                        // szemek és nyelv hozzáadása a fej blokkhoz
                        div.appendChild(eye1);
                        div.appendChild(eye2);
                        div.appendChild(tongue);

                        // kerekítési sugár, szín, túlfolyás és forgatás (irány alapján) megadása
                        div.style.borderRadius = this.block_radius;
                        div.style.backgroundColor = "#1A1B0D";
                        div.style.overflow = "visible";
                        div.style.transform = "rotate(" + gameModel.orientation + "deg)";

                        // árnyék generálása a blokknak (forgatástól függ, hogy merre vetül)
                        switch (gameModel.orientation) {
                            case ORIENTATION.NORTH:
                                this.generateShadow(true, true, div);
                                break;
                            case ORIENTATION.EAST:
                                this.generateShadow(true, false, div);
                                break;
                            case ORIENTATION.SOUTH:
                                this.generateShadow(false, false, div);
                                break;
                            case ORIENTATION.WEST:
                                this.generateShadow(false, true, div);
                                break;
                        }

                        // azonosító beállítása
                        div.id = "dh";

                        break;
                    case BLOCK.DRAGON_BODY:             // A sárkány testének blokkjai: kerekítési sugár, szín, árnyék, azonosító
                        div.style.borderRadius = this.block_radius;
                        div.style.backgroundColor = "#1A1B0D";
                        this.generateShadow(true, false, div);
                        div.id = "db_" + i + "_" + j;
                        break;
                    case BLOCK.OBJECT:                  // Tereptárgy: szín, árnyék
                        div.style.backgroundColor = "#1A1B0D";
                        this.generateShadow(true, false, div);
                        break;
                    case BLOCK.SCROLL_OF_WISDOM:        // Bölcsesség tekercse: speciális karakter, méret és árnyék
                        div.innerHTML = '\u0E57';
                        div.style.lineHeight = div.style.height;
                        div.style.fontSize = div.style.height;
                        this.generateShadow(true, false, div);
                        break;
                    case BLOCK.SCROLL_OF_MIRRORS:       // Tükrök tekercse: speciális karakter, méret és árnyék
                        div.innerHTML = '\u0E51';
                        div.style.lineHeight = div.style.height;
                        div.style.fontSize = div.style.height;
                        this.generateShadow(true, false, div);
                        break;
                    case BLOCK.SCROLL_OF_INVERSION:     // Fordítás tekercse: speciális karakter, méret és árnyék
                        div.innerHTML = '\u0E53';
                        div.style.lineHeight = div.style.height;
                        div.style.fontSize = div.style.height;
                        this.generateShadow(true, false, div);
                        break;
                    case BLOCK.SCROLL_OF_GREEDINESS:    // Mohóság tekercse: speciális karakter, méret és árnyék
                        div.innerHTML = '\u0E58';
                        div.style.lineHeight = div.style.height;
                        div.style.fontSize = div.style.height;
                        this.generateShadow(true, false, div);
                        break;
                    case BLOCK.SCROLL_OF_LAZINESS:      // Lustaság tekercse: speciális karakter, méret és árnyék
                        div.innerHTML = '\u0E54';
                        div.style.lineHeight = div.style.height;
                        div.style.fontSize = div.style.height;
                        this.generateShadow(true, false, div);
                        break;
                    case BLOCK.SCROLL_OF_GLUTTONY:      // Falánkság tekercse: speciális karakter, méret és árnyék
                        div.innerHTML = '\u0E56';
                        div.style.lineHeight = div.style.height;
                        div.style.fontSize = div.style.height;
                        this.generateShadow(true, false, div);
                        break;
                }

                // az aktuális blokk elemet a pálya elemhez adjuk
                this.canv.appendChild(div);

                // ha vége a játéknak, a sárkány blokkjain lejátsszuk a játék végi animációkat
                if (!gameModel.inprogress) {
                    if (block == BLOCK.DRAGON_HEAD)
                        this.playEndAnims(i, j, true);
                    else if (block == BLOCK.DRAGON_BODY)
                        this.playEndAnims(i, j, false);
                }
            }
        }

        // az éppen aktív tekercs effektet a kijelző elemeken kirajzoljuk
        switch (gameModel.activeScrollEffect) {
            case BLOCK.SCROLL_OF_WISDOM:
                this.effect_icon.innerHTML = '\u0E57';
                this.effect_text.innerHTML = "Bölcsesség";
                break;
            case BLOCK.SCROLL_OF_MIRRORS:
                this.effect_icon.innerHTML = '\u0E51';
                this.effect_text.innerHTML = "Tükrök";
                break;
            case BLOCK.SCROLL_OF_INVERSION:
                this.effect_icon.innerHTML = '\u0E53';
                this.effect_text.innerHTML = "Fordítás";
                break;
            case BLOCK.SCROLL_OF_GREEDINESS:
                this.effect_icon.innerHTML = '\u0E58';
                this.effect_text.innerHTML = "Mohóság (" + gameModel.scrollTime + ")";
                break;
            case BLOCK.SCROLL_OF_LAZINESS:
                this.effect_icon.innerHTML = '\u0E54';
                this.effect_text.innerHTML = "Lustaság (" + gameModel.scrollTime + ")";
                break;
            case BLOCK.SCROLL_OF_GLUTTONY:
                this.effect_icon.innerHTML = '\u0E56';
                this.effect_text.innerHTML = "Falánkság";
                break;
            default:
                this.effect_icon.innerHTML = "";
                this.effect_text.innerHTML = "";
                break;
        }

        // a pontjelző elemre kiírjuk az aktuális pontszámot
        this.score_points.innerHTML = gameModel.dragon_blocks.length - 1;
    },

    // blokkmérettel arányos árnyék generálása a megadott elemen, amely a megadott irányba vetül
    generateShadow: function(neg1, neg2, element) {
        var s = "drop-shadow(" + (neg1 ? "-" : "") + this.shadow_size + " " + (neg2 ? "-" : "") + this.shadow_size + " rgba(0, 0, 0, 0.3))";
        if (browserDetect.isChrome())
            element.style.webkitFilter = s;
        else
            element.style.filter = s;
    },

    // árnyék levétele a megadott elemről
    removeShadow: function(element) {
        if (browserDetect.isChrome())
            element.style.webkitFilter = "";
        else
            element.style.filter = "";
    },

    // játék végi animációk lejátszása a megadott koordinátájú blokkokon (vagy a fejen, ha a megfelelő paraméter igaz)
    playEndAnims: function(x, y, head) {
        var block = head ? $("#dh") : $("#db_" + x + "_" + y);

        // eltoló transzformáció végrehajtása időzítve
        setTimeout(function() {
            gameModel.view.block_translate(x, y, block, head);
        }, 100);

        // eltoltó transzformáció visszavonása, majd kicsinyítő animáció indítása időzítve
        setTimeout(function() {
            gameModel.view.block_translate_back(block, head);
            gameModel.view.scale_block(block, head);
        }, 300);

        // fej esetén sírkő kirajzolása időzítve
        if (head)
            setTimeout(function() { gameModel.view.displayGraveStone(block); }, 1600);

        // játék végi ablak megjelenítése időzítve
        setTimeout(this.showEndGameWindow, 2000);
    },

    // megadott blokk eltolása a blokkméret negyedével, a mozgás irányában
    block_translate: function(x, y, block, head) {
        var u = Math.floor(this.block_size / 4);

        // fej esetében az irány szerint toljuk el a blokkot és újraalkalmazzuk a megfelelő forgatást is
        if (head) {
            var d = {x: 0, y: 0};
            switch (gameModel.orientation) {
                case ORIENTATION.NORTH:
                    d.y -= u;
                    break;
                case ORIENTATION.SOUTH:
                    d.y += u;
                    break;
                case ORIENTATION.EAST:
                    d.x += u;
                    break;
                case ORIENTATION.WEST:
                    d.x -= u;
                    break;
            }

            block.style.transform = "translate(" + d.x + "px, " + d.y + "px) rotate(" + gameModel.orientation + "deg)";

        // különben megkeressük a sárkány adott blokkjának rákövetkezőjét (tömbben az eggyel kisebb elem) és afelé toljuk
        } else {
            var prev;
            for (var i = 1; i < gameModel.dragon_blocks.length; i++) {
                var b = gameModel.dragon_blocks[i];
                if (b.x == x && b.y == y) {
                    prev = gameModel.dragon_blocks[i - 1];
                    break;
                }
            }

            var d = {x: 0, y: 0};
            if (prev.x > x)
                d.x += u;
            else if (prev.x < x)
                d.x -= u;
            else if (prev.y > y)
                d.y += u;
            else
                d.y -= u;

            block.style.transform = "translate(" + d.x + "px, " + d.y + "px)";
        }
    },

    // megadott blokk eltolásának megszüntetése (fej esetén a megfelelő forgatás újraalkalmazása)
    block_translate_back: function(block, head) {
        if (head)
            block.style.transform = "rotate(" + gameModel.orientation + "deg)";
        else
            block.style.transform = "";
    },

    // összekicsinyítő animáció elvégzése a megadott elemen
    // (5 lépésben, lépésenként 20%-kal csökkentjük a méretét "scale" transzformációval)
    scale_block: function(element, head) {
        var scaleCount = 1;
        var scaleInterv = setInterval(function() {
            element.style.transform = "scale(" + (1 - 0.2 * scaleCount) + ")";
            element.style.transform += head ? " rotate(" + gameModel.orientation + "deg)" : "";

            if (++scaleCount > 5) {
                clearInterval(scaleInterv);

                // előfordul, hogy bár 0 a scale, látszik az elem, így elrejtjük
                // (kivéve a fejet, mert azt a sírkőre cseréljük)
                if (!head)
                    element.style.display = "none";
            }
        }, 250);
    },

    // sírkő megjelenítése a fej helyén: kép betöltése img elembe, méret, árnyék, stb. beállítása
    displayGraveStone: function(head) {
        var img = document.createElement("img");
        img.src = "img/rip.png";
        img.style.width = "100%";
        img.style.height = "100%";
        gameModel.view.generateShadow(true, false, img);
        head.innerHTML = "";
        head.appendChild(img);
        head.style.backgroundColor = "";
        head.style.transform = "";
        gameModel.view.removeShadow(head);
    },

    // játék végi ablak megjelenítése: pontok átmásolása az ablakba, ablak elemeinek mutatása,
    // ablakot bezáró gomb eseményének írása
    showEndGameWindow: function() {
        $("#endgame-points").innerHTML = gameModel.dragon_blocks.length - 1;
        $("#endgame-cover").style.display = "block";
        $("#endgame-window").style.display = "block";

        // ablakot bezáró gomb eseménye: elrejti az eredmény ablakot, és megjeleníti a menü elemeit
        removeEventListeners($("#endgame-button"));
        $("#endgame-button").addEventListener("click", function() {
            $("#endgame-cover").style.display = "none";
            $("#endgame-window").style.display = "none";
            $("#mode1-window").style.display = "none";
            $("#menu").style.display = "block";
            $("#content").style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        });
    }
};

// a HTML5 canvas megjelenítés objektuma
var mode2View = {
    win: {},                    // ablak elem
    canv: {},                   // pálya elem (HTML5 vászon)
    context: {},                // a vászon rajzoló kontextusa
    block_size: 0,              // blokkméret képpontban (magasság és szélesség is, mert négyzet)
    block_radius: 0,            // lekerekített sarkú négyzetek kerekítési sugara (blokkmérettel arányos)
    score_points: {},           // pont kijelző elem
    effect_icon: {},            // tekercs effekt kijelző elem (ikon)
    effect_text: {},            // tekercs effekt kijelző elem (szöveg)
    translate_dragon: false,    // logikai változó, ha igaz, a sárkányt a blokkméret negyedével eltolva rajzoljuk ki
    scale_dragon: 1,            // együttható a sárkány blokkjainak méretéhez (a kicsinyítő animációhoz)
    endAnimsPlaying: false,     // logikai változó, igaz, ha a játék végi animációk épp lejátszódnak

    // megjelenítés inicializációja
    init: function() {
        // elemek lekérdezése
        this.win = $("#mode2-window");
        this.canv = $("#mode2-canv");
        this.score_points = $("#mode2-score-points");
        this.effect_icon = $("#mode2-effect-icon");
        this.effect_text = $("#mode2-effect-text");

        // rajzoló kontextus lekérdezése a vászontól
        this.context = this.canv.getContext("2d");

        // változók alaphelyzetbe tétele
        this.translate_dragon = false;
        this.scale_dragon = 1;
        this.endAnimsPlaying = false;

        // elemek alaphelyzetbe tétele
        this.score_points.innerHTML = "0";
        this.effect_icon.innerHTML = "";
        this.effect_text.innerHTML = "";

        // edge-nek és IE-nek segítünk "középre tenni" a vásznat
        if (browserDetect.isEdge() || browserDetect.isIE())
            this.canv.style.top = "80px";

        // vászon szélességének számítása annak magasságával és a pálya blokkszámaival arányosan
        this.canv.width = gameModel.width / gameModel.height * this.canv.height;

        // blokkméret és lekerekítési sugár számítása az előzőekkel arányosan
        this.block_size = this.canv.width / gameModel.width;
        this.block_radius = Math.floor(0.16 * this.block_size);

        // pont és tekercs effekt jelző elem eltolása, hogy a pálya elemmel egyvonalban legyenek
        var win_w = currentStyle(this.win).width;
        var edgew = Math.floor((win_w.substring(0, win_w.length - 2) - this.canv.width) / 2) + "px";
        $("#mode2-score-sign").style.left = edgew;
        $("#mode2-effect-sign").style.right = edgew;

        // kilépés gomb eltolása az előzőekhez hasonlóan, gombesemény létrehozása
        var esc = $("#mode2-esc-btn");
        esc.style.right = edgew;
        esc.addEventListener("click", function() {
            if (!gameModel.inprogress)
                return;

            gameModel.endGame();
            gameModel.view.redraw();
        });

        // menüelemek elrejtése, ablak elem mutatása
        if ($("#menu") != null)
            $("#menu").style.display = "none";
        else
            $("#menu-php").style.display = "none";

        $("#content").style.backgroundColor = "transparent";
        this.win.style.display = "block";

        // kezdeti kirajzolás hívása
        this.redraw();
    },

    // pálya újrarajzolása
    redraw: function() {
        // pálya letakarítása, kitöltési stílus és árnyékszín beállítása
        this.context.clearRect(0, 0, this.canv.width, this.canv.height);
        this.context.fillStyle = "#1A1B0D";
        this.context.shadowColor = "rgba(0, 0, 0, 0.3)";

        // rácson található elemek kirajzolása egyenként
        for (var i = 0; i < gameModel.width; i++) {
            for (var j = 0; j < gameModel.height; j++) {
                // árnyék pozíciójának beállítása a blokkmérettel arányosan
                this.context.shadowOffsetX = -1 * Math.ceil(0.06 * this.block_size);
                this.context.shadowOffsetY = Math.ceil(0.06 * this.block_size);

                // blokkpozíció számítása a blokkméretből
                var block = gameModel.grid[i][j];
                var pos = {
                    x: this.block_size * i,
                    y: this.block_size * j
                };

                // kirajzolás a vászonra az aktuális blokk típusától függően
                switch (block) {
                    case BLOCK.DRAGON_HEAD:             // A sárkány feje
                        // árnyék pozíciójának felülírása, hogy ennél a típusnál hasson a blokkskálázás
                        this.context.shadowOffsetX = -1 * Math.ceil(0.06 * this.block_size * this.scale_dragon);
                        this.context.shadowOffsetY = Math.ceil(0.06 * this.block_size * this.scale_dragon);

                        // eltolás számítása, ha az eltolást jelző logikai változó igaz (különben 0 mindkét irányban)
                        var translate = this.translate_dragon ? this.block_translate(i, j, true) : {x: 0, y: 0};

                        // sárkány fejét kirajzoló metódus hívása
                        this.drawDragonHead(pos.x + translate.x, pos.y + translate.y);
                        break;
                    case BLOCK.DRAGON_BODY:             // A sárkány testének blokkjai
                        // árnyék pozíciójának felülírása, hogy ennél a típusnál hasson a blokkskálázás
                        this.context.shadowOffsetX = -1 * Math.ceil(0.06 * this.block_size * this.scale_dragon);
                        this.context.shadowOffsetY = Math.ceil(0.06 * this.block_size * this.scale_dragon);

                        // kicsinyítéskori eltolás számítása (hogy ne a bal felső sarok felé kicsinyítsünk, hanem középre)
                        var offset = this.scale_dragon == 1 ? 0 : Math.floor(this.block_size * (1 - this.scale_dragon) / 2);

                        // eltolás számítása, ha az eltolást jelző logikai változó igaz (különben 0 mindkét irányban)
                        var translate = this.translate_dragon ? this.block_translate(i, j, false) : {x: 0, y: 0};

                        // lekerekített sarkú négyzet rajzolása
                        this.drawRoundedRect(
                            pos.x + offset + translate.x,
                            pos.y + offset + translate.y,
                            this.block_radius * this.scale_dragon,
                            this.block_size * this.scale_dragon
                        );
                        break;
                    case BLOCK.OBJECT:                  // Tereptárgy: egyszerű téglalaprajzolás hívása a vásznon
                        this.context.fillRect(pos.x, pos.y, this.block_size, this.block_size);
                        break;
                    case BLOCK.SCROLL_OF_WISDOM:        // Bölcsesség tekercse: karakter kirajzolás a vásznon (+ betűtípus miatt szükséges eltolás)
                        this.context.font = this.block_size + "px Krungthep";
                        this.context.fillText(
                            '\u0E57',
                            pos.x,
                            pos.y + Math.ceil(this.block_size * 0.8)
                        );
                        break;
                    case BLOCK.SCROLL_OF_MIRRORS:       // Tükrök tekercse: karakter kirajzolás a vásznon (+ betűtípus miatt szükséges eltolás)
                        this.context.font = this.block_size + "px Krungthep";
                        this.context.fillText(
                            '\u0E51',
                            pos.x + Math.floor(this.block_size * 0.15),
                            pos.y + Math.ceil(this.block_size * 0.8)
                        );
                        break;
                    case BLOCK.SCROLL_OF_INVERSION:     // Fordítás tekercse: karakter kirajzolás a vásznon (+ betűtípus miatt szükséges eltolás)
                        this.context.font = this.block_size + "px Krungthep";
                        this.context.fillText(
                            '\u0E53',
                            pos.x + Math.floor(this.block_size * 0.15),
                            pos.y + Math.ceil(this.block_size * 0.8)
                        );
                        break;
                    case BLOCK.SCROLL_OF_GREEDINESS:    // Mohóság tekercse: karakter kirajzolás a vásznon (+ betűtípus miatt szükséges eltolás)
                        this.context.font = this.block_size + "px Krungthep";
                        this.context.fillText(
                            '\u0E58',
                            pos.x + Math.floor(this.block_size * 0.15),
                            pos.y + Math.ceil(this.block_size * 0.8)
                        );
                        break;
                    case BLOCK.SCROLL_OF_LAZINESS:      // Lustaság tekercse: karakter kirajzolás a vásznon (+ betűtípus miatt szükséges eltolás)
                        this.context.font = this.block_size + "px Krungthep";
                        this.context.fillText(
                            '\u0E54',
                            pos.x + Math.floor(this.block_size * 0.15),
                            pos.y + Math.ceil(this.block_size * 0.8)
                        );
                        break;
                    case BLOCK.SCROLL_OF_GLUTTONY:      // Falánkság tekercse: karakter kirajzolás a vásznon (+ betűtípus miatt szükséges eltolás)
                        this.context.font = this.block_size + "px Krungthep";
                        this.context.fillText(
                            '\u0E56',
                            pos.x + Math.floor(this.block_size * 0.2),
                            pos.y + Math.ceil(this.block_size * 0.8)
                        );
                        break;
                }
            }
        }

        // az éppen aktív tekercs effektet a kijelző elemeken kirajzoljuk
        switch (gameModel.activeScrollEffect) {
            case BLOCK.SCROLL_OF_WISDOM:
                this.effect_icon.innerHTML = '\u0E57';
                this.effect_text.innerHTML = "Bölcsesség";
                break;
            case BLOCK.SCROLL_OF_MIRRORS:
                this.effect_icon.innerHTML = '\u0E51';
                this.effect_text.innerHTML = "Tükrök";
                break;
            case BLOCK.SCROLL_OF_INVERSION:
                this.effect_icon.innerHTML = '\u0E53';
                this.effect_text.innerHTML = "Fordítás";
                break;
            case BLOCK.SCROLL_OF_GREEDINESS:
                this.effect_icon.innerHTML = '\u0E58';
                this.effect_text.innerHTML = "Mohóság (" + gameModel.scrollTime + ")";
                break;
            case BLOCK.SCROLL_OF_LAZINESS:
                this.effect_icon.innerHTML = '\u0E54';
                this.effect_text.innerHTML = "Lustaság (" + gameModel.scrollTime + ")";
                break;
            case BLOCK.SCROLL_OF_GLUTTONY:
                this.effect_icon.innerHTML = '\u0E56';
                this.effect_text.innerHTML = "Falánkság";
                break;
            default:
                this.effect_icon.innerHTML = "";
                this.effect_text.innerHTML = "";
                break;
        }

        // a pontjelző elemre kiírjuk az aktuális pontszámot
        this.score_points.innerHTML = gameModel.dragon_blocks.length - 1;

        // ha vége a játéknak, a sárkány blokkjain lejátsszuk a játék végi animációkat
        if (!gameModel.inprogress && !this.endAnimsPlaying)
            this.playEndAnims();
    },

    // lekerekített sarkú téglalap rajzolása
    drawRoundedRect: function(x, y, r, w) {
        this.context.beginPath();
        this.context.moveTo(x + r, y);
        this.context.lineTo(x + w - r, y);
        this.context.quadraticCurveTo(x + w, y, x + w, y + r);
        this.context.lineTo(x + w, y + w - r);
        this.context.quadraticCurveTo(x + w, y + w, x + w - r, y + w);
        this.context.lineTo(x + r, y + w);
        this.context.quadraticCurveTo(x, y + w, x, y + w - r);
        this.context.lineTo(x, y + r);
        this.context.quadraticCurveTo(x, y, x + r, y);
        this.context.closePath();
        this.context.fill();
    },

    // kör rajzolása
    fillCircle: function(circle) {
        this.context.beginPath();
        this.context.arc(circle.x, circle.y, circle.r, 0, 2 * Math.PI);
        this.context.fill();
    },

    // kör kivágása
    clearCircle: function(circle) {
        this.context.save();
        this.context.shadowOffsetX = 0;
        this.context.shadowOffsetY = 0;
        this.context.shadowColor = "";
        this.context.globalCompositeOperation = 'destination-out';
        this.context.beginPath();
        this.context.arc(circle.x, circle.y, circle.r, 0, 2 * Math.PI, false);
        this.context.fill();
        this.context.restore();
    },

    // sárkányfej rajzolása
    drawDragonHead: function(x, y) {
        // sárkányfej szélességének és magasságának számítása a blokkméret és a skálázási együttható (kicsinyítéshez) alapján
        var w = this.block_size * this.scale_dragon;

        // sárkányfej kicsinyítéskori eltolásának számítása (hogy ne a bal felső sarok felé kicsinyítsünk, hanem középre)
        var offset = this.scale_dragon == 1 ? 0 : Math.floor(this.block_size * (1 - this.scale_dragon) / 2);
        x += offset;
        y += offset;

        // a sárkányfej alapját képező, lekerekített sarkú négyzet rajzolása
        this.drawRoundedRect(x, y, this.block_radius * this.scale_dragon, w);

        // legyen a szélesség ötöde az egységünk, és legyen a szemek, illetve a nyelv körének sugara az egység fele
        var u = w / 5;
        var r = Math.floor(u / 2);

        // a szemek és a nyelv x,y pozíciójának kiszámítása iránytól függően ("arra néz" a sárkány)
        var circles = {};
        switch (gameModel.orientation) {
            case ORIENTATION.NORTH:
                circles.eye1 = {
                    x: x + Math.floor(1.5 * u),
                    y: y + Math.floor(0.2 * w),
                    r: r
                };
                circles.eye2 = {
                    x: x + Math.floor(3.5 * u),
                    y: y + Math.floor(0.2 * w),
                    r: r
                };
                circles.tongue = {
                    x: x + Math.floor(w / 2),
                    y: y - Math.floor(u / 2) + Math.ceil(w * 0.04),
                    r: r
                };
                break;
            case ORIENTATION.EAST:
                circles.eye1 = {
                    x: x + Math.floor(0.8 * w),
                    y: y + Math.floor(1.5 * u),
                    r: r
                };
                circles.eye2 = {
                    x: x + Math.floor(0.8 * w),
                    y: y + Math.floor(3.5 * u),
                    r: r
                };
                circles.tongue = {
                    x: x + w + Math.floor(u / 2) - Math.ceil(w * 0.04),
                    y: y + Math.floor(w / 2),
                    r: r
                };
                break;
            case ORIENTATION.SOUTH:
                circles.eye1 = {
                    x: x + Math.floor(1.5 * u),
                    y: y + Math.floor(0.8 * w),
                    r: r
                };
                circles.eye2 = {
                    x: x + Math.floor(3.5 * u),
                    y: y + Math.floor(0.8 * w),
                    r: r
                };
                circles.tongue = {
                    x: x + Math.floor(w / 2),
                    y: y + w + Math.floor(u / 2) - Math.ceil(w * 0.04),
                    r: r
                };
                break;
            case ORIENTATION.WEST:
                circles.eye1 = {
                    x: x + Math.floor(0.2 * w),
                    y: y + Math.floor(1.5 * u),
                    r: r
                };
                circles.eye2 = {
                    x: x + Math.floor(0.2 * w),
                    y: y + Math.floor(3.5 * u),
                    r: r
                };
                circles.tongue = {
                    x: x - Math.floor(u / 2) + Math.ceil(w * 0.04),
                    y: y + Math.floor(w / 2),
                    r: r
                };
                break;
        }

        // körök kivágása/kirajzolása a számított értékek alapján
        this.clearCircle(circles.eye1);
        this.clearCircle(circles.eye2);
        this.fillCircle(circles.tongue);
    },

    // játék végi animációk lejátszása
    playEndAnims: function() {
        this.endAnimsPlaying = true;

        // eltoló transzformáció lejátszása időzítve: eltolást jelző változó átbillentése, majd újrarajzolás hívása
        setTimeout(function() {
            gameModel.view.translate_dragon = true;
            gameModel.view.redraw();
        }, 100);

        // eltoltó transzformáció visszavonása, majd kicsinyítő animáció indítása időzítve:
        // eltolást jelző változó visszabillentése, újrarajzolás hívása, majd kicsinyítő animáció indítása
        setTimeout(function() {
            gameModel.view.translate_dragon = false;
            gameModel.view.redraw();
            gameModel.view.scale_block();
        }, 300);

        // sírkő kirajzolása időzítve
        setTimeout(this.displayGraveStone, 1600);

        // játék végi ablak megjelenítése időzítve
        setTimeout(this.showEndGameWindow, 2000);
    },

    // megadott blokk eltolási vektorának számítása a blokkméret negyede alapján, a mozgás irányában
    block_translate: function(x, y, head) {
        var u = Math.floor(this.block_size / 4);

        // fej esetében az irány szerint toljuk el a blokkot
        if (head) {
            var d = {x: 0, y: 0};
            switch (gameModel.orientation) {
                case ORIENTATION.NORTH:
                    d.y -= u;
                    break;
                case ORIENTATION.SOUTH:
                    d.y += u;
                    break;
                case ORIENTATION.EAST:
                    d.x += u;
                    break;
                case ORIENTATION.WEST:
                    d.x -= u;
                    break;
            }

        // különben megkeressük a sárkány adott blokkjának rákövetkezőjét (tömbben az eggyel kisebb elem) és afelé toljuk
        } else {
            var prev;
            for (var i = 1; i < gameModel.dragon_blocks.length; i++) {
                var b = gameModel.dragon_blocks[i];
                if (b.x == x && b.y == y) {
                    prev = gameModel.dragon_blocks[i - 1];
                    break;
                }
            }

            var d = {x: 0, y: 0};
            if (prev.x > x)
                d.x += u;
            else if (prev.x < x)
                d.x -= u;
            else if (prev.y > y)
                d.y += u;
            else
                d.y -= u;
        }

        return d;
    },

    // összekicsinyítő animáció elvégzése: a sárkány méretének együtthatóját csökkentjük 20%-kal,
    // majd meghívjuk az újrarajzolást (mindezt 5 lépésben)
    scale_block: function() {
        var scaleCount = 1;
        var scaleInterv = setInterval(function() {
            gameModel.view.scale_dragon -= 0.2;
            gameModel.view.redraw();

            if (++scaleCount > 5)
                clearInterval(scaleInterv);
        }, 250);
    },

    // sírkő megjelenítése a fej helyén
    displayGraveStone: function() {
        // betöltjük a képet
        var img = new Image();
        img.src = "img/rip.png";

        // megnézzük, hogy hol van a fej: ha a határokon kívül, vagy egy tereptárgyban, visszaléptetjük az irány szerint
        // (a sírkövet az utolsó pozíciójára szeretnénk tenni, nem a "falba"; ha viszont ez nem áll fent,
        // a játék végét kilépés okozta (azaz nem mentünk neki semminek), így jó nekünk a pozíció)
        var head = gameModel.dragon_blocks[0];
        if (head.x < 0 || head.x >= gameModel.width || head.y < 0 || head.y >= gameModel.height || gameModel.grid[head.x][head.y] == BLOCK.OBJECT) {
            switch (gameModel.orientation) {
                case ORIENTATION.NORTH:
                    head.y++;
                    break;
                case ORIENTATION.SOUTH:
                    head.y--;
                    break;
                case ORIENTATION.EAST:
                    head.x--;
                    break;
                case ORIENTATION.WEST:
                    head.x++;
                    break;
            }
        }

        // ha betöltődött a kép, kirajzoljuk a már kiszámolt pozícióra, blokkmérettel arányos árnyékkal
        img.addEventListener("load", function() {
            gameModel.view.context.shadowColor = "rgba(0, 0, 0, 0.3)";
            gameModel.view.context.shadowOffsetX = -1 * Math.ceil(0.06 * gameModel.view.block_size);
            gameModel.view.context.shadowOffsetY = Math.ceil(0.06 * gameModel.view.block_size);
            gameModel.view.context.drawImage(
                img,
                head.x * gameModel.view.block_size,
                head.y * gameModel.view.block_size,
                gameModel.view.block_size,
                gameModel.view.block_size
            );
        });
    },

    // játék végi ablak megjelenítése: pontok átmásolása az ablakba, ablak elemeinek mutatása,
    // ablakot bezáró gomb eseményének írása
    showEndGameWindow: function() {
        $("#endgame-points").innerHTML = gameModel.dragon_blocks.length - 1;
        $("#endgame-cover").style.display = "block";

        if ($("#endgame-window") != null)
            $("#endgame-window").style.display = "block";
        else
            $("#endgame-window-php").style.display = "block";

        // ablakot bezáró gomb eseménye: elrejti az eredmény ablakot, és megjeleníti a menü elemeit
        removeEventListeners($("#endgame-button"));
        $("#endgame-button").addEventListener("click", function() {
            $("#endgame-cover").style.display = "none";

            if ($("#endgame-window") != null)
                $("#endgame-window").style.display = "none";
            else
                $("#endgame-window-php").style.display = "none";

            $("#mode2-window").style.display = "none";

            if ($("#menu") != null)
                $("#menu").style.display = "block";
            else {
                $("#menu-php").style.display = "block";
                loadCourses();
            }

            $("#content").style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        });
    }
};