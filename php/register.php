<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if ($data === null) {
    sendError('Invalid JSON data', 400);
}

$username = trim($data['username'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$confirmPassword = $data['confirm_password'] ?? '';

if (empty($username) || empty($email) || empty($password)) {
    sendError('All fields are required', 400);
}

if ($password !== $confirmPassword) {
    sendError('Passwords do not match', 400);
}

if (!validateUsername($username)) {
    sendError('Username must be 3-20 characters with only letters, numbers, hyphens and underscores', 400);
}

if (!validatePassword($password)) {
    sendError("Password must be between " . MIN_PASSWORD_LENGTH . " and " . MAX_PASSWORD_LENGTH . " characters", 400);
}

if (!validateEmail($email)) {
    sendError('Invalid email format', 400);
}

if (!initializeXML(XML_FILE)) {
    sendError('Database initialization failed', 500);
}

try {
    $xml = loadXML(XML_FILE);
    if (!$xml) {
        sendError('Failed to load database', 500);
    }

    $existingUser = $xml->xpath("//user[username='" . addslashes($username) . "']");
    if (!empty($existingUser)) {
        sendError('Username already exists', 409);
    }

    $existingEmail = $xml->xpath("//user[email='" . addslashes($email) . "']");
    if (!empty($existingEmail)) {
        sendError('Email already registered', 409);
    }

    $user = $xml->addChild('user');
    $user->addChild('id', bin2hex(random_bytes(6)));
    $user->addChild('username', $username);
    $user->addChild('email', $email);
    $user->addChild('password_hash', hashPassword($password));
    $user->addChild('avatar', generateAvatar($username));
    $user->addChild('favorites', '');
    $user->addChild('captured', '');
    $user->addChild('created_at', date('c'));

    if (saveXML($xml, XML_FILE)) {
        logActivity((string)$user->id, 'registration', "Username: $username");
        sendSuccess([], 'User registered successfully');
    } else {
        sendError('Failed to save user', 500);
    }
    
} catch (Exception $e) {
    error_log('Registration error: ' . $e->getMessage());
    sendError('Server error', 500);
}
