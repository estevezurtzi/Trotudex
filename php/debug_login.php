<?php
header('Content-Type: application/json');
require_once 'config.php';

$response = [];

try {
    // Test 1: Load XML
    $response['xml_loaded'] = initializeXML(XML_FILE);
    
    // Test 2: Load and parse XML
    $xml = loadXML(XML_FILE);
    $response['xml_valid'] = ($xml !== false);
    
    if ($xml) {
        // Test 3: Find user
        $users = $xml->xpath("//user[username='ash']");
        $response['user_found'] = !empty($users);
        
        if (!empty($users)) {
            $user = $users[0];
            
            // Test 4: Get password
            $storedPasswordHash = trim((string)$user->password_hash);
            $storedPassword = trim((string)$user->password);
            $response['has_password_hash'] = !empty($storedPasswordHash);
            $response['has_password'] = !empty($storedPassword);
            $response['password_value'] = $storedPassword;
            $response['password_length'] = strlen($storedPassword);
            $response['password_hex'] = bin2hex($storedPassword);
            
            // Test 5: Test password comparison
            $testPassword = 'pikachu123';
            $response['test_password_length'] = strlen($testPassword);
            $response['test_password_hex'] = bin2hex($testPassword);
            $response['passwords_equal'] = ($testPassword === $storedPassword);
            $response['password_needs_rehash'] = password_needs_rehash($storedPassword, PASSWORD_BCRYPT);
            
            // Test 6: Test with actual password from user input
            $jsonInput = '{"username":"ash","password":"pikachu123"}';
            $data = json_decode($jsonInput, true);
            $receivedPassword = trim($data['password']);
            $response['received_from_json'] = $receivedPassword;
            $response['received_length'] = strlen($receivedPassword);
            $response['received_hex'] = bin2hex($receivedPassword);
            $response['json_password_equal'] = ($receivedPassword === $storedPassword);
        }
    }
    
    $response['success'] = true;
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
    $response['success'] = false;
}

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
