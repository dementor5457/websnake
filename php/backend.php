<?php
/*
* Webfejlesztés 2. (ELTE-IK)
* Második beadandó feladat (PHP)
* A sárkányharcos: snake-szerű interaktív webes játék, kiegészítve szerver-oldali funkciókkal
* Feladatleírás: http://webprogramozas.inf.elte.hu/webfejl2/gyak/php_sarkany.html
*
* Készítette: Keszei Ábel
* Utolsó módosítás: 2016. 05. 15.
*/

define("TOKEN", 1);
include_once "utils.php";

if (!isset($_REQUEST["type"]))
    sendResponse([
        "error" => true,
        "data" => "Helytelen paraméterlista: ismeretlen kérés."
    ]);
else
    $type = $_REQUEST["type"];

try {
    $db = new PDO("sqlite:db/B5uUH8bLDv.sqlite3");
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $resp = [
        "error" => false,
        "data" => ""
    ];

    switch ($type) {
        case "register":
            $vars = requestVars("usr", "psw", "email");

            if (trim($vars["usr"]) == "" || trim($vars["psw"]) == "" || trim($vars["email"]) == "") {
                $resp["error"] = true;
                $resp["data"] = "Minden mező kitöltése kötelező.";
                break;
            } else if (!filter_var($vars["email"], FILTER_VALIDATE_EMAIL)) {
                $resp["error"] = true;
                $resp["data"] = "Érvénytelen formátumú e-mail cím.";
                break;
            } else if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/', $vars["psw"])) {
                $resp["error"] = true;
                $resp["data"] = "Érvénytelen jelszó: legalább 6 hosszú jelszó kell, benne nagy- és kisbetű, és szám is szerepeljen.";
                break;
            } else if (strlen($vars["usr"]) < 3) {
                $resp["error"] = true;
                $resp["data"] = "Érvénytelen felhasználónév: legalább 3 hosszúságú név kell.";
                break;
            }

            $psw_opt = ["salt" => uniqid(mt_rand(), true), "cost" => 12];
            $psw_hash = password_hash($vars["psw"], PASSWORD_BCRYPT, $psw_opt);

            $stmt = $db->prepare("INSERT INTO users (username, pass_hash, email) VALUES (:u, :p, :e)");
            $stmt->execute([
                ":u" => $vars["usr"],
                ":p" => $psw_hash,
                ":e" => $vars["email"]
            ]);
            break;

        case "login":
            $vars = requestVars("email", "psw");

            if (trim($vars["email"]) == "" || trim($vars["psw"]) == "") {
                $resp["error"] = true;
                $resp["data"] = "Minden mező kitöltése kötelező.";
                break;
            } else if (!filter_var($vars["email"], FILTER_VALIDATE_EMAIL)) {
                $resp["error"] = true;
                $resp["data"] = "Érvénytelen formátumú e-mail cím.";
                break;
            }

            $stmt = $db->prepare("SELECT id, username, pass_hash FROM users WHERE email = :e");
            $stmt->execute([
                ":e" => $vars["email"]
            ]);

            $res = $stmt->fetch(PDO::FETCH_OBJ);
            if (!isset($res->pass_hash) || !password_verify($vars["psw"], $res->pass_hash)) {
                $resp["error"] = true;
                $resp["data"] = "Helytelen felhasználónév-jelszó páros.";
                break;
            }

            session_start();
            $_SESSION["user"] = [
                "uid" => $res->id,
                "username" => $res->username,
                "email" => $vars["email"]
            ];
            break;

        case "logout":
            session_start();
            session_destroy();
            break;

        case "courses":
            session_start();

            if (!isset($_SESSION["user"])) {
                $resp["error"] = true;
                $resp["data"] = "Ez a funkció csak bejelentkezés után elérhető!";
                break;
            }

            $stmt = $db->prepare("SELECT * FROM courses");
            $stmt->execute();

            $stmt2 = $db->prepare("SELECT max(score) FROM scores WHERE course_id = :c");
            $stmt3 = $db->prepare("SELECT username FROM users WHERE id = (SELECT user_id FROM scores WHERE course_id = :c AND score = :s LIMIT 1)");
            $stmt4 = $db->prepare("SELECT score FROM scores WHERE user_id = :u AND course_id = :c");
            
            $data = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $rec = $row;

                $stmt2->execute([ ":c" => $row["id"] ]);
                $maxval = $stmt2->fetchColumn(0);

                if ($maxval != null) {
                    $stmt3->execute([
                        ":c" => $row["id"],
                        ":s" => $maxval
                    ]);
                    $maxname = $stmt3->fetchColumn(0);
                } else {
                    $maxval = -1;
                    $maxname = "";
                }

                $rec["maxval"] = $maxval;
                $rec["maxname"] = $maxname;

                $stmt4->execute([
                    ":c" => $row["id"],
                    ":u" => $_SESSION["user"]["uid"]
                ]);
                $usr_score = $stmt4->fetchColumn(0);

                if ($usr_score === false)
                    $usr_score = -1;

                $rec["usr_score"] = $usr_score;

                $data[] = $rec;
            }

            $resp["data"] = $data;
            break;

        case "score":
            session_start();

            if (!isset($_SESSION["user"])) {
                $resp["error"] = true;
                $resp["data"] = "Ez a funkció csak bejelentkezés után elérhető!";
                break;
            }

            $vars = requestVars("course", "score");
            
            $stmt = $db->prepare("SELECT score FROM scores WHERE user_id = :u AND course_id = :c");
            $stmt->execute([
                ":u" => $_SESSION["user"]["uid"],
                ":c" => $vars["course"]
            ]);
            $score = $stmt->fetchColumn(0);

            if ($score !== false) {
                if ($score < $vars["score"]) {
                    $stmt2 = $db->prepare("UPDATE scores SET score = :s WHERE user_id = :u AND course_id = :c");
                    $stmt2->execute([
                        ":s" => $vars["score"],
                        ":u" => $_SESSION["user"]["uid"],
                        ":c" => $vars["course"]
                    ]);
                }
            } else {
                $stmt3 = $db->prepare("INSERT INTO scores (user_id, course_id, score) VALUES (:u, :c, :s)");
                $stmt3->execute([
                    ":u" => $_SESSION["user"]["uid"],
                    ":c" => $vars["course"],
                    ":s" => $vars["score"]
                ]);
            }

            $stmt4 = $db->prepare(
                "SELECT u.username username, s.score score FROM scores s INNER JOIN users u ON u.id = s.user_id " .
                "WHERE s.course_id = :c ORDER BY s.score DESC LIMIT 10"
            );
            $stmt4->execute([
                ":c" => $vars["course"]
            ]);

            $data = [];
            while ($row = $stmt4->fetch(PDO::FETCH_ASSOC))
                $data[] = $row;

            $resp["data"] = $data;
            break;
        
        case "addcourse":
            session_start();

            if (!isset($_SESSION["user"])) {
                $resp["error"] = true;
                $resp["data"] = "Ez a funkció csak bejelentkezés után elérhető!";
                break;
            } else if ($_SESSION["user"]["username"] != 'admin') {
                $resp["error"] = true;
                $resp["data"] = "Ez a funkció csak az admin számára elérhető!";
                break;
            }

            $vars = requestVars("name", "width", "height", "obj");

            if (strlen(trim($vars["name"])) == 0) {
                $resp["error"] = true;
                $resp["data"] = "Meg kell adni egy pályanevet!";
                break;
            } else if (!ctype_digit($vars["width"]) || !ctype_digit($vars["height"]) || !ctype_digit($vars["obj"])) {
                $resp["error"] = true;
                $resp["data"] = "A pálya mérete, illetve az akadályok száma csak egész szám lehet!";
                break;
            } else if ($vars["width"] < 10 || $vars["width"] > 30 || $vars["height"] < 10 || $vars["height"] > 30) {
                $resp["error"] = true;
                $resp["data"] = "A pálya méretének 10×10 és 30×30 közé kell esnie!";
                break;
            }

            $stmt = $db->prepare("INSERT INTO courses (name, width, height, objects) VALUES (:n, :w, :h, :o)");
            $stmt->execute([
                ":n" => $vars["name"],
                ":w" => $vars["width"],
                ":h" => $vars["height"],
                ":o" => $vars["obj"],
            ]);
            break;
        
        default:
            $resp["error"] = true;
            $resp["data"] = "Nincs ilyen kéréstípus.";
            break;
    }

    $db = null;
    sendResponse($resp);
} catch (PDOException $e) {
    $info = $e->errorInfo;
    if ($type == "register" && $info[1] == SQLITE_CONSTRAINT)
        if (strpos($info[2], "users.username") !== false)
            sendResponse([
                "error" => true,
                "data" => "A megadott felhasználói név már foglalt."
            ]);
        else
            sendResponse([
                "error" => true,
                "data" => "A megadott e-mail cím már foglalt."
            ]);
    else if ($type == "addcourse" && $info[1] == SQLITE_CONSTRAINT)
        if (strpos($info[2], "courses.name") !== false)
            sendResponse([
                "error" => true,
                "data" => "Már létezik ilyen nevű pálya."
            ]);
        else
            sendResponse([
                "error" => true,
                "data" => "Már létezik pálya ilyen paraméterekkel."
            ]);
    else
        sendResponse([
            "error" => true,
            "data" => "Adatbázis-hiba történt."
        ]);
}
?>