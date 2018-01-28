<?php
/*
* Webfejlesztés 2. (ELTE-IK)
* Második beadandó feladat (PHP)
* util.php - segédfüggvények a backendhez
*
* Készítette: Keszei Ábel
* Utolsó módosítás: 2016. 05. 15.
*/

if (!defined("TOKEN"))
    die();

function sendResponse($data) {
    header("Content-type: application/json; charset=utf-8");
    echo json_encode($data);
    exit();
}

function requestVars(...$vars) {
    $def = [];
    $undef = [];

    foreach ($vars as $var) {
        if (!isset($_REQUEST[$var]))
            $undef[] = $var;
        else
            $def[$var] = $_REQUEST[$var];
    }

    if (!empty($undef))
        sendResponse([
            "error" => true,
            "data" => "Helytelen paraméterlista: nem definiált változók (" . implode($undef, ", ") . ")."
        ]);

    return $def;
}

define("SQLITE_OK", 0);           // Successful result
define("SQLITE_ERROR", 1);        // SQL error or missing database
define("SQLITE_INTERNAL", 2);     // An internal logic error in SQLite
define("SQLITE_PERM", 3);         // Access permission denied
define("SQLITE_ABORT", 4);        // Callback routine requested an abort
define("SQLITE_BUSY", 5);         // The database file is locked
define("SQLITE_LOCKED", 6);       // A table in the database is locked
define("SQLITE_NOMEM", 7);        // A malloc() failed
define("SQLITE_READONLY", 8);     // Attempt to write a readonly database
define("SQLITE_INTERRUPT", 9);    // Operation terminated by sqlite_interrupt()
define("SQLITE_IOERR", 10);       // Some kind of disk I/O error occurred
define("SQLITE_CORRUPT", 11);     // The database disk image is malformed
define("SQLITE_NOTFOUND", 12);    // (Internal Only) Table or record not found
define("SQLITE_FULL", 13);        // Insertion failed because database is full
define("SQLITE_CANTOPEN", 14);    // Unable to open the database file
define("SQLITE_PROTOCOL", 15);    // Database lock protocol error
define("SQLITE_EMPTY", 16);       // (Internal Only) Database table is empty
define("SQLITE_SCHEMA", 17);      // The database schema changed
define("SQLITE_TOOBIG", 18);      // Too much data for one row of a table
define("SQLITE_CONSTRAINT", 19);  // Abort due to contraint violation
define("SQLITE_MISMATCH", 20);    // Data type mismatch
define("SQLITE_MISUSE", 21);      // Library used incorrectly
define("SQLITE_NOLFS", 22);       // Uses OS features not supported on host
define("SQLITE_AUTH", 23);        // Authorization denied
define("SQLITE_ROW", 100);        // sqlite_step() has another row ready
define("SQLITE_DONE", 101);       // sqlite_step() has finished executing

?>