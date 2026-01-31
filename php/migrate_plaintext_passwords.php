<?php
header('Content-Type: application/json');
require_once 'config.php';

try {
    $xml = loadXML(XML_FILE);
    if (!$xml) {
        die(json_encode(['error' => 'Failed to load database']));
    }
    
    $users = $xml->xpath('//user');
    $updated = 0;
    
    foreach ($users as $user) {
        $hasPasswordHash = !empty((string)$user->password_hash);
        $hasPassword = !empty((string)$user->password);
        
        if ($hasPassword && !$hasPasswordHash) {
            $plainPassword = (string)$user->password;
            $user->password_hash = hashPassword($plainPassword);
            unset($user->password);
            $updated++;
            echo "Migrated user: " . (string)$user->username . "\n";
        }
    }
    
    if ($updated > 0) {
        saveXML($xml, XML_FILE);
        echo json_encode([
            'success' => true,
            'message' => "Migrated $updated users from plaintext to bcrypt",
            'updated' => $updated
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'No plaintext passwords found to migrate',
            'updated' => 0
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
?>
