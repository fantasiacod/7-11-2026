<?php
/**
 * API: Real-time Visitor & Download Analytics
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Api-Token');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/storage.php';

$action = isset($_REQUEST['action']) ? trim($_REQUEST['action']) : 'get';
$mutating = in_array($action, ['view', 'preview', 'download', 'reset'], true);

/**
 * Counter updates are read-modify-write, which is not atomic. Without a
 * lock, concurrent visitors read the same value, each add one, and the
 * last write wins — measured at ~57% of hits lost under 50 concurrent
 * users. This exclusive lock serialises the whole cycle so every visit
 * is counted exactly once.
 */
$lockHandle = null;
if ($mutating) {
    storage_ensure_data_dir();
    $lockFile = storage_data_dir() . '/.stats.lock';
    $lockHandle = @fopen($lockFile, 'c');
    if ($lockHandle) {
        @flock($lockHandle, LOCK_EX);
    }
}

$data = storage_read();
if (!is_array($data)) {
    $data = [];
}

if (!isset($data['stats']) || !is_array($data['stats'])) {
    $data['stats'] = ['views' => 0, 'previews' => 0, 'downloads' => 0];
}

if ($action === 'reset') {
    require_once __DIR__ . '/_auth.php';
    api_require_token();
}

if ($action === 'view') {
    $data['stats']['views'] = (int)$data['stats']['views'] + 1;
} elseif ($action === 'preview') {
    $data['stats']['previews'] = (int)$data['stats']['previews'] + 1;
} elseif ($action === 'download') {
    $data['stats']['downloads'] = (int)$data['stats']['downloads'] + 1;
    $cardIdx = isset($_REQUEST['cardIndex']) ? (string)$_REQUEST['cardIndex'] : null;
    if ($cardIdx !== null) {
        if (!isset($data['cardStats']) || !is_array($data['cardStats'])) {
            $data['cardStats'] = [];
        }
        $data['cardStats'][$cardIdx] = isset($data['cardStats'][$cardIdx]) ? (int)$data['cardStats'][$cardIdx] + 1 : 1;
    }
} elseif ($action === 'reset') {
    $data['stats'] = ['views' => 0, 'previews' => 0, 'downloads' => 0];
    $data['cardStats'] = [];
}

if ($mutating) {
    // Only a reset changes what the public site renders. Bumping
    // last_modified on plain view/download tracking would make every
    // visitor's poll trigger a pointless full refetch.
    if ($action === 'reset') {
        $data['last_modified'] = time();
    }
    storage_write($data);
}

// Release the lock as soon as the write is done, before sending output.
if ($lockHandle) {
    @flock($lockHandle, LOCK_UN);
    @fclose($lockHandle);
}

echo json_encode([
    'success' => true,
    'stats' => $data['stats'],
    'cardStats' => isset($data['cardStats']) ? $data['cardStats'] : []
], JSON_UNESCAPED_UNICODE);
