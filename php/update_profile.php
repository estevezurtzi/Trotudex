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
$username = trim($data['username'] ?? '');
$email = trim($data['email'] ?? '');
$avatar = $data['avatar'] ?? '';
$newPassword = $data['new_password'] ?? '';
$currentPassword = $data['current_password'] ?? '';

if (empty($username) || empty($email)) {
    sendError('Username and email are required', 400);
}

if (!validateUsername($username)) {
    sendError('Invalid username format', 400);
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

    $users = $xml->xpath("//user[id='" . addslashes($userId) . "']");
    
    if (empty($users)) {
        sendError('User not found', 404);
    }

    $user = $users[0];

    if ($username !== (string)$user->username) {
        $existingUser = $xml->xpath("//user[username='" . addslashes($username) . "']");
        if (!empty($existingUser)) {
            sendError('Username already exists', 409);
        }
    }

    if ($email !== (string)$user->email) {
        $existingEmail = $xml->xpath("//user[email='" . addslashes($email) . "']");
        if (!empty($existingEmail)) {
            sendError('Email already registered', 409);
        }
    }

    if (!empty($newPassword)) {
        if (empty($currentPassword)) {
            sendError('Current password required to change password', 400);
        }

        $passwordHash = (string)$user->password_hash ?? (string)$user->password;
        if (!verifyPassword($currentPassword, $passwordHash)) {
            sendError('Current password is incorrect', 401);
        }

        if (!validatePassword($newPassword)) {
            sendError("Password must be between " . MIN_PASSWORD_LENGTH . " and " . MAX_PASSWORD_LENGTH . " characters", 400);
        }

        $user->password_hash = hashPassword($newPassword);
    }

    if (!empty($avatar)) {
        if (strlen($avatar) <= MAX_AVATAR_LENGTH && strpos($avatar, 'data:image/') === 0) {
            $user->avatar = $avatar;
        } else {
            $user->avatar = generateAvatar($username);
        }
    }

    $user->username = $username;
    $user->email = $email;

    if (saveXML($xml, XML_FILE)) {
        $_SESSION['username'] = $username;
        logActivity($userId, 'profile_updated', "Username: $username, Email: $email");
        sendSuccess([], 'Profile updated successfully');
    } else {
        sendError('Failed to update profile', 500);
    }
    
} catch (Exception $e) {
    error_log('Update profile error: ' . $e->getMessage());
    sendError('Server error', 500);
}
