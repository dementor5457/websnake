<?php

session_start();
if (!isset($_SESSION["user"])) {
    header("Location: index.php");
    exit();
} else if ($_SESSION["user"]["username"] != "admin") {
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
    <title>A sárkányharcos - Új pálya</title>

    <link rel="icon" type="image/ico" href="favicon.ico">
    <link href="css/game.css" rel="stylesheet" media="screen, print">

    <script type="text/javascript" src="js/utils.js"></script>
    <script type="text/javascript">
        window.addEventListener('load', function() {
            $("#nc_name").focus();
            $("#nc_form").addEventListener('submit', function(e) {
                e.preventDefault();

                $("#cover").style.display = "block";
                ajax({
                    method: "POST",
                    url: "php/backend.php",
                    postdata: urlString({
                        type: "addcourse",
                        name: $("#nc_name").value,
                        width: $("#nc_width").value,
                        height: $("#nc_height").value,
                        obj: $("#nc_obj").value
                    }),
                    success: function(resp) {
                        if (resp.error)
                            alert(resp.data);
                        else {
                            alert("Az új pálya sikeresen létrejött!");
                            $("#nc_form").reset();
                        }
                        $("#cover").style.display = "none";
                    },
                    error: function() {
                        alert("Hiba történt a szerverrel való kommunikáció során.")
                        $("#cover").style.display = "none";
                    }
                });
            });
        });
    </script>
</head>
<body>
<div id="content">
    <div id="menu-nc" class="window">
        <h1>Pálya hozzáadása</h1>
        <form id="nc_form" action="">
            <div class="menu-div">
                <label class="menu-label" for="nc_name">Név:</label>
                <input type="text" id="nc_name">
            </div>
            <div class="menu-div">
                <label class="menu-label" for="nc_width">Szélesség:</label>
                <input type="number" id="nc_width" value="10" min="10" max="30">
            </div>
            <div class="menu-div">
                <label class="menu-label" for="nc_height">Magasság:</label>
                <input type="number" id="nc_height" value="10" min="10" max="30">
            </div>
            <div class="menu-div">
                <label class="menu-label" for="nc_obj">Akadályok száma:</label>
                <input type="number" id="nc_obj" value="2" min="0" max="10">
            </div>
            <br>
            <input type="submit" class="btn" value="Hozzáadás">
            <input type="reset" class="btn" value="Alaphelyzet">
            <input type="button" class="btn" value="Vissza" onclick="history.go(-1)">
        </form>
    </div>
    <div id="cover"></div>
</div>
</body>
</html>
