<?php
require_once 'config.php';

$testPassword = "pikachu123";

echo "Testing password_needs_rehash:\n";
echo "Input: '$testPassword'\n";
echo "password_needs_rehash result: " . (password_needs_rehash($testPassword, PASSWORD_BCRYPT) ? "true" : "false") . "\n";
echo "\n";

echo "Testing direct comparison:\n";
$result = ($testPassword === $testPassword);
echo "('$testPassword' === '$testPassword'): " . ($result ? "true" : "false") . "\n";
echo "\n";

// Load XML and check user password
$xml = loadXML(XML_FILE);
if ($xml) {
    $users = $xml->xpath("//user[username='ash']");
    if (!empty($users)) {
        $user = $users[0];
        $storedPassword = (string)$user->password;
        echo "Stored password from XML: '$storedPassword'\n";
        echo "Stored password length: " . strlen($storedPassword) . "\n";
        echo "Stored password bytes: " . bin2hex($storedPassword) . "\n";
        echo "Test password bytes: " . bin2hex($testPassword) . "\n";
        echo "Are they identical? " . ($storedPassword === $testPassword ? "YES" : "NO") . "\n";
    }
}
?>
