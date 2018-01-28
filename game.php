<?php

session_start();
if (!isset($_SESSION["user"])) {
    header("Location: index.php");
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
    <script type="text/javascript" src="js/utils.js"></script>
    <script type="text/javascript" src="js/game.js"></script>
    <script type="text/javascript">
        function logOut() {
            ajax({
                method: "POST",
                url: "php/backend.php",
                postdata: urlString({
                    type: "logout"
                }),
                success: function() {
                    window.location.href = "index.php";
                }
            });
        }

        function loadCourses() {
            ajax({
                method: "GET",
                url: "php/backend.php",
                getdata: urlString({
                    type: "courses"
                }),
                success: function(resp) {
                    if (resp.error)
                        alert(resp.data);
                    else {
                        var html = "";
                        for (var i in resp.data) {
                            var course = resp.data[i];

                            html += '<div class="course-div" ';
                            html += 'onclick="startCourse(' + course.width + ',' + course.height + ',' + course.objects + ',' + course.id + ')">';
                            html += '<h2>' + course.name + '</h2>';
                            html += '<strong>Méret: </strong>' + course.width + '×' + course.height;
                            html += '<strong>, akadályok száma: </strong>' + course.objects + '<br>';

                            if (course.maxval != -1) {
                                html += '<strong>Legjobb eredményt elérte: </strong>' + course.maxname;
                                html += '<strong>, pontjai: </strong>' + course.maxval + '<br>';
                            } else
                                html += '<i>Még nincs feljegyzett eredmény, legyél te az első!</i><br>';

                            if (course.usr_score != -1)
                                html += '<strong>Legjobb eredményed ezen a pályán: </strong>' + course.usr_score;
                            else if (course.maxval != -1) // nyilván ki fog íródni, hogy nincs eredmény, abból következik, hogy a usernek sincs
                                html += '<i>Még nincs eredményed ezen a pályán. Próbáld ki!</i>';

                            html += '</div>';
                        }

                        $("#courses").innerHTML = html;
                    }
                },
                error: function() {
                    alert("Hiba történt a szerverrel való kommunikáció során.")
                }
            });
        }

        window.addEventListener('load', loadCourses);
    </script>
</head>
<body>
<div id="content">
    <div id="menu-php" class="window">
        <h1><img src="img/logo.png" id="logo"> A sárkányharcos</h1>
        <div id="subt">Webfejlesztés 2. - PHP beadandó</div>
        <p>Üdv, <?=$_SESSION["user"]["username"]?>! Válassz pályát!</p>

        <div id="courses"></div>

        <input type="button" class="btn" value="Kijelentkezés" id="menu-logout" onclick="logOut()">

        <?php
        if ($_SESSION["user"]["username"] == "admin") {
        ?>

         <a href="addcourse.php"><input type="button" class="btn" value="Új pálya"></a>

        <?php } ?>
        <div class="menu-copy">
            &copy; 2016 Dementor művek
        </div>
    </div>

    <div id="mode1-window" class="window">
        <div id="mode1-score-sign" class="score-sign">Pont: <span id="mode1-score-points"></span></div>
        <div id="mode1-effect-sign" class="effect-sign">
            <span class="effect-icon" id="mode1-effect-icon"></span>
            <span class="effect-text" id="mode1-effect-text"></span>
        </div>
        <div id="mode1-canv"></div>
        <div class="esc-btn btn" id="mode1-esc-btn">Esc: Kilépés</div>
    </div>

    <div id="mode2-window" class="window">
        <div id="mode2-score-sign" class="score-sign">Pont: <span id="mode2-score-points"></span></div>
        <div id="mode2-effect-sign" class="effect-sign">
            <span class="effect-icon" id="mode2-effect-icon"></span>
            <span class="effect-text" id="mode2-effect-text"></span>
        </div>
        <canvas id="mode2-canv" height="490" width="850"></canvas>
        <div class="esc-btn btn" id="mode2-esc-btn">Esc: Kilépés</div>
    </div>

    <div id="endgame-cover"></div>
    <div id="endgame-window-php" class="window">
        <h2>Játék vége</h2>
        <p>A pontjaid: <span id="endgame-points"></span></p>
        <h3 id="top10-h">10 legjobb eredmény ezen a pályán:</h3>
        <div id="top10"></div>
        <input type="button" class="btn" id="endgame-button" value="OK">
    </div>
</div>
</body>
</html>
