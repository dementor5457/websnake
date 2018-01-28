<?php

session_start();
if (isset($_SESSION["user"])) {
    header("Location: game.php");
    exit();
}

?>
<!doctype html>
<html lang="hu">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>A sárkányharcos</title>

    <link rel="icon" type="image/ico" href="favicon.ico">
    <link href="css/game.css" rel="stylesheet" media="screen, print">
</head>
<body>
<div id="content">
    <div id="main" class="window"<?=(!is_writable("php/db") || !is_writeable("php/db/qzBNfOycva.sqlite3") ? ' style="height: 620px !important"' : '')?>>
        <h1><img src="img/logo.png" id="logo"> A sárkányharcos</h1>
        <div id="subt_main">Webfejlesztés 2. - PHP beadandó</div>
        <p>
            Az ősi Kínában – a feljegyzések legalábbis erre utalnak – jóval az időszámításunk előtt volt egy furcsa megmérettetés: kínai vitézek rátermettségüket azzal bizonyították, hogy minél tovább próbálták megülni Chai-Si hegyvidék varázslatos sárkányát. A legjobb vitéz lett az év sárkányharcosa.
        </p>
        <p>
            A szerencsét próbáló vitézek egy arénánál gyülekeztek. Egyesével ültek fel az aréna bejáratánál a sárkány hátára, majd a sárkányt beengedték az arénába. A cél az volt, hogy a sárkánnyal minél több tekercset gyűjtsön be a vitéz. Egyszerre egy tekercset dobtak az aréna véletlenszerű helyére. Ha a sárkány felvette a tekercset, akkor annak hatására bölcsebb és nagyobb lett. Voltak azonban olyan tekercsek, amelyek egyéb varázslatot tartalmaztak. Az arénában ezek mellett lehettek tereptárgyak is.
        </p>
        <p>
            A játékban Te a fiatal és ügyes vitézt, Teng Lenget alakítod. Segíts neki sárkányharcossá válni!
        </p>
        <?php
        if (!is_writable("php/db") || !is_writeable("php/db/B5uUH8bLDv.sqlite3")) {
        ?>
            <p id="main-warn">
                <strong>Fontos: </strong> az alkalmazás nem fogja tudni írni az adatbázist, ha nem módosítod a
                jogosultságokat a következőképp (a projekt gyökérkönyvtárából):
                <br>
                <code>
                    chmod o+w php/db php/db/*.sqlite3
                </code>
            </p>
        <?php
        }
        ?>
		<div id="nologin-btns">
			<a href="nologin_game.html"><input type="button" class="btn btn-margin" value="Játék bejelentkezés nélkül"></a><br>
			<a href="login.php"><input type="button" class="btn btn-margin" value="Bejelentkezés"></a>
			<a href="register.php"><input type="button" class="btn btn-margin" value="Regisztráció"></a>
		</div>
    </div>
</div>
</body>
</html>
