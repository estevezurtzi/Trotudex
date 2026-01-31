<?php
require_once 'config.php';

$testUser = 'ash';
$testPassword = 'pikachu123';

echo "Testing login for: $testUser / $testPassword\n\n";

// Load XML
$xml = loadXML(XML_FILE);
if (!$xml) {
    echo "ERROR: Could not load XML\n";
    exit;
}

// Find user
$users = $xml->xpath("//user[username='" . addslashes($testUser) . "']");
if (empty($users)) {
    echo "ERROR: User '$testUser' not found\n";
    exit;
}

echo "✓ User '$testUser' found\n\n";

$user = $users[0];
$storedPasswordHash = trim((string)$user->password_hash);
$storedPassword = trim((string)$user->password);
$passwordHash = !empty($storedPasswordHash) ? $storedPasswordHash : $storedPassword;

echo "Password field check:\n";
echo "  has password_hash: " . (!empty($storedPasswordHash) ? 'yes' : 'no') . "\n";
echo "  has password: " . (!empty($storedPassword) ? 'yes' : 'no') . "\n";
echo "  password_hash value: '$storedPasswordHash'\n";
echo "  password value: '$storedPassword'\n\n";

echo "Using password: '$passwordHash'\n\n";

echo "Password lengths:\n";
echo "  Received: " . strlen($testPassword) . " chars\n";
echo "  Stored:   " . strlen($passwordHash) . " chars\n\n";

echo "Hex comparison:\n";
echo "  Received: " . bin2hex($testPassword) . "\n";
echo "  Stored:   " . bin2hex($passwordHash) . "\n\n";

echo "Direct comparison:\n";
$result = ($testPassword === $passwordHash);
echo "  '$testPassword' === '$passwordHash': " . ($result ? "TRUE" : "FALSE") . "\n\n";

if (password_needs_rehash($passwordHash, PASSWORD_BCRYPT)) {
    echo "Password needs rehash: YES (plaintext password)\n";
} else {
    echo "Password needs rehash: NO (already hashed)\n";
}
?>
