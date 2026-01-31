<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

session_start();

if (!isset($_SESSION['user_id'])) {
    sendError('Unauthorized', 401);
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if ($data === null) {
    sendError('Invalid JSON data', 400);
}

$userId = $_SESSION['user_id'];
$favorites = array_map('intval', array_filter($data['favorites'] ?? []));
$captured = array_map('intval', array_filter($data['captured'] ?? []));

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
    $user->favorites = implode(',', $favorites);
    $user->captured = implode(',', $captured);

    if (saveXML($xml, XML_FILE)) {
        logActivity($userId, 'pokemon_data_updated', 'Favorites: ' . count($favorites) . ', Captured: ' . count($captured));
        sendSuccess([], 'Data saved successfully');
    } else {
        sendError('Failed to save data', 500);
    }
    
} catch (Exception $e) {
    error_log('Save pokemon data error: ' . $e->getMessage());
    sendError('Server error', 500);
}
