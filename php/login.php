<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

session_start();

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if ($data === null) {
    sendError('Invalid JSON data', 400);
}

$username = trim($data['username'] ?? '');
$password = trim($data['password'] ?? '');

if (empty($username) || empty($password)) {
    sendError('Username and password are required', 400);
}

if (!validateUsername($username)) {
    sendError('Invalid username format', 400);
}

if (!initializeXML(XML_FILE)) {
    sendError('Database initialization failed', 500);
}

try {
    $xml = loadXML(XML_FILE);
    if (!$xml) {
        sendError('Failed to load database', 500);
    }

    $users = $xml->xpath("//user[username='" . addslashes($username) . "']");
    
    if (empty($users)) {
        error_log("Login attempt: User not found - $username");
        logActivity($username, 'login_failed', 'User not found');
        sendError('Invalid username or password', 401);
    }

    $user = $users[0];
    $storedPasswordHash = trim((string)($user->password_hash ?? ''));
    $storedPassword = trim((string)($user->password ?? ''));
    
    $debug = [
        'user_found' => true,
        'has_password_hash' => !empty($storedPasswordHash),
        'has_password' => !empty($storedPassword)
    ];
    
    $passwordValid = false;
    
    if (!empty($storedPasswordHash)) {
        $passwordValid = verifyPassword($password, $storedPasswordHash);
        $debug['method'] = 'bcrypt_hash';
    } elseif (!empty($storedPassword)) {
        $passwordValid = ($password === $storedPassword);
        $debug['method'] = 'plaintext';
    } else {
        $debug['method'] = 'no_password_found';
        $passwordValid = false;
    }
    
    $debug['result'] = $passwordValid;
    
    if (!$passwordValid) {
        logActivity($username, 'login_failed', 'Wrong password');
        sendError('Invalid username or password', 401);
    }
    
    if ($debug['method'] === 'plaintext') {
        $user->password_hash = hashPassword($password);
        unset($user->password);
        saveXML($xml, XML_FILE);
    }

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
    
    $_SESSION['user_id'] = $userData['id'];
    $_SESSION['username'] = $userData['username'];
    $_SESSION['created_at'] = time();
    
    logActivity($userData['id'], 'login_success');
    sendSuccess($userData, 'Login successful');
    
} catch (Exception $e) {
    error_log('Login error: ' . $e->getMessage());
    sendError('Server error', 500);
}
