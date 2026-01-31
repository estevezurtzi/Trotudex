<?php
require_once 'config.php';

session_start();

if (isset($_SESSION['user_id'])) {
    $userId = $_SESSION['user_id'];
    logActivity($userId, 'logout');
}

session_destroy();

sendSuccess([], 'Logged out successfully');
