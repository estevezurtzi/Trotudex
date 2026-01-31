<?php
define('PROJECT_ROOT', realpath(dirname(__DIR__)));
define('DATA_DIR', PROJECT_ROOT . '/data');
define('XML_FILE', DATA_DIR . '/users.xml');

define('MAX_USERNAME_LENGTH', 20);
define('MIN_USERNAME_LENGTH', 3);
define('MAX_EMAIL_LENGTH', 255);
define('MIN_PASSWORD_LENGTH', 6);
define('MAX_PASSWORD_LENGTH', 50);
define('MAX_AVATAR_LENGTH', 5000);

define('ALLOWED_ORIGINS', [
    'http://localhost',
    'http://localhost:80',
    'http://localhost:8080',
    'http://127.0.0.1',
    'http://127.0.0.1:80',
    'http://127.0.0.1:8080'
]);
define('SESSION_TIMEOUT', 3600);
define('LOG_DIR', PROJECT_ROOT . '/logs');

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', LOG_DIR . '/php_errors.log');

if (!file_exists(LOG_DIR)) {
    @mkdir(LOG_DIR, 0755, true);
}

if (!file_exists(DATA_DIR)) {
    @mkdir(DATA_DIR, 0755, true);
}

function setSecurityHeaders() {
    header('Content-Type: application/json');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, ALLOWED_ORIGINS, true)) {
        header("Access-Control-Allow-Origin: $origin");
    }
    
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE, PUT');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    header('Access-Control-Max-Age: 3600');
    header('Access-Control-Allow-Credentials: true');
}

function handlePreflight() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        setSecurityHeaders();
        http_response_code(204);
        exit(0);
    }
}

function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

function sendSuccess($data = [], $message = 'Success') {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => $message, 'data' => $data]);
    exit;
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) && strlen($email) <= MAX_EMAIL_LENGTH;
}

function validateUsername($username) {
    if (strlen($username) < MIN_USERNAME_LENGTH || strlen($username) > MAX_USERNAME_LENGTH) {
        return false;
    }
    return preg_match('/^[a-zA-Z0-9_-]+$/', $username) === 1;
}

function validatePassword($password) {
    return strlen($password) >= MIN_PASSWORD_LENGTH && strlen($password) <= MAX_PASSWORD_LENGTH;
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function generateAvatar($username) {
    $colors = ['#e3350d', '#30a7d7', '#f7d02c', '#78C850', '#A040A0', '#F85888'];
    $color = $colors[strlen($username) % count($colors)];
    $initial = strtoupper(substr($username, 0, 1));
    
    $svg = sprintf(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%s"/><text x="50" y="60" font-family="Arial" font-size="40" text-anchor="middle" fill="white">%s</text></svg>',
        htmlspecialchars($color, ENT_QUOTES, 'UTF-8'),
        htmlspecialchars($initial, ENT_QUOTES, 'UTF-8')
    );
    
    return 'data:image/svg+xml;base64,' . base64_encode($svg);
}

function initializeXML($filePath) {
    if (!file_exists($filePath)) {
        $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><users></users>');
        if (!$xml->asXML($filePath)) {
            return false;
        }
        chmod($filePath, 0644);
    }
    return true;
}

function loadXML($filePath) {
    if (!file_exists($filePath)) {
        return false;
    }
    
    $xml = simplexml_load_file($filePath);
    if ($xml === false) {
        error_log('Failed to load XML: ' . $filePath);
        return false;
    }
    return $xml;
}

function saveXML($xml, $filePath) {
    $dom = new DOMDocument('1.0', 'UTF-8');
    $dom->preserveWhiteSpace = false;
    $dom->formatOutput = true;
    
    if (!$dom->loadXML($xml->asXML())) {
        error_log('Failed to parse XML for saving');
        return false;
    }
    
    if (!$dom->save($filePath)) {
        error_log('Failed to save XML: ' . $filePath);
        return false;
    }
    
    return true;
}

function logActivity($userId, $action, $details = '') {
    $logFile = LOG_DIR . '/activity.log';
    $timestamp = date('Y-m-d H:i:s');
    $message = "[$timestamp] User: $userId | Action: $action | Details: $details | IP: {$_SERVER['REMOTE_ADDR']}\n";
    @file_put_contents($logFile, $message, FILE_APPEND);
}

session_set_cookie_params([
    'lifetime' => SESSION_TIMEOUT,
    'path' => '/',
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
    'httponly' => true,
    'samesite' => 'Strict'
]);

setSecurityHeaders();
handlePreflight();
