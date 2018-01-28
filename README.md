# websnake

Megvalósítás az ELTE-IK Webfejlesztés 2. kurzusának JS+PHP beadandó feladatához.

Kipróbálható az alábbi oldalon: http://dementor.ddns.net/public/websnake/
(Bejelentkezni az *asd@asd.net* e-mail-címmel és *Asd123* jelszóval lehet.)

Az alábbiakban a feladatkiírás olvasható.


## Sárkányharcos

Teng-Leng kalandjai a szerveroldalon folytatódnak!

A PHP-s beadandóban a JavaScript beadandóként elkészített sárkányharcos játékot kell szerveroldali funkcionalitással kiegészíteni.

### Feladatok

*   A főoldalon legyen egy logó és egy rövid leírás a játékról.

*   A főoldalon legyen egy link, amelyre kattintva bejön az első beadandó oldala, és ahol bárki játszhat a játékkal.

*   Legyen lehetőség regisztrálni az alkalmazásba. Ehhez név, jelszó, email cím megadása szükséges. Mindegyik kötelező mező, email cím formátumának ellenőrzése szükséges.

*   Legyen lehetőség bármikor belépni az alkalmazásba. Ehhez az email címet és jelszót kell megadni, mindkettő kötelező legyen, és vizsgáljuk az email mező megfelelő formátumát! Bejelentkezés után a regisztrációkor megadott név jelenik meg a felületeken. Bejelentkezett felhasználónak kilépésre is lehetőséget kell adni.

*   Bejelentkezés után egy listaoldalra kerülünk, ahol előre beállított paraméterű (méret és akadályok száma) pályák kerülnek felsorolásra. A pálya neve és paraméterei mellett fel kell tüntetni, hogy az adott pályán ki érte el a legtöbb pontot, ez mennyi, valamint azt is, hogy a bejelentkezett felhasználó hány pontot ért el eddig a pályán.

*   A listában egy pályára kattintva egy másik oldalon az adott pályával lehet játszani. Itt már nem lehet paramétereket beállítani, csak elindítani a játékot. A játék végeztével az elért pontszámot AJAX hívással kell elmenteni a szerveren, válaszként pedig az adott pálya legjobb 10 játékosát kell visszaadni és megjeleníteni.

*   Legyen egy speciális felhasználó (név: admin, email: admin@admin.hu, jelszó: admin), aki belépve még egy funkcióhoz hozzáfér: új pálya felviteléhez. Itt megadhatja az új pálya nevét, méretét és az akadályok számát. Elmentve az új pálya megjelenik a listaoldalon.
