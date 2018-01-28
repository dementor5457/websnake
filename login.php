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
    <title>A sárkányharcos - Bejelentkezés</title>

    <link rel="icon" type="image/ico" href="favicon.ico">
    <link href="css/game.css" rel="stylesheet" media="screen, print">

    <script type="text/javascript" src="js/utils.js"></script>
    <script type="text/javascript">
        window.addEventListener('load', function() {
            $("#login_email").focus();
            $("#login_form").addEventListener('submit', function(e) {
                e.preventDefault();

                $("#cover").style.display = "block";
                ajax({
                    method: "POST",
                    url: "php/backend.php",
                    postdata: urlString({
                        type: "login",
                        email: $("#login_email").value,
                        psw: $("#login_psw").value
                    }),
                    success: function(resp) {
                        if (resp.error)
                            alert(resp.data);
                        else {
                            window.location.href = "game.php";
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
    <div id="menu-login" class="window">
        <h1>Bejelentkezés</h1>
        <form id="login_form" action="">
            <div class="menu-div">
                <label class="menu-label" for="login_email">E-mail cím:</label>
                <input type="text" id="login_email">
            </div>
            <div class="menu-div">
                <label class="menu-label" for="login_psw">Jelszó:</label>
                <input type="password" id="login_psw">
            </div>
            <br>
            <input type="submit" class="btn" value="Bejelentkezés">
            <input type="button" class="btn" value="Vissza" onclick="history.go(-1)">
        </form>
    </div>
    <div id="cover"></div>
</div>
</body>
</html>
