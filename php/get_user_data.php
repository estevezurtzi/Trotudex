<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

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

    $users = $xml->xpath("//user[id='" . addslashes($userId) . "']");
    
    if (empty($users)) {
        sendError('User not found', 404);
    }

    $user = $users[0];
    $userData = [
        'id' => (string)$user->id,
        'username' => (string)$user->username,
        'email' => (string)$user->email,
        'avatar' => (string)$user->avatar,
        'favorites' => !empty((string)$user->favorites) ? 
                      array_filter(explode(',', (string)$user->favorites)) : [],
        'captured' => !empty((string)$user->captured) ? 
                     array_filter(explode(',', (string)$user->captured)) : []
    ];

    sendSuccess($userData, 'User data retrieved');
    
} catch (Exception $e) {
    error_log('Get user data error: ' . $e->getMessage());
    sendError('Server error', 500);
}
