<?php
require_once 'config.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    sendError('Unauthorized', 401);
}

$userId = $_SESSION['user_id'];

if (!initializeXML(XML_FILE)) {
    sendError('Database initialization failed', 500);
}

try {
    $xml = loadXML(XML_FILE);
    if (!$xml) {
        sendError('Failed to load database', 500);
    }

    $cleaned = 0;

    foreach ($xml->user as $user) {
        $avatar = (string)$user->avatar;
        $username = (string)$user->username;
        
        if (strlen($avatar) > MAX_AVATAR_LENGTH || strpos($avatar, 'data:image/') === false) {
            $user->avatar = generateAvatar($username);
            $cleaned++;
        }

        if (!isset($user->password_hash) && isset($user->password)) {
            $user->password_hash = $user->password;
            unset($user->password);
            $cleaned++;
        }
    }

    if (saveXML($xml, XML_FILE)) {
        logActivity($userId, 'database_cleanup', "Cleaned $cleaned records");
        sendSuccess(['cleaned' => $cleaned], 'Database cleaned successfully');
    } else {
        sendError('Failed to save database', 500);
    }
    
} catch (Exception $e) {
    error_log('Clean XML error: ' . $e->getMessage());
    sendError('Server error', 500);
}
