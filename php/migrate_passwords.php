<?php
require_once 'config.php';

if (php_sapi_name() !== 'cli') {
    die('This script can only be run from the command line');
}

if (!file_exists(XML_FILE)) {
    echo "Error: Users database not found at " . XML_FILE . "\n";
    exit(1);
}

try {
    $xml = loadXML(XML_FILE);
    if (!$xml) {
        die("Failed to load XML database\n");
    }

    $migrated = 0;
    $failed = 0;

    foreach ($xml->user as $user) {
        $userId = (string)$user->id;
        $username = (string)$user->username;
        
        if (isset($user->password_hash) && !empty((string)$user->password_hash)) {
            $passwordHash = (string)$user->password_hash;
            
            if (strpos($passwordHash, '$2y$') === 0) {
                echo "[SKIP] User '$username': Already bcrypt hashed\n";
                continue;
            }
        }

        $plainPassword = (string)$user->password ?? '';
        
        if (empty($plainPassword)) {
            echo "[ERROR] User '$username': No password found\n";
            $failed++;
            continue;
        }

        $hashed = hashPassword($plainPassword);
        $user->password_hash = $hashed;
        
        if (isset($user->password)) {
            unset($user->password);
        }

        $migrated++;
        echo "[MIGRATED] User '$username' ($userId)\n";
    }

    if ($migrated > 0) {
        if (saveXML($xml, XML_FILE)) {
            echo "\n✓ Migration complete!\n";
            echo "  Migrated: $migrated users\n";
            echo "  Failed: $failed users\n";
            exit(0);
        } else {
            echo "\n✗ Failed to save database\n";
            exit(1);
        }
    } else {
        echo "\nNo users needed migration\n";
        exit(0);
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
