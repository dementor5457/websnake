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
    <title>A sárkányharcos - Regisztráció</title>

    <link rel="icon" type="image/ico" href="favicon.ico">
    <link href="css/game.css" rel="stylesheet" media="screen, print">

    <script type="text/javascript" src="js/utils.js"></script>
    <script type="text/javascript">
        window.addEventListener('load', function() {
            $("#reg_user").focus();
            $("#reg_form").addEventListener('submit', function(e) {
                e.preventDefault();

                if ($("#reg_psw").value != $("#reg_psw2").value) {
                    alert("A két jelszó nem egyezik!");
                    return;
                }

                $("#cover").style.display = "block";
                ajax({
                    method: "POST",
                    url: "php/backend.php",
                    postdata: urlString({
                        type: "register",
                        usr: $("#reg_user").value,
                        psw: $("#reg_psw").value,
                        email: $("#reg_email").value
                    }),
                    success: function(resp) {
                        if (resp.error)
                            alert(resp.data);
                        else {
                            alert("Sikeres regisztráció! Most átirányítunk a bejelentkezéshez.");
                            window.location.href = "login.php";
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
    <div id="menu-reg" class="window">
        <h1>Regisztráció</h1>
        <form id="reg_form" action="">
            <div class="menu-div">
                <label class="menu-label" for="reg_user">Felhasználónév:</label>
                <input type="text" id="reg_user">
            </div>
            <div class="menu-div">
                <label class="menu-label" for="reg_psw">Jelszó:</label>
                <input type="password" id="reg_psw">
            </div>
            <div class="menu-div">
                <label class="menu-label" for="reg_psw2">Jelszó mégegyszer:</label>
                <input type="password" id="reg_psw2">
            </div>
            <div class="menu-div">
                <label class="menu-label" for="reg_email">E-mail cím:</label>
                <input type="text" id="reg_email">
            </div>
            <br>
            <input type="submit" class="btn" value="Regisztráció">
            <input type="reset" class="btn" value="Alaphelyzet">
            <input type="button" class="btn" value="Vissza" onclick="history.go(-1)">
        </form>
    </div>
    <div id="cover"></div>
</div>
</body>
</html>
